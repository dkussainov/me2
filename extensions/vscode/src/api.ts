import * as vscode from 'vscode';
import { getApiToken, getApiUrl, type IdeSource } from './config';

export interface IdeContext {
  file: string;
  line: number;
  repo: string;
  branch: string;
  snippet: string;
}

export interface TaskPayload {
  title: string;
  source: IdeSource;
  context: IdeContext;
}

export interface CreatedTask {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export class MissingTokenError extends Error {
  constructor() {
    super('ME2 API token is not set. Run "ME2: Set API Token" from the command palette.');
    this.name = 'MissingTokenError';
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function sendTask(
  context: vscode.ExtensionContext,
  payload: TaskPayload
): Promise<CreatedTask> {
  const token = await getApiToken(context);
  if (!token) throw new MissingTokenError();

  const url = `${getApiUrl()}/api/v1/tasks`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ApiError(
      response.status,
      `ME2 API returned ${response.status}: ${text || response.statusText}`
    );
  }

  return (await response.json()) as CreatedTask;
}
