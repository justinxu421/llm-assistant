export enum WebviewCommand {
  SendMessage = 'sendMessage',
  ClearHistory = 'clearHistory',
  ChangeModel = 'changeModel',
  StreamResponse = 'streamResponse',
  StartResponse = 'startResponse',
  EndResponse = 'endResponse',
  UpdateModel = 'updateModel',
  UpdateTemperature = 'updateTemperature',
  ClearMessages = 'clearMessages',
  ReceiveMessage = 'receiveMessage'
}

export interface WebviewMessage {
  command: WebviewCommand;
  text?: string;
  model?: string;
  temperature?: number;
  isUser?: boolean;
}

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
}
