import * as vscode from "vscode";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class ChatService {
  private static instance: ChatService;
  private history: ChatMessage[] = [];
  private context: vscode.ExtensionContext;

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
    // Get the current file if any
    const activeEditor = vscode.window.activeTextEditor;
    const currentFile = activeEditor?.document.getText() || "";
    const currentLanguage = activeEditor?.document.languageId || "";

    // Simple rule-based responses
    const messageLower = userMessage.toLowerCase();

    if (messageLower.includes("hello") || messageLower.includes("hi")) {
      return "Hello! How can I help you with your code today?";
    }

    if (messageLower.includes("current file")) {
      if (currentFile) {
        return `The current file is written in ${currentLanguage} and is ${currentFile.length} characters long.`;
      } else {
        return "No file is currently open in the editor.";
      }
    }

    if (messageLower.includes("help")) {
      return `I can help you with:
1. Answering questions about your code
2. Explaining programming concepts
3. Providing code suggestions
4. Analyzing your current file
What would you like to know more about?`;
    }

    if (messageLower.includes("clear history")) {
      this.history = [];
      await this.saveHistory();
      return "Chat history has been cleared.";
    }

    // Context-aware response based on recent conversation
    const recentMessages = this.history.slice(-4);
    if (recentMessages.length > 0) {
      const lastAssistantMessage = recentMessages
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistantMessage && messageLower.includes("explain")) {
        return `Let me clarify my previous response: ${lastAssistantMessage.content}\n\nIs there something specific you'd like me to explain further?`;
      }
    }

    // Code-related queries
    if (
      messageLower.includes("code") ||
      messageLower.includes("function") ||
      messageLower.includes("bug")
    ) {
      if (currentFile) {
        return `I see you're working with ${currentLanguage} code. Could you specify what aspect you need help with? For example:
- Code review
- Bug finding
- Performance optimization
- Best practices`;
      }
    }

    // Default response with conversation context
    return `I understand you're asking about "${userMessage}". Could you provide more context or specify your question? I'm here to help with coding and development tasks.`;
  }

  public getHistory(): ChatMessage[] {
    return [...this.history];
  }

  public async clearHistory(): Promise<void> {
    this.history = [];
    await this.saveHistory();
  }
}
