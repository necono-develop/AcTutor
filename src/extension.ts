import * as vscode from "vscode";
import { copyPrompt } from "./commands/copyPrompt";
import { deleteHistoryEntry, toggleFavorite } from "./commands/historyActions";
import { markSolved } from "./commands/markSolved";
import { openNotes } from "./commands/openNotes";
import { pickProblem, pickRandomProblem } from "./commands/pickProblem";
import { runTests } from "./commands/runTests";
import { setupProblem, setupProblemFromUrl } from "./commands/setupProblem";
import { openHistoryProblem, showFavorites, showHistory, showUnsolvedProblems } from "./commands/showHistory";
import { AtCoderProblemsClient } from "./services/atcoderProblemsClient";
import { HistoryService } from "./services/historyService";
import { OjService } from "./services/ojService";
import { ProblemStatementService } from "./services/problemStatementService";
import { PromptService } from "./services/promptService";
import { AcTutorTreeProvider } from "./ui/treeProvider";

let lastTestResult: Awaited<ReturnType<typeof runTests>> | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("AcTutor");
  const historyService = new HistoryService();
  const ojService = new OjService(output);
  const problemStatementService = new ProblemStatementService();
  const promptService = new PromptService();
  const atCoderProblemsClient = new AtCoderProblemsClient();
  const treeProvider = new AcTutorTreeProvider(historyService);

  context.subscriptions.push(output);
  context.subscriptions.push(vscode.window.registerTreeDataProvider("actutor.sidebar", treeProvider));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => treeProvider.refresh()));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => treeProvider.refresh()));

  context.subscriptions.push(register("actutor.hello", async () => {
    output.appendLine("[AcTutor] Hello. Settings and output channel are ready.");
    output.show(true);
    vscode.window.showInformationMessage("AcTutor is ready.");
  }));

  context.subscriptions.push(register("actutor.setupProblem", async () => {
    await setupProblem(context.extensionUri, output, historyService, atCoderProblemsClient, ojService, problemStatementService);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.runSampleTests", async () => {
    lastTestResult = await runTests(output, historyService, ojService);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.copyHintPrompt", async () => {
    await copyPrompt("hint", historyService, promptService, lastTestResult);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.copyReviewPrompt", async () => {
    await copyPrompt("wa_review", historyService, promptService, lastTestResult);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.copySolutionPrompt", async () => {
    await copyPrompt("editorial", historyService, promptService, lastTestResult);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.markSolved", async () => {
    await markSolved(historyService);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.toggleFavorite", async () => {
    await toggleFavorite(historyService);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.deleteHistoryEntry", async () => {
    await deleteHistoryEntry(historyService);
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.openNotes", openNotes));
  context.subscriptions.push(register("actutor.showHistory", async () => showHistory(historyService)));
  context.subscriptions.push(register("actutor.showFavorites", async () => showFavorites(historyService)));
  context.subscriptions.push(register("actutor.showUnsolvedProblems", async () => showUnsolvedProblems(historyService)));
  context.subscriptions.push(register("actutor.openHistoryProblem", async () => openHistoryProblem(historyService)));
  context.subscriptions.push(register("actutor.openFavoriteProblem", async () => openHistoryProblem(historyService, "favorites")));
  context.subscriptions.push(register("actutor.openUnsolvedProblem", async () => openHistoryProblem(historyService, "unsolved")));
  context.subscriptions.push(register("actutor.pickProblem", async () => {
    await pickProblem(atCoderProblemsClient, async (problem) => {
      await setupProblemFromUrl(problem.url, context.extensionUri, output, historyService, atCoderProblemsClient, ojService, problemStatementService);
    });
    treeProvider.refresh();
  }));

  context.subscriptions.push(register("actutor.pickRandomProblem", async () => {
    await pickRandomProblem(atCoderProblemsClient, historyService, async (problem) => {
      await setupProblemFromUrl(problem.url, context.extensionUri, output, historyService, atCoderProblemsClient, ojService, problemStatementService);
    });
    treeProvider.refresh();
  }));
}

export function deactivate(): void {}

function register(command: string, callback: () => Promise<void> | void): vscode.Disposable {
  return vscode.commands.registerCommand(command, async () => {
    try {
      await callback();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`AcTutor: ${message}`);
    }
  });
}
