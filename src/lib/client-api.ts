"use client";

// Minimal fetch wrapper for the app's own JSON endpoints. Errors carry the
// server's Spanish message so forms can show it as is, and the status so
// callers can tell a transient failure from a definitive one.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
  get transient(): boolean {
    return this.status === 502 || this.status === 503 || this.status === 504;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string } & T;
  if (!response.ok) throw new ApiError(response.status, body.error ?? `Error ${response.status}`, body.code);
  return body;
}

// The browser drives the single permitted retry per clinical call: one more
// attempt after a transient failure (timeout or provider error), never after
// a definitive one, and never once the call was aborted.
export async function withRetry<T>(call: () => Promise<T>, retries: number, signal: AbortSignal): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await call();
    } catch (err) {
      const retry = err instanceof ApiError && err.transient && attempt < retries && !signal.aborted;
      if (!retry) throw err;
      attempt++;
    }
  }
}
