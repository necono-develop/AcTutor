import * as vscode from "vscode";
import { AtCoderProblemsClient } from "../services/atcoderProblemsClient";
import { getSettings } from "../models/settings";
import { Problem } from "../models/problem";
import { HistoryService } from "../services/historyService";

export async function pickProblem(client: AtCoderProblemsClient, setup: (problem: Problem) => Promise<void>): Promise<void> {
  const settings = getSettings();
  const minValue = await vscode.window.showInputBox({
    title: "AcTutor: Pick Problem",
    prompt: "Minimum difficulty",
    value: String(settings.defaultDifficultyMin)
  });
  if (minValue === undefined) {
    return;
  }

  const maxValue = await vscode.window.showInputBox({
    title: "AcTutor: Pick Problem",
    prompt: "Maximum difficulty",
    value: String(settings.defaultDifficultyMax)
  });
  if (maxValue === undefined) {
    return;
  }

  const problems = await client.pickProblems(Number(minValue), Number(maxValue));
  if (problems.length === 0) {
    vscode.window.showInformationMessage("No problems found in that difficulty range.");
    return;
  }

  const selected = await vscode.window.showQuickPick(
    problems.slice(0, 200).map((problem) => ({
      label: `${problem.problemId}  ${formatDifficulty(problem)}`,
      description: problem.title,
      detail: problem.url,
      problem
    })),
    {
      title: "AcTutor: Pick Problem",
      placeHolder: "Select a problem to set up"
    }
  );

  if (!selected) {
    return;
  }

  await setup(selected.problem);
}

export async function pickRandomProblem(
  client: AtCoderProblemsClient,
  historyService: HistoryService,
  setup: (problem: Problem) => Promise<void>
): Promise<void> {
  const range = await askDifficultyRange("AcTutor: Pick Random Problem");
  if (!range) {
    return;
  }

  const history = await historyService.read();
  const solvedProblemIds = new Set(
    Object.values(history.problems)
      .filter((problem) => problem.status === "solved")
      .map((problem) => problem.problemId)
  );

  const problems = (await client.pickProblems(range.min, range.max))
    .filter((problem) => !solvedProblemIds.has(problem.problemId));

  if (problems.length === 0) {
    vscode.window.showInformationMessage("No unsolved problems found in that difficulty range.");
    return;
  }

  while (problems.length > 0) {
    const index = Math.floor(Math.random() * problems.length);
    const selected = problems[index];
    const answer = await vscode.window.showInformationMessage(
      `Set up ${selected.problemId} (${formatDifficulty(selected)})? ${selected.title}`,
      { modal: true },
      "Setup",
      "Pick Again"
    );

    if (answer === "Setup") {
      await setup(selected);
      return;
    }

    if (answer !== "Pick Again") {
      return;
    }

    problems.splice(index, 1);
  }

  vscode.window.showInformationMessage("No more unsolved problems found in that difficulty range.");
}

async function askDifficultyRange(title: string): Promise<{ min: number; max: number } | undefined> {
  const settings = getSettings();
  const minValue = await vscode.window.showInputBox({
    title,
    prompt: "Minimum difficulty",
    value: String(settings.defaultDifficultyMin)
  });
  if (minValue === undefined) {
    return undefined;
  }

  const maxValue = await vscode.window.showInputBox({
    title,
    prompt: "Maximum difficulty",
    value: String(settings.defaultDifficultyMax)
  });
  if (maxValue === undefined) {
    return undefined;
  }

  const min = Number(minValue);
  const max = Number(maxValue);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    vscode.window.showWarningMessage("Enter a valid difficulty range.");
    return undefined;
  }

  return { min, max };
}

function formatDifficulty(problem: Problem): string {
  const value = problem.difficulty === null ? "unknown" : String(problem.difficulty);
  return problem.difficultyIsExperimental ? `Diff ${value} experimental` : `Diff ${value}`;
}
