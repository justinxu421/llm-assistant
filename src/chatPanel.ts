import * as vscode from "vscode";
import { ChatService } from "./chatService";
import { MessageHandler } from "./messageHandler";
import { WebviewCommand } from "./types/chat";
import * as path from "path";
import * as fs from "fs";

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _chatService: ChatService;
  private readonly _messageHandler: MessageHandler;
  private readonly _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, chatService: ChatService) {
    this._panel = panel;
    this._chatService = chatService;
    this._messageHandler = new MessageHandler(
      this._panel.webview,
      this._chatService
    );

    this.initialize();

    // Handle panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static async createOrShow(
    context: vscode.ExtensionContext
  ): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create a new panel
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

    // Initialize ChatService first
    const chatService = await ChatService.createInstance(context);
    ChatPanel.currentPanel = new ChatPanel(panel, chatService);
  }

  private initialize(): void {
    this._panel.webview.html = this._getWebviewContent();
    this._loadChatHistory();
    this.initializeModelDisplay();
    this.setupEventListeners();
  }

  private initializeModelDisplay(): void {
    this._panel.webview.postMessage({
      command: WebviewCommand.UpdateModel,
      model: this._chatService.getCurrentModel(),
    });
    this._panel.webview.postMessage({
      command: WebviewCommand.UpdateTemperature,
      temperature: this._chatService.getTemperature(),
    });
  }

  private setupEventListeners(): void {
    // Listen to chat service responses
    this._chatService.onResponse((chunk) => {
      if (this._panel && this._panel.webview) {
        this._messageHandler.handleStreamResponse(chunk);
      }
    });

    // Listen to webview messages
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        await this._messageHandler.handleWebviewMessage(message);
      },
      undefined,
      this._disposables
    );
  }

  private async _loadChatHistory(): Promise<void> {
    const history = this._chatService.getFormattedHistory();
    for (const message of history) {
      this._panel.webview.postMessage({
        command: WebviewCommand.ReceiveMessage,
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

    try {
      let html = fs.readFileSync(filePath, "utf8");
      return html;
    } catch (error) {
      console.error(`Failed to read chat.html: ${error}`);
      return `<html><body>Failed to load chat interface</body></html>`;
    }
  }

  public dispose(): void {
    ChatPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    // Dispose all disposables
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
