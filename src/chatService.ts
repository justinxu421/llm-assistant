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

  private formatMessage(message: ChatMessage): string {
    const prefix = message.role === "user" ? "🧑 You:" : "🤖 Assistant:";
    return `${prefix} ${message.content}`;
  }

  private async generateResponse(userMessage: string): Promise<string> {
    const activeEditor = vscode.window.activeTextEditor;
    const currentFile = activeEditor?.document.getText() || "";
    const currentLanguage = activeEditor?.document.languageId || "";
    let responseText = "";
    let isInCodeBlock = false;
    let codeBlockLanguage = "";
    let codeBlockContent = "";

    try {
      const messages = this.history.map((msg) => ({
        role: msg.role,
        content: this.formatMessage(msg),
      }));

      messages.push({ role: "user", content: this.formatMessage({ role: "user", content: userMessage }) });

      const streamResponse = await ollama.chat({
        model: "llama3.2",
        messages: messages,
        stream: true,
      });

      for await (const part of streamResponse) {
        const chunk = part.message.content;
        
        // Handle code block detection
        if (chunk.includes("```")) {
          const codeBlockMatch = chunk.match(/```(\w*)/);
          if (codeBlockMatch) {
            isInCodeBlock = !isInCodeBlock;
            if (isInCodeBlock) {
              codeBlockLanguage = codeBlockMatch[1];
              codeBlockContent = "";
              responseText += `\n\`\`\`${codeBlockLanguage}\n`;
            } else {
              responseText += `${codeBlockContent}\n\`\`\`\n`;
            }
            continue;
          }
        }

        if (isInCodeBlock) {
          codeBlockContent += chunk;
        } else {
          // Format regular text with markdown
          const formattedChunk = this.formatTextChunk(chunk);
          responseText += formattedChunk;
        }
        
        this.responseEmitter.fire(chunk);
      }
      return responseText;
    } catch (err) {
      console.error("Error generating response:", err);
      return "Sorry, I encountered an error generating a response.";
    }
  }

  private formatTextChunk(chunk: string): string {
    let formatted = chunk;

    // Add proper spacing for markdown elements
    formatted = formatted
      // Headers
      .replace(/^(#{1,6})\s/gm, "\n$1 ")
      // Bullet points
      .replace(/^[-*•]\s/gm, "\n• ")
      // Numbered lists
      .replace(/^\d+\.\s/gm, (match) => `\n${match}`)
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, "**$1**")
      // Italic text
      .replace(/\*(.*?)\*/g, "_$1_")
      // Inline code
      .replace(/`([^`]+)`/g, "`$1`");

    return formatted;
  }

  public getFormattedHistory(): ChatMessage[] {
    return this.history.map(msg => ({
      role: msg.role,
      content: this.formatMessage(msg)
    }));
  }

  public getHistory(): ChatMessage[] {
    return [...this.history];
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    await this.saveHistory();
  }
}
