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
  ReceiveMessage = 'receiveMessage',
  ContextStatus = 'contextStatus',
}

export interface EditorContextStatus {
  hasActiveEditor: boolean;
  hasSelection: boolean;
  filePath?: string;
  selectionLineCount?: number;
}

export interface WebviewMessage {
  command: WebviewCommand;
  text?: string;
  model?: string;
  temperature?: number;
  isUser?: boolean;
  includeSelection?: boolean;
  includeFile?: boolean;
  context?: EditorContextStatus;
}

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
}
