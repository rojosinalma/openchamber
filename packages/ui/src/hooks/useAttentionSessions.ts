import React from 'react';
import type { Session } from '@/lib/opencode/model';
import {
  compareSessionAttentionEntries,
  isSessionUnseen,
  type SessionAttentionEntry,
  type SessionAttentionKind,
} from '@/lib/sessionAttention';
import { sidebarWindowHoursToMs } from '@/lib/sidebarTimeWindows';
import { resolveGlobalSessionDirectory, useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { useGlobalBlockingRequestsStore, type PendingBlockingRequests } from '@/sync/global-blocking-requests';
import { hasActiveSubagent, useGlobalSessionStatusStore } from '@/sync/global-session-status';
import { useBackgroundShellsStore } from '@/sync/background-shells';
import { useAttentionStickyStore, type AttentionSticky } from '@/sync/attention-sticky';
import { useSessionUIStore } from '@/sync/session-ui-store';

const EMPTY_ENTRIES: readonly SessionAttentionEntry[] = Object.freeze([]);

/** Subagents nest; a deeper chain than this is treated as unrelated (mirrors global-session-status). */
const MAX_SUBAGENT_DEPTH = 8;

const resolveRootSession = (session: Session, entityById: ReadonlyMap<string, Session>): Session => {
  let current = session;
  for (let depth = 0; current.parentID && depth < MAX_SUBAGENT_DEPTH; depth += 1) {
    const parent = entityById.get(current.parentID);
    if (!parent) break;
    current = parent;
  }
  return current;
};

const blockingKindOf = (pending: PendingBlockingRequests): SessionAttentionKind | null => {
  if (pending.permissions.length > 0) return 'permission';
  if (pending.forms.length > 0) return 'form';
  return null;
};

/** Most recent of what the record reports; the blocking index carries no request time. */
const sessionRecencyOf = (session: Session): number => session.time.updated || session.time.created || 0;

const sameEntries = (left: readonly SessionAttentionEntry[], right: readonly SessionAttentionEntry[]): boolean => (
  left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return entry.sessionId === other.sessionId && entry.kind === other.kind && entry.at === other.at && entry.directory === other.directory;
  })
);

export const deriveAttentionEntries = ({
  bySession,
  activeSessions,
  entityById,
  activeSessionIds,
  shellSessionIds,
  now,
  sticky = null,
  attentionWindowMs,
}: {
  bySession: ReadonlyMap<string, PendingBlockingRequests>;
  activeSessions: readonly Session[];
  entityById: ReadonlyMap<string, Session>;
  activeSessionIds: ReadonlySet<string>;
  shellSessionIds: ReadonlySet<string>;
  now: number;
  /** The selected session captured as unseen at selection time (`sync/attention-sticky.ts`); listed while that turn is still its last. */
  sticky?: AttentionSticky | null;
  /** How far back a finished turn still counts (`sidebarAttentionWindowHours`); the shipped default when omitted. */
  attentionWindowMs?: number;
}): readonly SessionAttentionEntry[] => {
  const byRoot = new Map<string, SessionAttentionEntry>();
  // A request anywhere in a family blocks the whole family, so the row shown
  // is the root's. Permission outranks form when both are pending below one root.
  for (const [sessionId, pending] of bySession) {
    const kind = blockingKindOf(pending);
    if (!kind) continue;
    const session = entityById.get(sessionId);
    const root = session ? resolveRootSession(session, entityById) : null;
    if (!root || root.parentID || root.time.archived) continue;
    const existing = byRoot.get(root.id);
    if (existing && (existing.kind === 'permission' || existing.kind === kind)) continue;
    byRoot.set(root.id, {
      sessionId: root.id,
      directory: resolveGlobalSessionDirectory(root) ?? pending.directory,
      kind,
      at: sessionRecencyOf(root),
    });
  }
  // A finished turn nobody looked at yet. A session whose turn is still open
  // (running, waiting on a subagent or on a background command) is not asking
  // for anything; it reappears when the turn ends. The row the user selected
  // from this zone has had its view recorded; it stays, under the same rule,
  // while the turn it was selected for is still the session's last.
  const turnIsOpen = (sessionId: string): boolean => (
    activeSessionIds.has(sessionId) || hasActiveSubagent(sessionId, activeSessionIds) || shellSessionIds.has(sessionId)
  );
  for (const session of activeSessions) {
    if (byRoot.has(session.id)) continue;
    const idle = session.time.idle;
    if (idle === undefined) continue;
    const stuck = sticky !== null && sticky.sessionId === session.id && sticky.idle === idle && !session.parentID && !session.time.archived;
    if (!stuck && !isSessionUnseen(session, now, attentionWindowMs)) continue;
    if (turnIsOpen(session.id)) continue;
    byRoot.set(session.id, {
      sessionId: session.id,
      directory: resolveGlobalSessionDirectory(session) ?? session.directory,
      kind: 'unseen',
      at: idle,
    });
  }
  if (byRoot.size === 0) return EMPTY_ENTRIES;
  return [...byRoot.values()].sort(compareSessionAttentionEntries);
};

/**
 * Root sessions that need the user right now, most urgent first: a pending
 * permission, then a pending form, then a finished turn not viewed yet. The
 * session selected out of this list stays in it until another is selected.
 * Returns the same array while membership and order are unchanged, so it can
 * feed a memo directly.
 */
export const useAttentionSessions = (): readonly SessionAttentionEntry[] => {
  const bySession = useGlobalBlockingRequestsStore((state) => state.bySession);
  const activeSessions = useGlobalSessionsStore((state) => state.activeSessions);
  const entityById = useGlobalSessionsStore((state) => state.entityById);
  const activeSessionIds = useGlobalSessionStatusStore((state) => state.activeSessionIds);
  const shellSessionIds = useBackgroundShellsStore((state) => state.sessionIds);
  const stickyCandidate = useAttentionStickyStore((state) => state.sticky);
  const currentSessionId = useSessionUIStore((state) => state.currentSessionId);
  const sticky = stickyCandidate && stickyCandidate.sessionId === currentSessionId ? stickyCandidate : null;
  const attentionWindowHours = useSessionDisplayStore((state) => state.sidebarAttentionWindowHours);
  const stable = React.useRef<readonly SessionAttentionEntry[]>(EMPTY_ENTRIES);
  return React.useMemo(() => {
    const entries = deriveAttentionEntries({
      bySession,
      activeSessions,
      entityById,
      activeSessionIds,
      shellSessionIds,
      now: Date.now(),
      sticky,
      attentionWindowMs: sidebarWindowHoursToMs(attentionWindowHours),
    });
    if (!sameEntries(stable.current, entries)) stable.current = entries;
    return stable.current;
  }, [activeSessionIds, activeSessions, attentionWindowHours, bySession, entityById, shellSessionIds, sticky]);
};

/** The session ids of `useAttentionSessions`, in the same order and with the same identity guarantee. */
export const useAttentionSessionIds = (): readonly string[] => {
  const entries = useAttentionSessions();
  return React.useMemo(() => entries.map((entry) => entry.sessionId), [entries]);
};
