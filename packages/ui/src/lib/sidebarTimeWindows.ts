/**
 * The sidebar time window the user can tune, in whole hours: the attention
 * window, how far back a finished, not yet viewed turn still counts for Needs
 * attention and the row's green unread check (`isSessionUnseen`).
 *
 * It is a persisted setting (`sidebarAttentionWindowHours` in
 * `stores/useSessionDisplayStore.ts`); the pure helpers take the window in
 * milliseconds and default to the constant, so a caller without the store
 * keeps the shipped behaviour.
 */

export const DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS = 48;

export const SIDEBAR_WINDOW_HOURS_MIN = 1;
/** 30 days: longer than that is not an "unseen" window any more. */
export const SIDEBAR_WINDOW_HOURS_MAX = 720;

const HOUR_MS = 60 * 60 * 1000;

/**
 * A stored, synced or typed value as a usable window: a finite number rounded
 * to whole hours and clamped to the limits; anything else is the given default.
 */
export const normalizeSidebarWindowHours = (value: unknown, fallback: number): number => {
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return fallback;
  return Math.min(SIDEBAR_WINDOW_HOURS_MAX, Math.max(SIDEBAR_WINDOW_HOURS_MIN, Math.round(numeric)));
};

export const sidebarWindowHoursToMs = (hours: number): number => hours * HOUR_MS;
