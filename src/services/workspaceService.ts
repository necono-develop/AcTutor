import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { Problem } from "../models/problem";
import { getSettings } from "../models/settings";
import { getLanguageProfile } from "./languageService";

export type ProblemWorkspace = {
  root: vscode.Uri;
  mainFile: vscode.Uri;
  notesFile: vscode.Uri;
  problemMarkdownFile: vscode.Uri;
  problemFile: vscode.Uri;
};

export function getWorkspaceFolder(): vscode.WorkspaceFolder {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("Open a VS Code workspace before using AcTutor.");
  }
  return folder;
}

export function inferProblemFromUrl(url: string): Problem {
  const match = url.match(/atcoder\.jp\/contests\/([^/]+)\/tasks\/([^/?#]+)/);
  if (!match) {
    throw new Error("AtCoder task URL must look like https://atcoder.jp/contests/abc000/tasks/abc000_a");
  }

  return {
    contestId: match[1],
    problemId: match[2],
    title: match[2],
    url,
    difficulty: null,
    tags: []
  };
}

export function getProblemDirectory(problemId: string): vscode.Uri {
  const settings = getSettings();
  const workspace = getWorkspaceFolder();
  return vscode.Uri.joinPath(workspace.uri, settings.workspaceRoot, problemId);
}

export async function createProblemWorkspace(problem: Problem, extensionUri: vscode.Uri): Promise<ProblemWorkspace> {
  const language = getLanguageProfile(getSettings());
  const root = getProblemDirectory(problem.problemId);
  const mainFile = vscode.Uri.joinPath(root, language.solutionFileName);
  const notesFile = vscode.Uri.joinPath(root, "notes.md");
  const problemMarkdownFile = vscode.Uri.joinPath(root, "problem.md");
  const problemFile = vscode.Uri.joinPath(root, "problem.json");
  const testDir = vscode.Uri.joinPath(root, "test");

  await fs.mkdir(testDir.fsPath, { recursive: true });
  await writeFileIfMissing(mainFile, await readTemplate(extensionUri, language.templateFileName));
  await writeFileIfMissing(notesFile, renderNotes(await readTemplate(extensionUri, "notes.md"), problem));
  await writeFileIfMissing(problemMarkdownFile, renderProblemPlaceholder(problem));
  await fs.writeFile(problemFile.fsPath, `${JSON.stringify(problem, null, 2)}\n`, "utf8");

  return { root, mainFile, notesFile, problemMarkdownFile, problemFile };
}

export async function writeProblemMarkdown(problemDir: vscode.Uri, markdown: string): Promise<void> {
  await fs.writeFile(vscode.Uri.joinPath(problemDir, "problem.md").fsPath, markdown, "utf8");
}

export async function writeProblemJson(problemDir: vscode.Uri, problem: Problem): Promise<void> {
  await fs.writeFile(vscode.Uri.joinPath(problemDir, "problem.json").fsPath, `${JSON.stringify(problem, null, 2)}\n`, "utf8");
}

export async function readProblemJson(problemDir: vscode.Uri): Promise<Problem | undefined> {
  try {
    const content = await fs.readFile(vscode.Uri.joinPath(problemDir, "problem.json").fsPath, "utf8");
    return JSON.parse(content) as Problem;
  } catch {
    return undefined;
  }
}

export function getCurrentProblemDirectory(): vscode.Uri | undefined {
  const activeFile = vscode.window.activeTextEditor?.document.uri;
  if (!activeFile) {
    return undefined;
  }

  const settings = getSettings();
  const workspace = getWorkspaceFolder();
  const problemsRoot = vscode.Uri.joinPath(workspace.uri, settings.workspaceRoot).fsPath;
  const relative = path.relative(problemsRoot, activeFile.fsPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }

  const problemId = relative.split(path.sep)[0];
  if (!problemId) {
    return undefined;
  }
  return vscode.Uri.joinPath(workspace.uri, settings.workspaceRoot, problemId);
}

async function readTemplate(extensionUri: vscode.Uri, fileName: string): Promise<string> {
  return fs.readFile(vscode.Uri.joinPath(extensionUri, "resources", "templates", fileName).fsPath, "utf8");
}

async function writeFileIfMissing(uri: vscode.Uri, content: string): Promise<void> {
  try {
    await fs.access(uri.fsPath);
  } catch {
    await fs.writeFile(uri.fsPath, content, "utf8");
  }
}

function renderNotes(template: string, problem: Problem): string {
  return template.replaceAll("{{title}}", problem.title).replaceAll("{{url}}", problem.url);
}

function renderProblemPlaceholder(problem: Problem): string {
  return `# ${problem.title}\n\n- URL: ${problem.url}\n- Contest: ${problem.contestId}\n- Problem ID: ${problem.problemId}\n\nProblem statement has not been downloaded yet.\n`;
}
