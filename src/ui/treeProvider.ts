import * as vscode from "vscode";
import { ProblemHistory } from "../models/history";
import { Problem } from "../models/problem";
import { getSettings } from "../models/settings";
import { HistoryService } from "../services/historyService";
import { getLanguageProfile } from "../services/languageService";
import { getCurrentProblemDirectory, getProblemDirectory, readProblemJson } from "../services/workspaceService";

type AcTutorNode = vscode.TreeItem & {
  children?: AcTutorNode[];
};

export class AcTutorTreeProvider implements vscode.TreeDataProvider<AcTutorNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<AcTutorNode | undefined | null | void>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly historyService: HistoryService) {}

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: AcTutorNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AcTutorNode): Promise<AcTutorNode[]> {
    if (element) {
      return element.children ?? [];
    }

    const history = await this.historyService.read();
    const current = await this.resolveCurrentProblem(Object.values(history.problems));
    const entries = Object.values(history.problems).sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt));
    const stats = summarizeHistory(entries);

    return [
      currentProblemSection(current),
      primaryActionsSection(),
      promptActionsSection(),
      filesSection(current),
      progressSection(stats),
      historySection(entries, stats)
    ];
  }

  private async resolveCurrentProblem(historyEntries: ProblemHistory[]): Promise<{ problem: Problem; history?: ProblemHistory; dir: vscode.Uri } | undefined> {
    const activeDir = getCurrentProblemDirectory();
    if (activeDir) {
      const problem = await readProblemJson(activeDir);
      if (problem) {
        return {
          problem,
          history: historyEntries.find((entry) => entry.problemId === problem.problemId),
          dir: activeDir
        };
      }
    }

    const latest = [...historyEntries].sort((a, b) => b.lastAttemptedAt.localeCompare(a.lastAttemptedAt))[0];
    if (!latest) {
      return undefined;
    }

    const dir = getProblemDirectory(latest.problemId);
    const problem = await readProblemJson(dir) ?? {
      problemId: latest.problemId,
      contestId: latest.contestId,
      title: latest.title,
      url: "",
      difficulty: latest.difficulty,
      rawDifficulty: latest.rawDifficulty,
      difficultyIsExperimental: latest.difficultyIsExperimental,
      tags: latest.tags
    };
    return { problem, history: latest, dir };
  }
}

function currentProblemSection(current: { problem: Problem; history?: ProblemHistory; dir: vscode.Uri } | undefined): AcTutorNode {
  if (!current) {
    return section("Current Problem", [
      infoItem("No problem selected", "Run Setup Problem first", "info"),
      commandItem("Setup Problem", "actutor.setupProblem", "add")
    ], "debug-start");
  }

  const { problem, history, dir } = current;
  const status = history?.status ?? "new";
  const attempts = history?.attempts ?? 0;
  const difficulty = formatDifficulty(problem);
  const favorite = history?.favorite ? "favorite" : "";
  const aiSummary = `${history?.usedHintCount ?? 0} AI${history?.usedSolutionPrompt ? " / solution" : ""}`;

  return section(`${problem.problemId}`, [
    infoItem(problem.title, favorite, history?.favorite ? "star-full" : "symbol-string"),
    infoItem(`${status} / ${attempts} attempts`, `Diff ${difficulty}`, statusIcon(status)),
    infoItem(aiSummary, problem.contestId, "lightbulb"),
    linkItem("Open AtCoder Page", problem.url)
  ], "target");
}

function primaryActionsSection(): AcTutorNode {
  return section("Actions", [
    commandItem("Pick Random Problem", "actutor.pickRandomProblem", "surprise"),
    commandItem("Run Sample Tests", "actutor.runSampleTests", "run"),
    commandItem("Mark as Solved", "actutor.markSolved", "pass-filled"),
    commandItem("Toggle Favorite", "actutor.toggleFavorite", "star-full")
  ], "tools");
}

function promptActionsSection(): AcTutorNode {
  return section("Prompts", [
    commandItem("Hint", "actutor.copyHintPrompt", "lightbulb"),
    commandItem("WA Review", "actutor.copyReviewPrompt", "comment-discussion"),
    commandItem("Solution", "actutor.copySolutionPrompt", "book")
  ], "comment-discussion", vscode.TreeItemCollapsibleState.Collapsed);
}

function filesSection(current: { problem: Problem; history?: ProblemHistory; dir: vscode.Uri } | undefined): AcTutorNode {
  if (!current) {
    return section("Files", [], "files", vscode.TreeItemCollapsibleState.Collapsed);
  }

  const language = getLanguageProfile(getSettings());
  const { dir } = current;
  return section("Files", [
    fileItem(language.solutionFileName, vscode.Uri.joinPath(dir, language.solutionFileName), "edit"),
    fileItem("problem.md", vscode.Uri.joinPath(dir, "problem.md"), "book"),
    fileItem("notes.md", vscode.Uri.joinPath(dir, "notes.md"), "notebook")
  ], "files", vscode.TreeItemCollapsibleState.Collapsed);
}

