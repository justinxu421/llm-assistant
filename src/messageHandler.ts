import * as vscode from "vscode";
import { ChatService } from "./chatService";
import { WebviewCommand, WebviewMessage } from "./types/chat";

export class MessageHandler {
  constructor(
    private readonly webview: vscode.Webview,
    private readonly chatService: ChatService
  ) {}

  async handleWebviewMessage(message: WebviewMessage): Promise<void> {
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
    try {
      const jsonMessage = JSON.parse(chunk);
      if (jsonMessage.type === "modelUpdate") {
        this.webview.postMessage({
          command: WebviewCommand.UpdateModel,
          model: jsonMessage.model,
        });
        return;
      } else if (jsonMessage.type === "temperatureUpdate") {
        this.webview.postMessage({
          command: WebviewCommand.UpdateTemperature,
          temperature: jsonMessage.temperature,
        });
        return;
      }
    } catch {
      this.webview.postMessage({
        command: WebviewCommand.StreamResponse,
        text: chunk,
      });
    }
  }
}
