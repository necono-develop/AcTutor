import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as vscode from "vscode";
import { getSettings } from "../models/settings";
import { TestResult } from "../models/problem";
import { getLanguageProfile } from "./languageService";

export class OjService {
  constructor(private readonly output: vscode.OutputChannel) {}

  async checkInstalled(): Promise<boolean> {
    const settings = getSettings();
    const result = await runCommand(settings.ojCommand, ["--version"], undefined, this.output);
    return result.exitCode === 0;
  }

  async downloadSamples(problemUrl: string, cwd: vscode.Uri): Promise<void> {
    const settings = getSettings();
    if (await hasDownloadedSamples(cwd)) {
      this.output.appendLine("[AcTutor] Sample files already exist. Skipping oj download.");
      return;
    }

    this.output.appendLine(`[AcTutor] Running ${settings.ojCommand} download --silent ${problemUrl}`);
    this.output.appendLine("[AcTutor] Note: oj may render spaces as '_' in logs; saved sample files keep real whitespace.");
    const result = await runCommand(settings.ojCommand, ["download", "--silent", problemUrl], cwd.fsPath, this.output);
    if (result.exitCode !== 0) {
      throw new Error(`oj download failed with exit code ${result.exitCode}: ${summarizeFailure(result)}`);
    }
  }

  async runTests(problemId: string, cwd: vscode.Uri): Promise<TestResult> {
    const settings = getSettings();
    const language = getLanguageProfile(settings);
    const command = language.testCommand;
    const syntaxCheck = await this.runSyntaxCheck(cwd);
    if (syntaxCheck.exitCode !== 0) {
      const rawOutput = `${syntaxCheck.stdout}${syntaxCheck.stderr}`;
      this.output.appendLine("[AcTutor] Python syntax check failed before running samples.");
      return {
        problemId,
        command: language.syntaxCheckCommand ?? "",
        passed: false,
        rawOutput,
        executedAt: new Date().toISOString()
      };
    }

    const build = await this.runBuild(cwd);
    if (build.exitCode !== 0) {
      const rawOutput = `${build.stdout}${build.stderr}`;
      this.output.appendLine("[AcTutor] Build failed before running samples.");
      return {
        problemId,
        command: language.buildCommand ?? "",
        passed: false,
        rawOutput,
        executedAt: new Date().toISOString()
      };
    }

    const args = ["t", "-c", command];
    this.output.appendLine(`[AcTutor] Running ${settings.ojCommand} t -c "${command}"`);
    this.output.appendLine("[AcTutor] Note: oj may render spaces as '_' in logs; tests still use the real sample files.");
    const result = await runCommand(settings.ojCommand, args, cwd.fsPath, this.output);
    const rawOutput = `${result.stdout}${result.stderr}`;
    return {
      problemId,
      command: `${settings.ojCommand} ${args.join(" ")}`,
      passed: result.exitCode === 0,
      rawOutput,
      executedAt: new Date().toISOString()
    };
  }

  private async runSyntaxCheck(cwd: vscode.Uri): Promise<CommandResult> {
    const settings = getSettings();
    const language = getLanguageProfile(settings);
    if (!language.syntaxCheckCommand) {
      return { exitCode: 0, stdout: "", stderr: "" };
    }

    this.output.appendLine(`[AcTutor] Running ${language.syntaxCheckCommand}`);
    return await runShellCommand(language.syntaxCheckCommand, cwd.fsPath, this.output);
  }

  private async runBuild(cwd: vscode.Uri): Promise<CommandResult> {
    const language = getLanguageProfile(getSettings());
    if (!language.buildCommand) {
      return { exitCode: 0, stdout: "", stderr: "" };
    }

    this.output.appendLine(`[AcTutor] Running ${language.buildCommand}`);
    return await runShellCommand(language.buildCommand, cwd.fsPath, this.output);
  }
}

async function hasDownloadedSamples(cwd: vscode.Uri): Promise<boolean> {
  try {
    const testDir = vscode.Uri.joinPath(cwd, "test");
    const entries = await fs.readdir(testDir.fsPath);
    return entries.some((entry) => /^sample-\d+\.(in|out)$/.test(entry));
  } catch {
    return false;
  }
}

function summarizeFailure(result: CommandResult): string {
  const lines = `${result.stderr}\n${result.stdout}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const interesting = [...lines].reverse().find((line) => line.startsWith("[ERROR]") || line.startsWith("[HINT]"));
  return interesting ?? lines.at(-1) ?? "no output";
}

type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

function runCommand(command: string, args: string[], cwd: string | undefined, output: vscode.OutputChannel): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: process.platform === "win32" });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      output.append(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      output.append(text);
    });

    child.on("error", (error) => {
      stderr += `${error.message}\n`;
      output.appendLine(error.message);
      resolve({ exitCode: 127, stdout, stderr });
    });

    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function runShellCommand(command: string, cwd: string | undefined, output: vscode.OutputChannel): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      output.append(text);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      output.append(text);
    });

    child.on("error", (error) => {
      stderr += `${error.message}\n`;
      output.appendLine(error.message);
      resolve({ exitCode: 127, stdout, stderr });
    });

    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}
