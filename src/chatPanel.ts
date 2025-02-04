import * as vscode from "vscode";

export class ChatPanel {
  public static currentPanel: ChatPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent();

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "sendMessage":
            // Handle the message here
            const response = await this._handleUserMessage(message.text);
            // Send response back to webview
            this._panel.webview.postMessage({
              command: "receiveMessage",
              text: response,
            });
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  public static createOrShow() {
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
      }
    );

    ChatPanel.currentPanel = new ChatPanel(panel);
  }

  private async _handleUserMessage(text: string): Promise<string> {
    // TODO: Implement actual chat logic here
    return `Echo: ${text}`;
  }

  private _getWebviewContent() {
    return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        margin: 0; 
                        padding: 10px; 
                        font-family: sans-serif;
                    }
                    #chat-container {
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                    }
                    #messages {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 10px;
                    }
                    .message {
                        margin: 5px;
                        padding: 8px;
                        border-radius: 5px;
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
                </style>
            </head>
            <body>
                <div id="chat-container">
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

                    function addMessage(text, isUser) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = \`message \${isUser ? 'user-message' : 'assistant-message'}\`;
                        messageDiv.textContent = text;
                        messagesContainer.appendChild(messageDiv);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }

                    function sendMessage() {
                        const text = messageInput.value.trim();
                        if (text) {
                            addMessage(text, true);
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: text
                            });
                            messageInput.value = '';
                        }
                    }

                    sendButton.addEventListener('click', sendMessage);
                    messageInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            sendMessage();
                        }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'receiveMessage':
                                addMessage(message.text, false);
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
  }
}
