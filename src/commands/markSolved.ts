import * as vscode from "vscode";
import { HistoryService } from "../services/historyService";
import { getCurrentProblemDirectory, readProblemJson } from "../services/workspaceService";

export async function markSolved(historyService: HistoryService): Promise<void> {
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

  await historyService.markSolved(problem);
  vscode.window.showInformationMessage(`AcTutor: marked solved: ${problem.problemId}`);
}
