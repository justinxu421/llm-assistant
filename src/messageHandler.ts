import * as vscode from "vscode";
import { ChatService } from "./chatService";
import { WebviewCommand, WebviewMessage } from "./types/chat";

export class MessageHandler {
  private _isDisposed: boolean = false;

  constructor(
    private readonly webview: vscode.Webview,
    private readonly chatService: ChatService
  ) {}

  dispose() {
    this._isDisposed = true;
  }

  async handleWebviewMessage(message: WebviewMessage): Promise<void> {
    if (this._isDisposed) {
      return;
    }

    switch (message.command) {
      case WebviewCommand.SendMessage:
        if (message.text) {
          await this.handleUserMessage(message.text);
        }
        break;
      case WebviewCommand.ClearHistory:
        await this.handleClearHistory();
        break;
      case WebviewCommand.ChangeModel:
        await this.chatService.changeModel();
        break;
      case WebviewCommand.UpdateTemperature:
        if (message.temperature) {
          await this.chatService.updateTemperature(message.temperature);
        }
        break;
    }
  }

  private async handleUserMessage(text: string): Promise<void> {
    this.webview.postMessage({
      command: WebviewCommand.StartResponse,
    });

    await this.chatService.processMessage(text);

    this.webview.postMessage({
      command: WebviewCommand.EndResponse,
    });
  }

  private async handleClearHistory(): Promise<void> {
    await this.chatService.clearHistory();
    this.webview.postMessage({
      command: WebviewCommand.ClearMessages,
    });
  }

  handleStreamResponse(chunk: string): void {
    if (this._isDisposed) {
      return;
    }

    try {
      const jsonMessage = JSON.parse(chunk);
      if (jsonMessage.type === "modelUpdate") {
        this.webview
          .postMessage({
            command: WebviewCommand.UpdateModel,
            model: jsonMessage.model,
          })
          .then(undefined, () => {
            /* ignore post message errors */
          });
        return;
      } else if (jsonMessage.type === "temperatureUpdate") {
        this.webview
          .postMessage({
            command: WebviewCommand.UpdateTemperature,
            temperature: jsonMessage.temperature,
          })
          .then(undefined, () => {
            /* ignore post message errors */
          });
        return;
      }
    } catch {
      this.webview
        .postMessage({
          command: WebviewCommand.StreamResponse,
          text: chunk,
        })
        .then(undefined, () => {
          /* ignore post message errors */
        });
    }
  }
}
