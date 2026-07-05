import * as vscode from "vscode";
import { getCurrentProblemDirectory } from "../services/workspaceService";

export async function openNotes(): Promise<void> {
  const problemDir = getCurrentProblemDirectory();
  if (!problemDir) {
    vscode.window.showWarningMessage("Open a file under an AcTutor problem directory first.");
    return;
  }

  const notes = vscode.Uri.joinPath(problemDir, "notes.md");
  const document = await vscode.workspace.openTextDocument(notes);
  await vscode.window.showTextDocument(document);
}
