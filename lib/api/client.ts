import type { ApiErrorBody } from '@/types/api';

/** Base URL of the FastAPI engine. Empty → the app runs fully on-device. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const isApiConfigured = API_BASE_URL.length > 0;

const DEFAULT_TIMEOUT_MS = 5000;

export class APIError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'APIError';
  }

  /** 4xx: the request itself was invalid, retrying elsewhere will not help. */
  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * FastAPI returns `detail` as a string for HTTPException / 400s but as a list
 * of `{ loc, msg }` issues for 422 validation errors — the template client
 * printed the latter as "[object Object]".
 */
export function formatErrorDetail(body: ApiErrorBody | null, fallback: string): string {
  const detail = body?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((issue) => {
        const field = issue.loc?.filter((part) => part !== 'body').join('.');
        const msg = (issue.msg ?? 'Invalid value').replace(/^Value error, /, '');
        return field ? `${field}: ${msg}` : msg;
      })
      .join('; ');
  }
  return body?.message ?? fallback;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, { method = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured) throw new APIError(0, 'Statistics API is not configured.');

  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combined,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const reason = timeout.aborted ? 'timed out' : 'is unreachable';
    throw new APIError(0, `Statistics API ${reason}.`);
  }

  if (!response.ok) {
    let parsed: ApiErrorBody | null = null;
    try {
      parsed = (await response.json()) as ApiErrorBody;
    } catch {
      // Non-JSON error page (proxy, cold start…)
    }
    throw new APIError(response.status, formatErrorDetail(parsed, response.statusText || 'Request failed'));
  }

  return (await response.json()) as T;
}
