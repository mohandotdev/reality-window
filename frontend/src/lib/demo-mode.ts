/**
 * Demo mode.
 *
 * Live data is always preferred. Demo mode is *explicit*: it is on when the
 * backend base URL isn't configured, when `?demo=1` is in the URL, or when the
 * user flips the toggle (persisted in localStorage). The UI always says so.
 */

const STORAGE_KEY = "rw:demo-mode";
export const DEMO_MODE_CHANGE_EVENT = "rw:demo-mode-change";

export const API_BASE_URL: string =
  (import.meta.env["VITE_RW_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

/** With no backend configured there is nothing live to call. */
export const hasConfiguredBackend = API_BASE_URL.length > 0;

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return !hasConfiguredBackend;
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "1") return true;
  if (params.get("demo") === "0") return false;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "on") return true;
  if (stored === "off") return false;
  return !hasConfiguredBackend;
}

export function setDemoMode(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  window.dispatchEvent(new Event(DEMO_MODE_CHANGE_EVENT));
}
