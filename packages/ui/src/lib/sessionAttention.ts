import type { Session } from '@/lib/opencode/model';
import { DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS, sidebarWindowHoursToMs } from '@/lib/sidebarTimeWindows';

/**
 * How long a finished turn stays something the user still owes a look when
 * nothing else is said: the shipped default of the `sidebarAttentionWindowHours`
 * setting (`lib/sidebarTimeWindows.ts`). Live callers pass the user's value;
 * older than that, a session is history.
 */
export const SESSION_ATTENTION_WINDOW_MS = sidebarWindowHoursToMs(DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS);

/**
 * A root session whose last turn ended after the user last looked at it, as
 * OpenCode records it (`time.idle` vs `time.viewed`). This is the persistent
 * unread signal: it survives reloads and other clients because both stamps
 * live on the server record. A session that never finished a turn, is
 * archived, is a subsession, or went idle more than `windowMs` ago (the user's
 * `sidebarAttentionWindowHours`) is not unseen. `viewed` missing means never
 * viewed.
 */
export const isSessionUnseen = (session: Session, nowMs: number, windowMs = SESSION_ATTENTION_WINDOW_MS): boolean => {
  if (session.parentID) return false;
  const { idle, viewed, archived } = session.time;
  if (archived) return false;
  if (idle === undefined) return false;
  if (idle <= (viewed ?? 0)) return false;
  return nowMs - idle <= windowMs;
};

/** Why a session needs the user, most urgent first. */
export type SessionAttentionKind = 'permission' | 'form' | 'unseen';

export type SessionAttentionEntry = {
  sessionId: string;
  directory: string;
  kind: SessionAttentionKind;
  /** When the need arose: request time for permissions and forms, `time.idle` for unseen. */
  at: number;
};

const KIND_RANK = { permission: 0, form: 1, unseen: 2 } satisfies Record<SessionAttentionKind, number>;

/** Permission before form before unseen; within a kind, newest first; ties by id for a stable list. */
export const compareSessionAttentionEntries = (left: SessionAttentionEntry, right: SessionAttentionEntry): number => {
  const rank = KIND_RANK[left.kind] - KIND_RANK[right.kind];
  if (rank !== 0) return rank;
  if (left.at !== right.at) return right.at - left.at;
  return left.sessionId < right.sessionId ? -1 : left.sessionId > right.sessionId ? 1 : 0;
};
