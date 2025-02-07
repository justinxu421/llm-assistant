import * as vscode from "vscode";
import ollama from "ollama";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class ChatService {
  private static instance: ChatService;
  private history: ChatMessage[] = [];
  private context: vscode.ExtensionContext;
  private responseEmitter: vscode.EventEmitter<string> =
    new vscode.EventEmitter<string>();

  public readonly onResponse: vscode.Event<string> = this.responseEmitter.event;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadHistory();
  }

  public static getInstance(context: vscode.ExtensionContext): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService(context);
    }
    return ChatService.instance;
  }

  private loadHistory() {
    this.history = this.context.globalState.get<ChatMessage[]>(
      "chatHistory",
      []
    );
  }

  private async saveHistory() {
    await this.context.globalState.update("chatHistory", this.history);
  }

  public async processMessage(userMessage: string): Promise<string> {
    try {
      // Add user message to history
      this.history.push({ role: "user", content: userMessage });

      // Process the message and generate a response
      const response = await this.generateResponse(userMessage);

      // Add assistant response to history
      this.history.push({ role: "assistant", content: response });

      // Save the updated history
      await this.saveHistory();

      return response;
    } catch (error) {
      console.error("Error processing message:", error);
      return "Sorry, I encountered an error processing your message.";
    }
  }

  private async generateResponse(userMessage: string): Promise<string> {
    const activeEditor = vscode.window.activeTextEditor;
    const currentFile = activeEditor?.document.getText() || "";
    const currentLanguage = activeEditor?.document.languageId || "";
    let responseText = "";

    try {
      const streamResponse = await ollama.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: userMessage }],
        stream: true,
      });

      for await (const part of streamResponse) {
        const chunk = part.message.content;
        responseText += chunk;
        this.responseEmitter.fire(chunk);
      }
      return responseText;
    } catch (err) {
      console.error("Error generating response:", err);
      return "Sorry, I encountered an error generating a response.";
    }
  }

  public getHistory(): ChatMessage[] {
    return [...this.history];
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    await this.saveHistory();
  }
}
