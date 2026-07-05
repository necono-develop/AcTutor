import * as vscode from "vscode";

export type AcTutorSettings = {
  language: string;
  statementLanguage: "ja" | "en" | "auto";
  promptLanguage: "ja" | "en" | "auto";
  pythonCommand: string;
  defaultDifficultyMin: number;
  defaultDifficultyMax: number;
  workspaceRoot: string;
  enableAiDuringLiveContest: boolean;
  promptDefaultMode: string;
  ojCommand: string;
};

export function getSettings(): AcTutorSettings {
  const config = vscode.workspace.getConfiguration("actutor");
  return {
    language: config.get("language", "python"),
    statementLanguage: config.get("statementLanguage", "en"),
    promptLanguage: config.get("promptLanguage", "en"),
    pythonCommand: config.get("pythonCommand", "python3"),
    defaultDifficultyMin: config.get("defaultDifficultyMin", 0),
    defaultDifficultyMax: config.get("defaultDifficultyMax", 200),
    workspaceRoot: config.get("workspaceRoot", "problems"),
    enableAiDuringLiveContest: config.get("enableAiDuringLiveContest", false),
    promptDefaultMode: config.get("promptDefaultMode", "hint"),
    ojCommand: config.get("ojCommand", "oj")
  };
}