type HistoryStats = {
  total: number;
  solved: number;
  tried: number;
  newCount: number;
  gaveUp: number;
  favorite: number;
  attempts: number;
  aiPrompts: number;
  solutionPrompt: number;
};

function progressSection(stats: HistoryStats): AcTutorNode {
  const rate = stats.total === 0 ? 0 : Math.round((stats.solved / stats.total) * 100);
  return section("Progress", [
    infoItem(`${stats.solved}/${stats.total} solved`, `${rate}%`, "graph"),
    infoItem(`${stats.attempts} attempts`, `${stats.aiPrompts} AI prompts`, "lightbulb"),
    infoItem(`${stats.favorite} favorites`, `${stats.solutionPrompt} solution prompts`, "star-full")
  ], "graph", vscode.TreeItemCollapsibleState.Collapsed);
}

function historySection(entries: ProblemHistory[], stats: HistoryStats): AcTutorNode {
  const pinned = entries.filter((entry) => entry.favorite).slice(0, 3);
  const recent = entries.filter((entry) => !entry.favorite).slice(0, Math.max(0, 5 - pinned.length));
  const visible = [...pinned, ...recent].map((entry) => {
    return historyItem(entry);
  });

  return section("History", [
    commandItem("Open History Report", "actutor.showHistory", "history"),
    commandItem("Show Favorites", "actutor.showFavorites", "star-full"),
    commandItem("Show Unsolved", "actutor.showUnsolvedProblems", "circle-outline"),
    commandItem("Open Favorite", "actutor.openFavoriteProblem", "go-to-file"),
    commandItem("Open Unsolved", "actutor.openUnsolvedProblem", "go-to-file"),
    commandItem("Delete Entry", "actutor.deleteHistoryEntry", "trash"),
    infoItem(`${stats.total} problems`, `${stats.tried} tried`, "graph"),
    ...visible
  ], "history", vscode.TreeItemCollapsibleState.Collapsed);
}

function historyItem(entry: ProblemHistory): AcTutorNode {
  const item = new vscode.TreeItem(`${entry.favorite ? "[*] " : ""}${entry.problemId}`, vscode.TreeItemCollapsibleState.None) as AcTutorNode;
  item.description = `${entry.status} / ${entry.usedHintCount} AI`;
  item.tooltip = `${entry.title}\n${entry.attempts} attempts\n${entry.usedHintCount} AI prompts\nLast attempted: ${entry.lastAttemptedAt}`;
  item.iconPath = new vscode.ThemeIcon(entry.favorite ? "star-full" : statusIcon(entry.status));
  item.command = {
    command: "vscode.open",
    title: "Open Answer",
    arguments: [vscode.Uri.joinPath(getProblemDirectory(entry.problemId), getLanguageProfile(getSettings()).solutionFileName)]
  };
  return item;
}

function summarizeHistory(entries: ProblemHistory[]): HistoryStats {
  return {
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
}

function section(label: string, children: AcTutorNode[], icon: string, state = vscode.TreeItemCollapsibleState.Expanded): AcTutorNode {
  const item = new vscode.TreeItem(label, state) as AcTutorNode;
  item.children = children;
  item.iconPath = new vscode.ThemeIcon(icon);
  return item;
}

function commandItem(label: string, command: string, icon: string): AcTutorNode {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None) as AcTutorNode;
  item.command = { command, title: label };
  item.iconPath = new vscode.ThemeIcon(icon);
  return item;
}

function fileItem(label: string, uri: vscode.Uri, icon: string): AcTutorNode {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None) as AcTutorNode;
  item.resourceUri = uri;
  item.command = { command: "vscode.open", title: label, arguments: [uri] };
  item.iconPath = new vscode.ThemeIcon(icon);
  item.tooltip = uri.fsPath;
  return item;
}

function linkItem(label: string, url: string): AcTutorNode {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None) as AcTutorNode;
  item.iconPath = new vscode.ThemeIcon("link-external");
  if (url) {
    item.command = { command: "vscode.open", title: label, arguments: [vscode.Uri.parse(url)] };
  }
  return item;
}

function infoItem(label: string, description: string, icon: string): AcTutorNode {
  const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None) as AcTutorNode;
  item.description = description;
  item.iconPath = new vscode.ThemeIcon(icon);
  return item;
}

function formatDifficulty(problem: Problem): string {
  if (problem.difficulty === null) {
    return "unknown";
  }
  return problem.difficultyIsExperimental ? `${problem.difficulty} experimental` : String(problem.difficulty);
}

function statusIcon(status: string): string {
  switch (status) {
    case "solved":
      return "pass-filled";
    case "tried":
      return "warning";
    case "gave_up":
      return "circle-slash";
    case "new":
    default:
      return "circle-outline";
  }
}
