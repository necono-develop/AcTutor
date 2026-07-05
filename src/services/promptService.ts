import * as fs from "fs/promises";
import * as vscode from "vscode";
import { Problem, PromptMode, TestResult } from "../models/problem";
import { getSettings } from "../models/settings";
import { getLanguageProfile } from "./languageService";

export class PromptService {
  async buildPrompt(problem: Problem, problemDir: vscode.Uri, mode: PromptMode, lastResult?: TestResult): Promise<string> {
    const settings = getSettings();
    const language = getLanguageProfile(settings);
    const promptLanguage = resolvePromptLanguage(settings.promptLanguage, settings.statementLanguage);
    const code = await readOptional(vscode.Uri.joinPath(problemDir, language.solutionFileName));
    const notes = await readOptional(vscode.Uri.joinPath(problemDir, "notes.md"));
    const statement = await readOptional(vscode.Uri.joinPath(problemDir, "problem.md"));
    const problemJson = JSON.stringify(problem, null, 2);
    const context = promptLanguage === "en"
      ? `Problem statement:\n${statement || "(problem.md does not exist)"}\n\nProblem metadata:\n${problemJson}\n\nNotes:\n${notes || "(notes.md is empty)"}`
      : `問題文:\n${statement || "(problem.md がありません)"}\n\n問題情報:\n${problemJson}\n\nメモ:\n${notes || "(notes.md は空です)"}`;
    const testOutput = lastResult?.rawOutput ? sanitizeLocalPaths(lastResult.rawOutput, problemDir) : noTestResult(promptLanguage);

    return promptLanguage === "en"
      ? buildEnglishPrompt(mode, context, code, testOutput)
      : buildJapanesePrompt(mode, context, code, testOutput);
  }
}

function buildJapanesePrompt(mode: PromptMode, context: string, code: string, testOutput: string): string {
  switch (mode) {
    case "input_only":
      return `AtCoderの練習中です。\n解答方針やコードは出さず、入力形式の読み方だけ説明してください。\n\n${context}`;
    case "wa_review":
      return `AtCoderの練習中です。\n以下のコードがサンプルまたは提出でWAになります。\n解答コードは出さず、原因候補と確認方法だけ教えてください。\n\n制約:\n- 修正版コードは禁止\n- 原因候補は最大3つ\n- 最初に見るべき行を指摘する\n- 追加で試すべき小さい入力例を1つ作る\n\n${context}\n\n私のコード:\n${code}\n\nテスト結果:\n${testOutput}`;
    case "complexity":
      return `AtCoderの練習中です。\n以下のコードの計算量を見積もってください。\n解答コードや別解は出さないでください。\n\n${context}\n\n私のコード:\n${code}`;
    case "editorial":
      return `AtCoderの復習中です。\nこの問題の解法を初心者向けに説明してください。\n\n含めてほしい内容:\n- 何を観察すればよかったか\n- 入力をどう読むか\n- 方針\n- 計算量\n- Python実装例\n- 間違いやすい点\n\n${context}`;
    case "hint":
    default:
      return `AtCoderの練習中です。\n解答コードは出さず、方針だけを段階的に教えてください。\n\n制約:\n- 直接のコードは禁止\n- まず観察すべき条件を3つだけ挙げる\n- 次に使うべき考え方を1つだけ示す\n- 計算量の目安を説明する\n\n${context}\n\n私のコード:\n${code}`;
  }
}

function buildEnglishPrompt(mode: PromptMode, context: string, code: string, testOutput: string): string {
  switch (mode) {
    case "input_only":
      return `I am practicing competitive programming.\nDo not give the solution strategy or code. Explain only how to read the input format.\n\n${context}`;
    case "wa_review":
      return `I am practicing competitive programming.\nThe following code gets WA or fails samples.\nDo not provide corrected code. Give only likely causes and how to check them.\n\nConstraints:\n- Do not provide fixed code\n- List at most 3 likely causes\n- Point out the first line I should inspect\n- Create one small additional test case to try\n\n${context}\n\nMy code:\n${code}\n\nTest result:\n${testOutput}`;
    case "complexity":
      return `I am practicing competitive programming.\nEstimate the time complexity of the following code.\nDo not provide solution code or alternative solutions.\n\n${context}\n\nMy code:\n${code}`;
    case "editorial":
      return `I am reviewing this problem.\nExplain the solution for a beginner.\n\nPlease include:\n- What observations mattered\n- How to read the input\n- Strategy\n- Complexity\n- Python implementation example\n- Common pitfalls\n\n${context}`;
    case "hint":
    default:
      return `I am practicing competitive programming.\nDo not provide solution code. Give only step-by-step strategic hints.\n\nConstraints:\n- Direct code is forbidden\n- First list exactly 3 observations to make\n- Then show only one useful idea\n- Explain the expected complexity\n\n${context}\n\nMy code:\n${code}`;
  }
}

async function readOptional(uri: vscode.Uri): Promise<string> {
  try {
    return await fs.readFile(uri.fsPath, "utf8");
  } catch {
    return "";
  }
}

function resolvePromptLanguage(promptLanguage: "ja" | "en" | "auto", statementLanguage: "ja" | "en" | "auto"): "ja" | "en" {
  if (promptLanguage !== "auto") {
    return promptLanguage;
  }
  return statementLanguage === "en" ? "en" : "ja";
}

function noTestResult(language: "ja" | "en"): string {
  return language === "en" ? "(No test result yet)" : "(まだテスト結果がありません)";
}

function sanitizeLocalPaths(value: string, problemDir: vscode.Uri): string {
  const knownPaths = [
    problemDir.fsPath,
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  ].filter((path): path is string => Boolean(path));

  let sanitized = value;
  for (const localPath of knownPaths) {
    sanitized = sanitized.replace(new RegExp(escapeRegExp(localPath), "g"), "<local-path>");
  }

  return sanitized
    .replace(/(^|[\s(["'])\/(?:Users|home|var|tmp|private|Volumes)\/[^\s)"']+/g, "$1<local-path>")
    .replace(/(^|[\s(["'])[A-Za-z]:\\[^\s)"']+/g, "$1<local-path>");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
