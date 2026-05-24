import * as assert from "assert";
import * as vscode from "vscode";
import {
  EditorContextPart,
  formatEditorContextPrompt,
  getEditorContextPartsFromEditor,
  MAX_FILE_CONTEXT_CHARS,
} from "../editorContext";

function createMockEditor(options: {
  filePath: string;
  languageId: string;
  fullText: string;
  selectionStart: number;
  selectionEnd: number;
}): vscode.TextEditor {
  const document = {
    uri: vscode.Uri.file(`/workspace/${options.filePath}`),
    languageId: options.languageId,
    getText: (range?: vscode.Range | vscode.Selection) => {
      if (!range) {
        return options.fullText;
      }
      const start = range.start;
      const end = range.end;
      if (start.line === 0 && end.line === 0) {
        return options.fullText.slice(start.character, end.character);
      }
      return options.fullText;
    },
  } as vscode.TextDocument;

  const selection = new vscode.Selection(
    new vscode.Position(0, options.selectionStart),
    new vscode.Position(0, options.selectionEnd)
  );

  return {
    document,
    selection,
  } as vscode.TextEditor;
}

suite("editorContext", () => {
  test("formatEditorContextPrompt returns user message when no parts", () => {
    assert.strictEqual(
      formatEditorContextPrompt([], "What does this do?"),
      "What does this do?"
    );
  });

  test("formatEditorContextPrompt wraps parts and user question", () => {
    const parts: EditorContextPart[] = [
      {
        kind: "selection",
        filePath: "src/foo.ts",
        languageId: "typescript",
        content: "const x = 1;",
        truncated: false,
      },
    ];
    const result = formatEditorContextPrompt(parts, "Explain this");
    assert.ok(result.includes("[Editor context — selection]"));
    assert.ok(result.includes("File: src/foo.ts"));
    assert.ok(result.includes("const x = 1;"));
    assert.ok(result.includes("User question:\nExplain this"));
  });

  test("getEditorContextPartsFromEditor returns selection part", () => {
    const editor = createMockEditor({
      filePath: "src/foo.ts",
      languageId: "typescript",
      fullText: "const x = 1;",
      selectionStart: 6,
      selectionEnd: 7,
    });

    const parts = getEditorContextPartsFromEditor(editor, {
      includeSelection: true,
    });
    assert.strictEqual(parts.length, 1);
    assert.strictEqual(parts[0].kind, "selection");
    assert.ok(parts[0].content.length > 0);
  });

  test("getEditorContextPartsFromEditor truncates large file content", () => {
    const editor = createMockEditor({
      filePath: "big.txt",
      languageId: "plaintext",
      fullText: "a".repeat(MAX_FILE_CONTEXT_CHARS + 100),
      selectionStart: 0,
      selectionEnd: 0,
    });

    const parts = getEditorContextPartsFromEditor(editor, { includeFile: true });
    assert.strictEqual(parts.length, 1);
    assert.strictEqual(parts[0].truncated, true);
    assert.ok(parts[0].content.includes("truncated"));
  });

  test("getEditorContextPartsFromEditor skips empty selection", () => {
    const editor = createMockEditor({
      filePath: "src/foo.ts",
      languageId: "typescript",
      fullText: "hello",
      selectionStart: 0,
      selectionEnd: 0,
    });

    const parts = getEditorContextPartsFromEditor(editor, {
      includeSelection: true,
    });
    assert.strictEqual(parts.length, 0);
  });
});
