import { AcTutorSettings } from "../models/settings";

export type LanguageProfile = {
  id: "python";
  displayName: string;
  solutionFileName: string;
  templateFileName: string;
  buildCommand: string | null;
  syntaxCheckCommand: string | null;
  testCommand: string;
};

export function getLanguageProfile(settings: AcTutorSettings): LanguageProfile {
  if (settings.language !== "python") {
    throw new Error(`Unsupported language: ${settings.language}. AcTutor currently supports python only.`);
  }

  return {
    id: "python",
    displayName: "Python",
    solutionFileName: "main.py",
    templateFileName: "main.py",
    buildCommand: null,
    syntaxCheckCommand: `${settings.pythonCommand} -m py_compile main.py`,
    testCommand: `${settings.pythonCommand} main.py`
  };
}
