const envApiUrl = process.env.NEXT_PUBLIC_API_URL;

function resolveApiUrl(): string {
  // In the browser, default to whatever host the page itself was loaded from
  // (with the backend's port) rather than a hardcoded "localhost" — otherwise
  // opening the app from another device (e.g. a phone over LAN, for testing
  // the PWA) sends every API call back to that device's own localhost, where
  // nothing is listening. An explicit non-local env value always wins (e.g.
  // a real deployment where frontend and backend hosts genuinely differ).
  if (typeof window !== "undefined") {
    const isLocalEnvUrl = !envApiUrl || /localhost|127\.0\.0\.1/.test(envApiUrl);
    if (isLocalEnvUrl) return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return envApiUrl ?? "http://localhost:8000";
}

export const API_URL = resolveApiUrl();
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * URL for an uploaded image, given the path the API returns ("/uploads/x.jpg").
 *
 * Deliberately same-origin and NOT prefixed with API_URL: a Next rewrite proxies
 * /uploads to the backend (see next.config.ts). API_URL differs between the
 * server render and the browser, so prefixing it produced broken images on any
 * device that wasn't the dev machine, plus a hydration mismatch on the src
 * attribute. Kept as a function so uploads can move to a CDN in one edit.
 */
export function mediaUrl(path: string): string {
  return path;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.detail ?? message;
    } catch {
      // response wasn't JSON, keep statusText
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<T>(path, { method: "POST", body: form });
  },
};
