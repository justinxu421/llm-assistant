import * as vscode from "vscode";
import { ChatService } from "./chatService";
import * as path from "path";
import * as fs from "fs";

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _chatService: ChatService;

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext
  ) {
    this._panel = panel;
    this._chatService = ChatService.getInstance(context);

    // Set initial HTML content
    this._panel.webview.html = this._getWebviewContent();

    // Load chat history
    this._loadChatHistory();

    // Subscribe to streaming responses
    this._chatService.onResponse((chunk) => {
      this._panel.webview.postMessage({
        command: "streamResponse",
        text: chunk,
      });
    });

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "sendMessage":
            await this._handleUserMessage(message.text);
            break;
          case "clearHistory":
            await this._chatService.clearHistory();
            this._panel.webview.postMessage({
              command: "clearMessages",
            });
            break;
        }
      },
      undefined,
      this._disposables
    );

    // Handle panel disposal
    this._panel.onDidDispose(
      () => {
        ChatPanel.currentPanel = undefined;
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(context: vscode.ExtensionContext) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "chatAssistant",
      "Chat Assistant",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "src")),
        ],
      }
    );

    ChatPanel.currentPanel = new ChatPanel(panel, context);
  }

  private async _handleUserMessage(text: string): Promise<void> {
    // Create a placeholder for the assistant's response
    this._panel.webview.postMessage({
      command: "startResponse",
    });

    // Process the message
    await this._chatService.processMessage(text);

    // Signal that the response is complete
    this._panel.webview.postMessage({
      command: "endResponse",
    });
  }

  private async _loadChatHistory() {
    const history = this._chatService.getHistory();
    for (const message of history) {
      this._panel.webview.postMessage({
        command: "receiveMessage",
        text: message.content,
        isUser: message.role === "user",
      });
    }
  }

  private _getWebviewContent(): string {
    const filePath = path.join(
      this._panel.webview.options.localResourceRoots![0].fsPath,
      "webview",
      "chat.html"
    );
    let html = fs.readFileSync(filePath, "utf8");

    // Make sure to get the correct URI for the webview
    const webview = this._panel.webview;

    // Replace any ${webview.cspSource} if you're using it in your HTML
    html = html.replace("${webview.cspSource}", webview.cspSource);

    return html;
  }
}
