import * as vscode from "vscode";
import { HistoryService } from "../services/historyService";
import { getCurrentProblemDirectory, readProblemJson } from "../services/workspaceService";

export async function toggleFavorite(historyService: HistoryService): Promise<void> {
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

  await historyService.upsertStarted(problem);
  const favorite = await historyService.toggleFavorite(problem.problemId);
  vscode.window.showInformationMessage(favorite ? `Favorited: ${problem.problemId}` : `Unfavorited: ${problem.problemId}`);
}

export async function deleteHistoryEntry(historyService: HistoryService): Promise<void> {
  const history = await historyService.read();
  const entries = Object.values(history.problems).sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
  if (entries.length === 0) {
    vscode.window.showInformationMessage("No AcTutor history yet.");
    return;
  }

  const selected = await vscode.window.showQuickPick(
    entries.map((entry) => ({
      label: entry.problemId,
      description: entry.status,
      detail: `${entry.title}  attempts:${entry.attempts}  hints:${entry.usedHintCount}`,
      entry
    })),
    {
      title: "AcTutor: Delete History Entry",
      placeHolder: "Select a history entry to delete"
    }
  );

  if (!selected) {
    return;
  }

  const answer = await vscode.window.showWarningMessage(
    `Delete history for ${selected.entry.problemId}? Problem files will not be deleted.`,
    { modal: true },
    "Delete"
  );
  if (answer !== "Delete") {
    return;
  }

  await historyService.deleteProblem(selected.entry.problemId);
  vscode.window.showInformationMessage(`Deleted history: ${selected.entry.problemId}`);
}
