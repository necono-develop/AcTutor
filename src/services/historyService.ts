import * as fs from "fs/promises";
import * as vscode from "vscode";
import { HistoryFile, ProblemHistory } from "../models/history";
import { Problem, TestResult } from "../models/problem";
import { getWorkspaceFolder } from "./workspaceService";

export class HistoryService {
  async read(): Promise<HistoryFile> {
    try {
      const content = await fs.readFile(this.getHistoryUri().fsPath, "utf8");
      return JSON.parse(content) as HistoryFile;
    } catch {
      return { problems: {} };
    }
  }

  async upsertStarted(problem: Problem): Promise<ProblemHistory> {
    const history = await this.read();
    const now = new Date().toISOString();
    const current = history.problems[problem.problemId];
    const next: ProblemHistory = current ?? {
      problemId: problem.problemId,
      contestId: problem.contestId,
      title: problem.title,
      difficulty: problem.difficulty,
      rawDifficulty: problem.rawDifficulty,
      difficultyIsExperimental: problem.difficultyIsExperimental,
      status: "new",
      attempts: 0,
      usedHintCount: 0,
      usedSolutionPrompt: false,
      favorite: false,
      tags: problem.tags,
      memo: "",
      firstStartedAt: now,
      lastAttemptedAt: now,
      solvedAt: null
    };

    history.problems[problem.problemId] = {
      ...next,
      contestId: problem.contestId,
      title: problem.title,
      difficulty: problem.difficulty,
      rawDifficulty: problem.rawDifficulty,
      difficultyIsExperimental: problem.difficultyIsExperimental,
      tags: problem.tags,
      lastAttemptedAt: now
    };
    await this.write(history);
    return history.problems[problem.problemId];
  }

  async recordTestResult(problem: Problem, result: TestResult): Promise<void> {
    const history = await this.read();
    const now = new Date().toISOString();
    const current = history.problems[problem.problemId] ?? await this.upsertStarted(problem);
    history.problems[problem.problemId] = {
      ...current,
      status: result.passed ? "solved" : "tried",
      attempts: current.attempts + 1,
      lastAttemptedAt: now,
      solvedAt: result.passed ? now : current.solvedAt
    };
    await this.write(history);
  }

  async incrementHint(problem: Problem, usedSolutionPrompt: boolean): Promise<void> {
    const history = await this.read();
    const current = history.problems[problem.problemId] ?? await this.upsertStarted(problem);
    history.problems[problem.problemId] = {
      ...current,
      usedHintCount: current.usedHintCount + 1,
      usedSolutionPrompt: current.usedSolutionPrompt || usedSolutionPrompt,
      lastAttemptedAt: new Date().toISOString()
    };
    await this.write(history);
  }

  async markSolved(problem: Problem): Promise<void> {
    const history = await this.read();
    const current = history.problems[problem.problemId] ?? await this.upsertStarted(problem);
    const now = new Date().toISOString();
    history.problems[problem.problemId] = {
      ...current,
      status: "solved",
      lastAttemptedAt: now,
      solvedAt: current.solvedAt ?? now
    };
    await this.write(history);
  }

  async toggleFavorite(problemId: string): Promise<boolean> {
    const history = await this.read();
    const current = history.problems[problemId];
    if (!current) {
      throw new Error(`History entry was not found: ${problemId}`);
    }

    const favorite = !current.favorite;
    history.problems[problemId] = {
      ...current,
      favorite,
      lastAttemptedAt: new Date().toISOString()
    };
    await this.write(history);
    return favorite;
  }

  async deleteProblem(problemId: string): Promise<void> {
    const history = await this.read();
    if (!history.problems[problemId]) {
      throw new Error(`History entry was not found: ${problemId}`);
    }

    delete history.problems[problemId];
    await this.write(history);
  }

  private async write(history: HistoryFile): Promise<void> {
    await fs.mkdir(vscode.Uri.joinPath(getWorkspaceFolder().uri, ".actutor").fsPath, { recursive: true });
    await fs.writeFile(this.getHistoryUri().fsPath, `${JSON.stringify(history, null, 2)}\n`, "utf8");
  }

  private getHistoryUri(): vscode.Uri {
    return vscode.Uri.joinPath(getWorkspaceFolder().uri, ".actutor", "history.json");
  }
}
