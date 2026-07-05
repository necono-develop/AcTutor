import * as vscode from "vscode";
import { HistoryService } from "../services/historyService";
import { AtCoderProblemsClient } from "../services/atcoderProblemsClient";
import { OjService } from "../services/ojService";
import { ProblemStatementService } from "../services/problemStatementService";
import { createProblemWorkspace, inferProblemFromUrl, writeProblemJson, writeProblemMarkdown } from "../services/workspaceService";

export async function setupProblem(
  extensionUri: vscode.Uri,
  output: vscode.OutputChannel,
  historyService: HistoryService,
  atCoderProblemsClient: AtCoderProblemsClient,
  ojService: OjService,
  problemStatementService: ProblemStatementService
): Promise<vscode.Uri | undefined> {
  const url = await vscode.window.showInputBox({
    title: "AcTutor: Setup Problem",
    prompt: "AtCoder problem URL",
    placeHolder: "https://atcoder.jp/contests/abc000/tasks/abc000_a",
    ignoreFocusOut: true
  });
  if (!url) {
    return undefined;
  }

  return setupProblemFromUrl(url.trim(), extensionUri, output, historyService, atCoderProblemsClient, ojService, problemStatementService);
}

export async function setupProblemFromUrl(
  url: string,
  extensionUri: vscode.Uri,
  output: vscode.OutputChannel,
  historyService: HistoryService,
  atCoderProblemsClient: AtCoderProblemsClient,
  ojService: OjService,
  problemStatementService: ProblemStatementService
): Promise<vscode.Uri | undefined> {
  let problem = inferProblemFromUrl(url);

  try {
    output.appendLine(`[AcTutor] Fetching difficulty: ${problem.problemId}`);
    problem = await atCoderProblemsClient.enrichProblem(problem);
  } catch (error) {
    output.appendLine(`[AcTutor] Difficulty fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const workspace = await createProblemWorkspace(problem, extensionUri);
  await historyService.upsertStarted(problem);

  const hasOj = await ojService.checkInstalled();
  if (!hasOj) {
    vscode.window.showWarningMessage("oj was not found. Problem files were created, but samples were not downloaded.");
  } else {
    try {
      await ojService.downloadSamples(problem.url, workspace.root);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[AcTutor] ${message}`);
      vscode.window.showWarningMessage(`oj download failed: ${message}`);
    }
  }

  try {
    output.appendLine(`[AcTutor] Fetching problem statement: ${problem.url}`);
    const statementDocument = await problemStatementService.fetchStatement(problem);
    problem.title = statementDocument.title;
    await writeProblemMarkdown(workspace.root, statementDocument.markdown);
    await writeProblemJson(workspace.root, problem);
    await historyService.upsertStarted(problem);
    output.appendLine("[AcTutor] Saved problem.md");
  } catch (error) {
    output.appendLine(`[AcTutor] ${error instanceof Error ? error.message : String(error)}`);
    vscode.window.showWarningMessage("Problem statement download failed. problem.md contains a placeholder.");
  }

  const document = await vscode.workspace.openTextDocument(workspace.mainFile);
  await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false });
  const statement = await vscode.workspace.openTextDocument(workspace.problemMarkdownFile);
  await vscode.window.showTextDocument(statement, { viewColumn: vscode.ViewColumn.Beside, preview: true, preserveFocus: true });
  vscode.window.showInformationMessage(`AcTutor problem created: ${problem.problemId}`);
  return workspace.root;
}
