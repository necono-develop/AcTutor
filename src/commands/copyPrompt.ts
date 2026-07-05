import * as vscode from "vscode";
import { PromptMode, TestResult } from "../models/problem";
import { HistoryService } from "../services/historyService";
import { PromptService } from "../services/promptService";
import { getCurrentProblemDirectory, readProblemJson } from "../services/workspaceService";

export async function copyPrompt(
  mode: PromptMode,
  historyService: HistoryService,
  promptService: PromptService,
  lastResult?: TestResult
): Promise<void> {
  const problemDir = getCurrentProblemDirectory();
  if (!problemDir) {
    vscode.window.showWarningMessage("Open a file under an AcTutor problem directory first.");
    return;
  }

  const problem = await readProblemJson(problemDir);
  if (!problem) {
    vscode.window.showWarningMessage("problem.json was not found for the current problem.");
    return;
  }

  const scopedResult = lastResult?.problemId === problem.problemId ? lastResult : undefined;
  const prompt = await promptService.buildPrompt(problem, problemDir, mode, scopedResult);
  await vscode.env.clipboard.writeText(prompt);
  await historyService.incrementHint(problem, mode === "editorial");
  vscode.window.showInformationMessage(`AcTutor: ${formatPromptMode(mode)} prompt copied.`);
}

function formatPromptMode(mode: PromptMode): string {
  switch (mode) {
    case "wa_review":
      return "WA review";
    case "input_only":
      return "input-only";
    case "complexity":
      return "complexity";
    case "editorial":
      return "solution";
    case "hint":
    default:
      return "hint";
  }
}
