/** Typed API client — the only place fetch is called.
 *
 * Server state lives in TanStack Query; this module just transports bytes.
 * Never hand-roll fetch in components/hooks.
 */

const TOKEN_KEY = "lp_token";

export const API_BASE: string = import.meta.env.VITE_API_URL ?? "/api/v1";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

/** True when the current token lives in sessionStorage only ("keep me signed
 * in" was off) — used to preserve that privacy choice across token refreshes. */
export function tokenIsSessionOnly(): boolean {
  return localStorage.getItem(TOKEN_KEY) === null && sessionStorage.getItem(TOKEN_KEY) !== null;
}

/**
 * Persist the session token.
 * `remember = false` stores it in sessionStorage only — the session dies when
 * the tab/browser closes (privacy: don't stay signed in on shared devices).
 */
export function setToken(token: string | null, remember = true): void {
  if (token) {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Attach the Bearer token. Defaults to true; pass false for public calls. */
  auth?: boolean;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Network error — is the backend running?");
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { detail?: unknown };
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map((d) => String(d)).join(";");
    } catch {
      /* non-JSON error body — keep default message */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
