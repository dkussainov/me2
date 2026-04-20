import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { ApiError, MissingTokenError, sendTask, type IdeContext, type TaskPayload } from './api';
import { clearApiToken, detectSource, setApiToken } from './config';

const MAX_SNIPPET_LENGTH = 2000;
const MAX_TITLE_LENGTH = 500;

async function readGitBranch(workspaceRoot: string): Promise<string> {
  try {
    const headPath = path.join(workspaceRoot, '.git', 'HEAD');
    const head = await fs.readFile(headPath, 'utf8');
    const match = /^ref: refs\/heads\/(.+)$/m.exec(head.trim());
    if (match?.[1]) return match[1];
    return head.trim().slice(0, 12);
  } catch {
    return 'unknown';
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max);
}

async function buildContext(editor: vscode.TextEditor): Promise<{
  title: string;
  context: IdeContext;
}> {
  const document = editor.document;
  const selection = editor.selection;
  const hasSelection = !selection.isEmpty;
  const selectedText = hasSelection
    ? document.getText(selection)
    : document.lineAt(selection.active.line).text;

  const line = (hasSelection ? selection.start.line : selection.active.line) + 1;

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const workspaceRoot = workspaceFolder?.uri.fsPath ?? path.dirname(document.uri.fsPath);
  const relativeFile = workspaceFolder
    ? path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
    : path.basename(document.uri.fsPath);
  const repo = workspaceFolder?.name ?? path.basename(workspaceRoot);
  const branch = await readGitBranch(workspaceRoot);

  const snippet = truncate(selectedText.trim(), MAX_SNIPPET_LENGTH);
  const firstLine = snippet.split(/\r?\n/)[0]?.trim() ?? '';
  const fallbackTitle = `${path.basename(relativeFile)}:${line}`;
  const title = truncate(firstLine.length > 0 ? firstLine : fallbackTitle, MAX_TITLE_LENGTH);

  return {
    title,
    context: {
      file: relativeFile,
      line,
      repo,
      branch,
      snippet,
    },
  };
}

async function handleSendToInbox(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('ME2: Open a file and place your cursor before sending.');
    return;
  }

  try {
    const { title, context: ideContext } = await buildContext(editor);
    const payload: TaskPayload = {
      title,
      source: detectSource(),
      context: ideContext,
    };

    const created = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'ME2: Sending to inbox…' },
      () => sendTask(context, payload)
    );

    void vscode.window.showInformationMessage(`ME2: Sent "${created.title}" to inbox.`);
  } catch (err) {
    if (err instanceof MissingTokenError) {
      const action = await vscode.window.showErrorMessage(err.message, 'Set Token');
      if (action === 'Set Token') {
        await vscode.commands.executeCommand('me2.setApiToken');
      }
      return;
    }
    if (err instanceof ApiError) {
      void vscode.window.showErrorMessage(err.message);
      return;
    }
    const message = err instanceof Error ? err.message : 'unknown error';
    void vscode.window.showErrorMessage(`ME2: Failed to send task — ${message}`);
  }
}

async function handleSetApiToken(context: vscode.ExtensionContext): Promise<void> {
  const token = await vscode.window.showInputBox({
    title: 'ME2 API Token',
    prompt: 'Paste your ME2 API token. It is stored in the OS keychain via SecretStorage.',
    password: true,
    ignoreFocusOut: true,
    placeHolder: 'me2_pat_…',
    validateInput: (value) => (value.trim().length === 0 ? 'Token cannot be empty.' : undefined),
  });
  if (!token) return;
  await setApiToken(context, token.trim());
  void vscode.window.showInformationMessage('ME2: API token saved to SecretStorage.');
}

async function handleClearApiToken(context: vscode.ExtensionContext): Promise<void> {
  await clearApiToken(context);
  void vscode.window.showInformationMessage('ME2: API token cleared.');
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('me2.sendToInbox', () => handleSendToInbox(context)),
    vscode.commands.registerCommand('me2.setApiToken', () => handleSetApiToken(context)),
    vscode.commands.registerCommand('me2.clearApiToken', () => handleClearApiToken(context))
  );
}

export function deactivate(): void {}
