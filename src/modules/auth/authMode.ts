import { isSupabaseConfigured } from "../../lib/supabaseClient";

const FORCE_AUTH_REVIEW_KEY = "forceAuthReview";
export const LOCAL_AUTH_SESSION_KEY = "soil-care-local-auth";

function inBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isLocalPreviewRequested(): boolean {
  if (!isSupabaseConfigured) return true;
  if (!inBrowser()) return false;
  return localStorage.getItem(FORCE_AUTH_REVIEW_KEY) === "true";
}

export function hasLocalPreviewSession(): boolean {
  if (!inBrowser()) return false;
  return Boolean(localStorage.getItem(LOCAL_AUTH_SESSION_KEY));
}

export function isLocalPreviewModeEnabled(): boolean {
  if (!isSupabaseConfigured) return true;
  if (!inBrowser()) return false;

  const isRequested = isLocalPreviewRequested();
  const hasSession = hasLocalPreviewSession();

  if (isRequested && !hasSession) {
    localStorage.removeItem(FORCE_AUTH_REVIEW_KEY);
    return false;
  }

  return isRequested && hasSession;
}

export function enableLocalPreviewMode(): void {
  if (!inBrowser()) return;
  localStorage.setItem(FORCE_AUTH_REVIEW_KEY, "true");
}

export function clearLocalPreviewMode(): void {
  if (!inBrowser()) return;
  localStorage.removeItem(FORCE_AUTH_REVIEW_KEY);
  localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
}
