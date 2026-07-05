import { Problem } from "../models/problem";

type ProblemModel = {
  difficulty?: number;
  is_experimental?: boolean;
};

type ProblemResource = {
  id: string;
  contest_id: string;
  title?: string;
  name?: string;
};

type ProblemMetadata = {
  difficulty: number | null;
  rawDifficulty: number | null;
  difficultyIsExperimental: boolean;
};

const RESOURCE_BASE = "https://kenkoooo.com/atcoder/resources";

export class AtCoderProblemsClient {
  private problemModels?: Promise<Record<string, ProblemModel>>;
  private problems?: Promise<ProblemResource[]>;

  async enrichProblem(problem: Problem): Promise<Problem> {
    const metadata = await this.getProblemMetadata(problem.problemId);
    const title = await this.getProblemTitle(problem.problemId);
    return {
      ...problem,
      title: title ?? problem.title,
      difficulty: metadata.difficulty,
      rawDifficulty: metadata.rawDifficulty,
      difficultyIsExperimental: metadata.difficultyIsExperimental
    };
  }

  async getProblemMetadata(problemId: string): Promise<ProblemMetadata> {
    const models = await this.loadProblemModels();
    const model = models[problemId];
    if (model?.difficulty === undefined || model.difficulty === null) {
      return {
        difficulty: null,
        rawDifficulty: null,
        difficultyIsExperimental: false
      };
    }

    return {
      difficulty: normalizeDifficulty(model.difficulty),
      rawDifficulty: model.difficulty,
      difficultyIsExperimental: Boolean(model.is_experimental)
    };
  }

  async pickProblems(difficultyMin: number, difficultyMax: number): Promise<Problem[]> {
    const [problems, models] = await Promise.all([
      this.loadProblems(),
      this.loadProblemModels()
    ]);

    return problems
      .map((resource): Problem | undefined => {
        const model = models[resource.id];
        if (model?.difficulty === undefined || model.difficulty === null) {
          return undefined;
        }

        const difficulty = normalizeDifficulty(model.difficulty);
        if (difficulty < difficultyMin || difficulty > difficultyMax) {
          return undefined;
        }

        return {
          problemId: resource.id,
          contestId: resource.contest_id,
          title: resource.title ?? resource.name ?? resource.id,
          url: `https://atcoder.jp/contests/${resource.contest_id}/tasks/${resource.id}`,
          difficulty,
          rawDifficulty: model.difficulty,
          difficultyIsExperimental: Boolean(model.is_experimental),
          tags: []
        };
      })
      .filter((problem): problem is Problem => problem !== undefined)
      .sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0));
  }

  private async getProblemTitle(problemId: string): Promise<string | undefined> {
    const problems = await this.loadProblems();
    const problem = problems.find((resource) => resource.id === problemId);
    return problem?.title ?? problem?.name;
  }

  private loadProblemModels(): Promise<Record<string, ProblemModel>> {
    this.problemModels ??= fetchJson<Record<string, ProblemModel>>(`${RESOURCE_BASE}/problem-models.json`);
    return this.problemModels;
  }

  private loadProblems(): Promise<ProblemResource[]> {
    this.problems ??= fetchJson<ProblemResource[]>(`${RESOURCE_BASE}/problems.json`);
    return this.problems;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AcTutor VS Code extension"
    }
  });
  if (!response.ok) {
    throw new Error(`AtCoder Problems request failed: ${response.status} ${response.statusText}`);
  }
  return await response.json() as T;
}

function normalizeDifficulty(rawDifficulty: number): number {
  if (rawDifficulty >= 400) {
    return Math.round(rawDifficulty);
  }
  return Math.round(400 / Math.exp(1.0 - rawDifficulty / 400));
}
