# AGENTS.md

## Cursor Cloud specific instructions

This is a VS Code extension that wraps Ollama for a local LLM chat interface. See `README.md` for usage.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Compile | `npm run compile` |
| Lint | `npm run lint` |
| Test | `xvfb-run npm test` |
| Watch mode | `npm run watch` |

### Running the extension

Launch via the VS Code Extension Development Host (F5 in VS Code, or `Run Extension` launch config). The extension registers command `LLM Assistant Ollama: Open Chat Assistant` (`Ctrl+Shift+I`).

### Ollama dependency

The extension requires a running Ollama server at `http://localhost:11434`. To set up:

```
ollama serve &
ollama pull llama3.2:1b
ollama cp llama3.2:1b llama3.2
```

The `:1b` variant is sufficient for CPU-only environments. The extension expects models named `llama3.2`, `deepseek-r1`, or `mistral`.

### Testing notes

- Tests require a display or `xvfb-run` in headless environments (already installed).
- The test suite uses `@vscode/test-electron` which downloads VS Code automatically on first run. Subsequent runs use the cached copy in `.vscode-test/`.
- DBus warnings in test output are harmless and expected in containerized environments.
