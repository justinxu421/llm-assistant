// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "llm-assistant" is now active!');

  // Existing hello world command
  let helloWorld = vscode.commands.registerCommand(
    "llm-assistant.greet",
    () => {
      vscode.window.showInformationMessage("Hello World from llm-assistant!");
    }
  );

  // New command
  let newCommand = vscode.commands.registerCommand(
    "llm-assistant.newCommand",
    () => {
      // Your command implementation here
      vscode.window.showInformationMessage("Executed new command!");
    }
  );

  // Register both commands
  context.subscriptions.push(helloWorld);
  context.subscriptions.push(newCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
