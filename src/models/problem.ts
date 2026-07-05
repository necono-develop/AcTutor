export type Problem = {
  problemId: string;
  contestId: string;
  title: string;
  url: string;
  difficulty: number | null;
  rawDifficulty?: number | null;
  difficultyIsExperimental?: boolean;
  tags: string[];
};

export type TestResult = {
  problemId: string;
  command: string;
  passed: boolean;
  rawOutput: string;
  executedAt: string;
};

export type PromptMode = "input_only" | "hint" | "wa_review" | "complexity" | "editorial";
