import { API_BASE_URL } from "@/lib/demo-mode";

/**
 * Centralized HTTP layer. Every Reality Window endpoint URL lives in
 * `endpoints` below — components never build URLs themselves.
 *
 * Base URL comes from VITE_RW_API_BASE_URL; when unset, requests go to the
 * same origin under /api.
 */

export const endpoints = {
  watches: () => `/api/watches`,
  watch: (id: string) => `/api/watches/${encodeURIComponent(id)}`,
  evaluate: (id: string) => `/api/watches/${encodeURIComponent(id)}/evaluate`,
  evaluations: (id: string) => `/api/watches/${encodeURIComponent(id)}/evaluations`,
};

/** User-facing error. Technical detail stays on `.detail` for the console. */
export class ApiError extends Error {
  detail: unknown;
  status: number;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function humanMessage(status: number): string {
  if (status === 404) return "We couldn't find that watch.";
  if (status === 400 || status === 422) return "Something in that request didn't look right.";
  if (status === 429) return "We're checking too often right now. Give it a moment.";
  if (status >= 500) return "Something went wrong while checking the source.";
  return "Something went wrong. Please try again.";
}

export async function apiRequest<T>(
  path: string,
  init?: { method?: string; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      ...(init?.signal ? { signal: init.signal } : {}),
    });
  } catch (cause) {
    console.error("[reality-window] network error", { url, cause });
    throw new ApiError("We couldn't reach the service. Check your connection and try again.", 0, cause);
  }

  const text = await response.text();
  let payload: unknown = undefined;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error("[reality-window] api error", { url, status: response.status, payload });
    throw new ApiError(humanMessage(response.status), response.status, payload);
  }

  return payload as T;
}

/** Any thrown value → a sentence we're willing to show a user. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) {
    console.error("[reality-window]", error);
    // Never surface raw framework/ORM error names.
    return /error|exception|prisma|fetch|json/i.test(error.name) && error.name !== "Error"
      ? fallback
      : error.message || fallback;
  }
  return fallback;
}
