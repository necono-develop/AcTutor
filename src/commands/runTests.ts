import * as path from "path";
import * as vscode from "vscode";
import { HistoryService } from "../services/historyService";
import { OjService } from "../services/ojService";
import { getCurrentProblemDirectory, readProblemJson } from "../services/workspaceService";
import { TestResult } from "../models/problem";

export async function runTests(
  output: vscode.OutputChannel,
  historyService: HistoryService,
  ojService: OjService
): Promise<TestResult | undefined> {
  const problemDir = getCurrentProblemDirectory();
  if (!problemDir) {
    vscode.window.showWarningMessage("Open a file under an AcTutor problem directory first.");
    return undefined;
  }

  const problem = await readProblemJson(problemDir);
  if (!problem) {
    vscode.window.showWarningMessage("problem.json was not found for the current problem.");
    return undefined;
  }

  output.show(true);
  await saveDirtyProblemDocuments(problemDir, output);
  const result = await ojService.runTests(problem.problemId, problemDir);
  await historyService.recordTestResult(problem, result);
  vscode.window.showInformationMessage(result.passed ? "AcTutor: samples passed." : "AcTutor: samples failed. Check output.");
  return result;
}

async function saveDirtyProblemDocuments(problemDir: vscode.Uri, output: vscode.OutputChannel): Promise<void> {
  const dirtyDocuments = vscode.workspace.textDocuments.filter((document) => {
    const relative = path.relative(problemDir.fsPath, document.uri.fsPath);
    return document.isDirty && relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  });

  for (const document of dirtyDocuments) {
    await document.save();
    output.appendLine(`[AcTutor] Saved ${document.uri.fsPath}`);
  }
}
