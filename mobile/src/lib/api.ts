import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL.
 * - Set EXPO_PUBLIC_API_URL for production (e.g. https://api.sra.so).
 * - In development we reuse the IP of the computer running `expo start`,
 *   so a real phone on the same Wi-Fi reaches the local backend automatically.
 */
function resolveBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:4000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

export const API_URL = resolveBase();

/** Turn a stored image path (/uploads/...) into a full URL. */
export function imageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setAuthToken = (t: string | null) => {
  authToken = t;
};
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers as any) };
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, body, signal: init.signal ?? controller.signal });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError((data as any)?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? `?${s}` : '';
}

/** Upload an image picked from the phone. Returns the stored path. */
export async function uploadImage(uri: string, mimeType?: string | null, fileName?: string | null): Promise<string> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, fileName || 'upload.jpg');
  } else {
    form.append('file', { uri, name: fileName || 'upload.jpg', type: mimeType || 'image/jpeg' } as any);
  }
  const r = await api<{ url: string }>('/api/admin/upload', { method: 'POST', body: form });
  return r.url;
}
