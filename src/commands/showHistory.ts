import * as vscode from "vscode";
import { ProblemHistory } from "../models/history";
import { getSettings } from "../models/settings";
import { HistoryService } from "../services/historyService";
import { getLanguageProfile } from "../services/languageService";
import { getProblemDirectory } from "../services/workspaceService";

export async function showHistory(historyService: HistoryService): Promise<void> {
  const history = await historyService.read();
  const entries = Object.values(history.problems).sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
  const content = entries.length ? renderHistoryReport(entries) : "# AcTutor History\n\nNo AcTutor history yet.\n";
  await openMarkdown("AcTutor History", content);
}

export async function showFavorites(historyService: HistoryService): Promise<void> {
  const history = await historyService.read();
  const entries = Object.values(history.problems)
    .filter((entry) => entry.favorite)
    .sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
  await openMarkdown("AcTutor Favorites", renderFilteredReport("AcTutor Favorites", entries, "No favorite problems yet."));
}

export async function showUnsolvedProblems(historyService: HistoryService): Promise<void> {
  const history = await historyService.read();
  const entries = Object.values(history.problems)
    .filter((entry) => entry.status !== "solved")
    .sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
  await openMarkdown("AcTutor Unsolved Problems", renderFilteredReport("AcTutor Unsolved Problems", entries, "No unsolved problems in history."));
}

export async function openHistoryProblem(historyService: HistoryService, filter: "all" | "favorites" | "unsolved" = "all"): Promise<void> {
  const history = await historyService.read();
  const entries = Object.values(history.problems)
    .filter((entry) => {
      if (filter === "favorites") {
        return Boolean(entry.favorite);
      }
      if (filter === "unsolved") {
        return entry.status !== "solved";
      }
      return true;
    })
    .sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));

  if (entries.length === 0) {
    vscode.window.showInformationMessage("No matching AcTutor history entries.");
    return;
  }

  const selected = await vscode.window.showQuickPick(
    entries.map((entry) => ({
      label: entry.problemId,
      description: `${entry.status} / diff ${entry.difficulty ?? "unknown"}`,
      detail: entry.title,
      entry
    })),
    {
      title: "AcTutor: Open Problem",
      placeHolder: "Select a problem to open"
    }
  );

  if (!selected) {
    return;
  }

  const links = getProblemLinks(selected.entry);
  await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(links.answer));
}

function renderHistoryReport(entries: ProblemHistory[]): string {
  const stats = {
    total: entries.length,
    solved: entries.filter((entry) => entry.status === "solved").length,
    tried: entries.filter((entry) => entry.status === "tried").length,
    newCount: entries.filter((entry) => entry.status === "new").length,
    gaveUp: entries.filter((entry) => entry.status === "gave_up").length,
    favorite: entries.filter((entry) => entry.favorite).length,
    attempts: entries.reduce((sum, entry) => sum + entry.attempts, 0),
    aiPrompts: entries.reduce((sum, entry) => sum + entry.usedHintCount, 0),
    solutionPrompt: entries.filter((entry) => entry.usedSolutionPrompt).length
  };
  const solvedRate = stats.total === 0 ? 0 : Math.round((stats.solved / stats.total) * 100);

  return [
    "# AcTutor History",
    "",
    "## Progress",
    "",
    `- Total: ${stats.total}`,
    `- Solved: ${stats.solved} (${solvedRate}%)`,
    `- Tried: ${stats.tried}`,
    `- New: ${stats.newCount}`,
    `- Gave up: ${stats.gaveUp}`,
    `- Favorites: ${stats.favorite}`,
    `- Attempts: ${stats.attempts}`,
    `- AI prompts: ${stats.aiPrompts}`,
    `- Solution prompt used: ${stats.solutionPrompt}`,
    "",
    "## Favorites",
    "",
    ...renderProblemList(entries.filter((entry) => entry.favorite)),
    "",
    "## Recent Problems",
    "",
    "| Problem | Answer | Folder | Status | Difficulty | Attempts | AI | Favorite | Last Attempted |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |",
    ...entries.map((entry) => {
      return renderProblemRow(entry, true);
    }),
    ""
  ].join("\n");
}

function renderProblemList(entries: ProblemHistory[]): string[] {
  if (entries.length === 0) {
    return ["No favorites yet."];
  }

  return entries.map((entry) => {
    const links = getProblemLinks(entry);
    return `- ${entry.problemId}: ${entry.title} (${entry.status}, ${entry.usedHintCount} AI prompts) - [answer](${links.answer}) / [folder](${links.folder})`;
  });
}

function renderFilteredReport(title: string, entries: ProblemHistory[], emptyMessage: string): string {
  if (entries.length === 0) {
    return `# ${title}\n\n${emptyMessage}\n`;
  }

  return [
    `# ${title}`,
    "",
    "| Problem | Answer | Folder | Status | Difficulty | Attempts | AI | Solution Prompt | Last Attempted |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |",
    ...entries.map((entry) => {
      return renderProblemRow(entry, false);
    }),
    ""
  ].join("\n");
}

function renderProblemRow(entry: ProblemHistory, includeFavorite: boolean): string {
  const links = getProblemLinks(entry);
  const common = [
    entry.problemId,
    `[main](${links.answer})`,
    `[folder](${links.folder})`,
    entry.status,
    entry.difficulty ?? "",
    entry.attempts,
    entry.usedHintCount
  ];

  if (includeFavorite) {
    return `| ${[...common, entry.favorite ? "yes" : "", entry.lastAttemptedAt].join(" | ")} |`;
  }

  return `| ${[...common, entry.usedSolutionPrompt ? "yes" : "", entry.lastAttemptedAt].join(" | ")} |`;
}

function getProblemLinks(entry: ProblemHistory): { answer: string; folder: string } {
  const language = getLanguageProfile(getSettings());
  const folder = getProblemDirectory(entry.problemId);
  const answer = vscode.Uri.joinPath(folder, language.solutionFileName);
  return {
    answer: answer.toString(),
    folder: folder.toString()
  };
}

async function openMarkdown(_title: string, content: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: "markdown",
    content
  });
  await vscode.window.showTextDocument(document, { preview: true });
}
