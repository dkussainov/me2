import * as vscode from 'vscode';

export type IdeSource = 'vscode' | 'cursor' | 'windsurf';

const DEFAULT_API_URL = 'https://me2.vercel.app';
const TOKEN_SECRET_KEY = 'me2.apiToken';

export function getApiUrl(): string {
  const configured = vscode.workspace.getConfiguration('me2').get<string>('apiUrl');
  const trimmed = configured?.trim();
  const base = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_API_URL;
  return base.replace(/\/+$/, '');
}

export async function getApiToken(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(TOKEN_SECRET_KEY);
}

export async function setApiToken(
  context: vscode.ExtensionContext,
  token: string
): Promise<void> {
  await context.secrets.store(TOKEN_SECRET_KEY, token);
}

export async function clearApiToken(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(TOKEN_SECRET_KEY);
}

export function detectSource(): IdeSource {
  const appName = (vscode.env.appName ?? '').toLowerCase();
  if (appName.includes('cursor')) return 'cursor';
  if (appName.includes('windsurf')) return 'windsurf';
  return 'vscode';
}
