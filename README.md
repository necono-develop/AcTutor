# AcTutor

AcTutor is a VS Code extension for AtCoder practice. It creates per-problem workspaces, runs sample tests through `online-judge-tools`, records local learning history, and copies AI prompt templates that avoid direct answers by default.

Japanese guide: [README.ja.md](README.ja.md)

AcTutor is an unofficial tool. It is not affiliated with, endorsed by, or sponsored by AtCoder, AtCoder Problems, or online-judge-tools. Follow each contest site's rules, especially when using AI assistance during live contests.

## Contest Notice

Before using AcTutor during any live contest, read and follow that contest's rules. Some contests restrict or prohibit external tools, AI assistance, generated hints, copied prompts, or use of downloaded samples in specific ways.

AcTutor is intended for practice and learning. The AI prompt features are designed to avoid direct answers by default, but that does not automatically make them allowed in a live contest. When in doubt, do not use AI-related features during the contest.

You are responsible for how you use this extension and for complying with each contest platform's rules.

Problem setup stores the fetched statement in `problem.md`. Prompt generation reads that file together with `main.py`, `notes.md`, and the latest sample-test output.

The AcTutor sidebar shows the current problem, status, answer file, statement, notes, quick actions, and recent history. Write solutions in `main.py`.

Difficulty is fetched from AtCoder Problems during setup and stored in `problem.json` / `.actutor/history.json`. `AcTutor: Pick Problem` can list problems by difficulty range. `AcTutor: Pick Random Problem` selects one unsolved problem from a difficulty range.

Language support is currently Python only.

## Supported Scope

Current support is intentionally narrow.

- Judge: AtCoder only
- Solution language: Python only
- Local testing: sample download and sample test through `online-judge-tools`
- Difficulty data: AtCoder Problems public resources
- AI: prompt copy only; no AI API connection
- Submission: not supported
- Cloud sync: not supported

## Commands

- `AcTutor: Setup Problem`
- `AcTutor: Pick Problem`
- `AcTutor: Pick Random Problem`
- `AcTutor: Run Sample Tests`
- `AcTutor: Copy Hint Prompt`
- `AcTutor: Copy Review Prompt`
- `AcTutor: Copy Solution Prompt`
- `AcTutor: Mark as Solved`
- `AcTutor: Toggle Favorite`
- `AcTutor: Delete History Entry`
- `AcTutor: Open Notes`
- `AcTutor: Show History`
- `AcTutor: Show Favorites`
- `AcTutor: Show Unsolved Problems`
- `AcTutor: Open History Problem`
- `AcTutor: Open Favorite Problem`
- `AcTutor: Open Unsolved Problem`

## Install

AcTutor is not published to the VS Code Marketplace yet.

If a GitHub Release provides `actutor-*.vsix`, install it from VS Code:

1. Download `actutor-*.vsix` from the Release.
2. Open VS Code.
3. Open Extensions.
4. Select `...`.
5. Select `Install from VSIX...`.
6. Choose the downloaded VSIX.

If no Release asset is available yet, build the VSIX locally:

```bash
git clone https://github.com/necono-develop/AcTutor.git
cd AcTutor
npm install
npm run package
```

Then install the generated `actutor-*.vsix` from VS Code:

```text
Extensions -> ... -> Install from VSIX...
```

After installation, open a practice workspace folder and open the AcTutor sidebar.

## Requirements

AcTutor uses local Python and `online-judge-tools`.

```bash
pip3 install --user online-judge-tools
oj --version
```

If your environment manages Python packages differently, use an equivalent installation method as long as the `oj` command is available from VS Code.

Default settings:

```json
{
  "actutor.language": "python",
  "actutor.statementLanguage": "en",
  "actutor.promptLanguage": "en",
  "actutor.pythonCommand": "python3",
  "actutor.ojCommand": "oj"
}
```

On Windows, set `actutor.pythonCommand` to `python` if needed.

For Japanese statements and prompts:

```json
{
  "actutor.statementLanguage": "ja",
  "actutor.promptLanguage": "ja"
}
```

## Known Limitations

`Run Sample Tests` uses `online-judge-tools` sample comparison. For problems with multiple valid outputs or special judge behavior, a locally correct answer may still fail sample comparison if it differs from the sample output text. In that case, inspect the problem statement and judge requirements manually.

## First Use

1. Open a folder for practice.
2. Run `AcTutor: Pick Random Problem` or `AcTutor: Setup Problem`.
3. Write your solution in `main.py`.
4. Run `AcTutor: Run Sample Tests`.
5. Use `AcTutor: Copy Hint Prompt` or `AcTutor: Copy Review Prompt` when stuck.
6. Run `AcTutor: Mark as Solved` when finished.

## Development

```bash
npm install
npm run compile
```

Open this folder in VS Code and run the `Run Extension` launch configuration.

## Build VSIX

```bash
npm install
npm run preflight
npm run package
```

Install the generated `actutor-*.vsix` with `Extensions -> ... -> Install from VSIX...`.
