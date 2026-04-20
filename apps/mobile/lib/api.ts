import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'me2.session.token';
const FALLBACK_API_URL = 'http://192.168.72.126:3000';

export function isDev(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

function resolveApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured && configured.length > 0) return configured.replace(/\/+$/, '');
  return FALLBACK_API_URL;
}

export const API_URL: string = resolveApiUrl();

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch<T>(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`api_error_${res.status}: ${body || res.statusText}`);
  }
  return (await res.json()) as T;
}
