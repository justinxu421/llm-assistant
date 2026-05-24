import * as vscode from "vscode";

export const MAX_FILE_CONTEXT_CHARS = 32768;

export type EditorContextKind = "selection" | "file";

export interface EditorContextPart {
  kind: EditorContextKind;
  filePath: string;
  languageId: string;
  content: string;
  truncated: boolean;
}

export interface EditorContextOptions {
  includeSelection?: boolean;
  includeFile?: boolean;
}

export interface EditorContextAvailability {
  hasActiveEditor: boolean;
  hasSelection: boolean;
  filePath?: string;
  selectionLineCount?: number;
}

function truncateContent(
  content: string,
  maxChars: number
): { content: string; truncated: boolean } {
  if (content.length <= maxChars) {
    return { content, truncated: false };
  }
  const truncatedContent = content.slice(0, maxChars);
  return {
    content: `${truncatedContent}\n\n[... truncated — content exceeded ${maxChars} characters]`,
    truncated: true,
  };
}

function getActiveEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor;
}

export function getEditorContextAvailability(): EditorContextAvailability {
  const editor = getActiveEditor();
  if (!editor) {
    return { hasActiveEditor: false, hasSelection: false };
  }

  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;
  const selectionLineCount = hasSelection
    ? selection.end.line - selection.start.line + 1
    : 0;

  return {
    hasActiveEditor: true,
    hasSelection,
    filePath: vscode.workspace.asRelativePath(editor.document.uri),
    selectionLineCount,
  };
}

export function getEditorContextPartsFromEditor(
  editor: vscode.TextEditor | undefined,
  options: EditorContextOptions
): EditorContextPart[] {
  if (!editor) {
    return [];
  }

  const { document, selection } = editor;
  const filePath = vscode.workspace.asRelativePath(document.uri);
  const languageId = document.languageId;
  const parts: EditorContextPart[] = [];

  if (options.includeSelection && !selection.isEmpty) {
    const raw = document.getText(selection);
    const { content, truncated } = truncateContent(raw, MAX_FILE_CONTEXT_CHARS);
    parts.push({
      kind: "selection",
      filePath,
      languageId,
      content,
      truncated,
    });
  }

  if (options.includeFile) {
    const raw = document.getText();
    const { content, truncated } = truncateContent(raw, MAX_FILE_CONTEXT_CHARS);
    parts.push({
      kind: "file",
      filePath,
      languageId,
      content,
      truncated,
    });
  }

  return parts;
}

export function getEditorContextParts(
  options: EditorContextOptions
): EditorContextPart[] {
  return getEditorContextPartsFromEditor(getActiveEditor(), options);
}

export function formatEditorContextPrompt(
  parts: EditorContextPart[],
  userMessage: string
): string {
  if (parts.length === 0) {
    return userMessage;
  }

  const blocks = parts.map((part) => {
    const kindLabel = part.kind === "selection" ? "selection" : "file";
    return `[Editor context — ${kindLabel}]
File: ${part.filePath}
Language: ${part.languageId}
--- ${kindLabel} ---
${part.content}`;
  });

  return `${blocks.join("\n\n")}

---
User question:
${userMessage}`;
}
