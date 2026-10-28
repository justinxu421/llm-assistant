# LLM-assistant README

LLM-Assistant project to implement a basic chat interface wrapping an Ollama LLM.

## How to use

1. Press `Command + Shift + P` and select `LLM Assistant Ollama: Open Chat Assistant` to bring up the chat interface

   (or the keyboard shortcut `Ctrl+Shift+I` / `Cmd+Shift+I` on Mac)

   <img width="725" alt="image" src="https://github.com/user-attachments/assets/4b9bb3b4-5312-44ee-b9c6-695caa54b3c1" />

2. Ability to select ollama model to use
   <img width="766" alt="image" src="https://github.com/user-attachments/assets/54b278c2-b690-41cf-a8d5-70eb811ed1bb" />

3. Chat with the assistant
   <img width="1395" alt="image" src="https://github.com/user-attachments/assets/fa4cf3f2-116f-401f-a610-a4cd8e13ed46" />

4. Press `Clear History` when you're done

## Development checks

Use Node.js 22.12 or newer and install with `npm ci`. Run `npm test` for
TypeScript compilation, lint, and the VS Code extension tests. On headless Linux,
run `xvfb-run -a npm test`. `npm audit` includes development dependencies.

The test CLI currently requires Mocha 11, which retains a vulnerable serializer.
The override scopes Mocha 12 to `@vscode/test-cli`; it retains the Mocha test API
and resolves current serializer and diff advisories. Remove the override once
the CLI supports the patched Mocha version directly.
