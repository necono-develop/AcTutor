# AcTutor

AcTutor は AtCoder の練習を VS Code 上で進めるための拡張機能です。

AcTutor は非公式ツールです。AtCoder、AtCoder Problems、online-judge-tools とは提携・公認・後援関係にありません。利用時は各コンテストサイトのルールに従ってください。特に開催中コンテストでAI補助を使う場合は注意してください。

## Contest Notice

開催中コンテストで AcTutor を使う前に、そのコンテストのルールを必ず確認してください。コンテストによっては、外部ツール、AI補助、生成されたヒント、コピーしたプロンプト、ダウンロードしたサンプルの扱いなどが制限または禁止されている場合があります。

AcTutor は練習と学習のためのツールです。AIプロンプト機能は既定では直接解答を出さない設計ですが、それだけで開催中コンテストで許可されるとは限りません。判断に迷う場合、コンテスト中はAI関連機能を使わないでください。

この拡張機能をどのように使うか、各コンテストプラットフォームのルールを守るかは利用者自身の責任です。

## 対応範囲

現在の対応範囲は意図的に絞っています。

- ジャッジ: AtCoder のみ
- 解答言語: Python のみ
- ローカルテスト: `online-judge-tools` によるサンプル取得とサンプルテスト
- Difficulty: AtCoder Problems の公開リソース
- AI: プロンプトのコピーのみ。AI API接続はしない
- 提出: 非対応
- クラウド同期: 非対応

## 日本語の問題文とプロンプトを使う

既定では、今後 Codeforces や yukicoder などへ広げやすいように問題文とAIプロンプトの言語は英語です。

日本語で使いたい場合は VS Code の設定JSONに以下を追加してください。

```json
{
  "actutor.statementLanguage": "ja",
  "actutor.promptLanguage": "ja"
}
```

意味:

- `actutor.statementLanguage`: 問題文を取得するときの優先言語
- `actutor.promptLanguage`: AI相談プロンプトの言語
- `actutor.language`: 解答コードの言語。現在は `python` のみ

## インストール

AcTutor はまだ VS Code Marketplace には公開していません。

GitHub Release に `actutor-*.vsix` がある場合は、VS Codeからインストールできます。

1. Release から `actutor-*.vsix` をダウンロード
2. VS Code を開く
3. Extensions を開く
4. `...` を押す
5. `Install from VSIX...` を選ぶ
6. ダウンロードしたVSIXを選ぶ

ReleaseにVSIXがない場合は、ローカルでVSIXを作成してください。

```bash
git clone https://github.com/necono-develop/AcTutor.git
cd AcTutor
npm install
npm run package
```

生成された `actutor-*.vsix` を VS Code でインストールします。

```text
Extensions -> ... -> Install from VSIX...
```

## 必要なもの

Python と `online-judge-tools` が必要です。

```bash
pip3 install --user online-judge-tools
oj --version
```

Pythonパッケージ管理方法が異なる環境では、VS Code から `oj` コマンドを実行できる状態になっていれば問題ありません。

Windowsでは必要に応じて以下を設定してください。

```json
{
  "actutor.pythonCommand": "python"
}
```

## 既知の制限

`Run Sample Tests` は `online-judge-tools` のサンプル比較を使います。出力が一意でない問題やスペシャルジャッジ相当の問題では、ローカルでは正しい出力でも、サンプル出力の文字列と違うためWAに見える場合があります。その場合は問題文の判定条件を確認してください。

## 最初の使い方

1. 練習用のフォルダをVS Codeで開く
2. AcTutorサイドバーを開く
3. `Pick Random Problem` または `Setup Problem` を実行
4. `main.py` に解答を書く
5. `Run Sample Tests` を実行
6. 詰まったら `Copy Hint Prompt` または `Copy WA Review Prompt` を使う
7. 解けたら `Mark as Solved` を実行

解答や実装例を含む復習用プロンプトが必要な場合は `Copy Solution Prompt` を使えます。履歴では進捗、Favorite、未解決問題、AIプロンプト利用回数、Solution Promptの利用有無を確認できます。不要な履歴は `Delete History Entry` で削除できます。
