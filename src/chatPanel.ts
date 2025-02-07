import * as vscode from "vscode";
import { ChatService } from "./chatService";

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
    return /*html*/ `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { 
                    margin: 0; 
                    padding: 10px; 
                    font-family: sans-serif;
                    height: 100vh;
                    box-sizing: border-box;
                }
                #chat-container {
                    display: flex;
                    flex-direction: column;
                    height: calc(100% - 20px); /* Account for body padding */
                    max-height: 100%;
                }
                #messages {
                    flex: 1;
                    overflow-y: auto;
                    margin-bottom: 10px;
                    padding-right: 10px;
                }
                .message {
                    margin: 5px 0;
                    padding: 8px;
                    border-radius: 5px;
                    word-wrap: break-word;
                }
                .user-message {
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .assistant-message {
                    background-color: var(--vscode-editor-selectionBackground);
                    color: var(--vscode-editor-foreground);
                }
                #input-container {
                    display: flex;
                    gap: 5px;
                    padding: 10px 0;
                }
                #message-input {
                    flex: 1;
                    padding: 5px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                }
                button {
                    padding: 5px 10px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    cursor: pointer;
                }
                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                #clear-history {
                    margin-bottom: 10px;
                    background-color: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                .loading-indicator {
                    display: inline-block;
                    margin-left: 5px;
                    width: 12px;
                    height: 12px;
                    border: 2px solid var(--vscode-editor-foreground);
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                .message.loading {
                    display: flex;
                    align-items: center;
                    background-color: var(--vscode-editor-selectionBackground);
                    color: var(--vscode-editor-foreground);
                }
                .message.loading::after {
                    content: "Thinking";
                    animation: dots 1.5s steps(4, end) infinite;
                }
                @keyframes dots {
                    0%, 20% { content: "Thinking"; }
                    40% { content: "Thinking."; }
                    60% { content: "Thinking.."; }
                    80%, 100% { content: "Thinking..."; }
                }
            </style>
        </head>
        <body>
            <div id="chat-container">
                <button id="clear-history">Clear History</button>
                <div id="messages"></div>
                <div id="input-container">
                    <input type="text" id="message-input" placeholder="Type your message...">
                    <button id="send-button">Send</button>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const messagesContainer = document.getElementById('messages');
                const messageInput = document.getElementById('message-input');
                const sendButton = document.getElementById('send-button');
                const clearHistoryButton = document.getElementById('clear-history');
                
                let currentResponseDiv = null;
                let loadingDiv = null;
                let isWaitingForResponse = false;

                function setInputState(enabled) {
                    messageInput.disabled = !enabled;
                    sendButton.disabled = !enabled;
                    isWaitingForResponse = !enabled;
                }

                function addMessage(text, isUser) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${isUser ? 'user-message' : 'assistant-message'}\`;
                    messageDiv.textContent = text;
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    return messageDiv;
                }

                function addLoadingMessage() {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message loading';
                    messagesContainer.appendChild(messageDiv);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    return messageDiv;
                }

                function sendMessage() {
                    const text = messageInput.value.trim();
                    if (text && !isWaitingForResponse) {
                        addMessage(text, true);
                        setInputState(false);
                        vscode.postMessage({
                            command: 'sendMessage',
                            text: text
                        });
                        messageInput.value = '';
                    }
                }

                clearHistoryButton.addEventListener('click', () => {
                    if (!isWaitingForResponse) {
                        vscode.postMessage({
                            command: 'clearHistory'
                        });
                    }
                });

                sendButton.addEventListener('click', sendMessage);
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !isWaitingForResponse) {
                        sendMessage();
                    }
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'startResponse':
                            if (loadingDiv) {
                                loadingDiv.remove();
                            }
                            loadingDiv = addLoadingMessage();
                            currentResponseDiv = null; // Reset currentResponseDiv
                            break;
                            
                        case 'streamResponse':
                            if (loadingDiv) {
                                loadingDiv.remove();
                                loadingDiv = null;
                            }
                            if (!currentResponseDiv) {
                                currentResponseDiv = addMessage('', false);
                            }
                            currentResponseDiv.textContent += message.text;
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            break;
                            
                        case 'endResponse':
                            if (loadingDiv) {
                                loadingDiv.remove();
                                loadingDiv = null;
                            }
                            currentResponseDiv = null;
                            setInputState(true);
                            break;
                            
                        case 'clearMessages':
                            messagesContainer.innerHTML = '';
                            currentResponseDiv = null;
                            loadingDiv = null;
                            break;
                            
                        case 'receiveMessage':
                            addMessage(message.text, message.isUser);
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
  }
}
