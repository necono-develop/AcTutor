export type ProblemStatus = "new" | "tried" | "solved" | "gave_up";

export type ProblemHistory = {
  problemId: string;
  contestId: string;
  title: string;
  difficulty: number | null;
  rawDifficulty?: number | null;
  difficultyIsExperimental?: boolean;
  status: ProblemStatus;
  attempts: number;
  usedHintCount: number;
  usedSolutionPrompt: boolean;
  favorite?: boolean;
  tags: string[];
  memo: string;
  firstStartedAt: string;
  lastAttemptedAt: string;
  solvedAt: string | null;
};

export type HistoryFile = {
  problems: Record<string, ProblemHistory>;
};
