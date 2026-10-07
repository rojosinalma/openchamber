import { create } from 'zustand';
import type { Session } from '@/lib/opencode/model';
import { isSessionUnseen } from '@/lib/sessionAttention';
import { subscribeRuntimeEndpointWillChange } from '@/lib/runtime-switch';
import { resolveGlobalSessionDirectory, useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';
import { getAllSyncSessions } from './sync-refs';

/**
 * The one Needs attention row that selection must not take away.
 *
 * Selecting a session records the view (`markSessionViewedRemote`) in the same
 * tick, so a row the user clicked in Needs attention would otherwise vanish
 * from under the cursor. This store remembers the session that was unseen at
 * the moment it was selected, together with the turn (`time.idle`) that made it
 * so; `useAttentionSessions` keeps that turn listed (as the active row) while
 * the session stays the current one. Selecting a different session or a draft,
 * turning the zone off, or a runtime switch releases it; it does not come back
 * when the user returns unless it qualifies again. A later turn ending in the
 * same session carries a new `idle`, so the sticky entry stops applying and the
 * ordinary rule takes over. Pending permissions and forms stay listed on their
 * own until answered and never need this.
 *
 * The candidate is captured at selection time from the record about to be
 * patched, never from a previous render's list. Whether its turn is open is
 * judged where the zone is derived, with the same rule as every other row.
 */

export type AttentionSticky = {
  sessionId: string;
  directory: string;
  /** The `time.idle` the user owed a look at when the session was selected. */
  idle: number;
};

type AttentionStickyState = {
  sticky: AttentionSticky | null;
};

export const useAttentionStickyStore = create<AttentionStickyState>()(() => ({ sticky: null }));

const findKnownSession = (sessionId: string): Session | null => (
  useGlobalSessionsStore.getState().entityById.get(sessionId)
  ?? getAllSyncSessions().find((session) => session.id === sessionId)
  ?? null
);

const sameSticky = (left: AttentionSticky | null, right: AttentionSticky | null): boolean => (
  left === right
  || (left !== null && right !== null && left.sessionId === right.sessionId && left.directory === right.directory && left.idle === right.idle)
);

/**
 * Called when the selection moves to `sessionId`, before its view is recorded.
 * Keeps the current sticky when the selection does not change; otherwise
 * replaces it with `sessionId` if that session is unseen right now, or clears it.
 */
export function captureAttentionSticky(sessionId: string | null, previousSessionId: string | null, now = Date.now()): void {
  if (sessionId && sessionId === previousSessionId) return;
  const session = sessionId ? findKnownSession(sessionId) : null;
  const next = session && session.time.idle !== undefined && isSessionUnseen(session, now)
    ? { sessionId: session.id, directory: resolveGlobalSessionDirectory(session) ?? session.directory, idle: session.time.idle }
    : null;
  if (sameSticky(useAttentionStickyStore.getState().sticky, next)) return;
  useAttentionStickyStore.setState({ sticky: next });
}

export function clearAttentionSticky(): void {
  if (useAttentionStickyStore.getState().sticky) useAttentionStickyStore.setState({ sticky: null });
}

subscribeRuntimeEndpointWillChange(clearAttentionSticky);

// Turning the zone off releases the row; turning it back on starts clean.
useSessionDisplayStore.subscribe((state, previous) => {
  if (previous.showAttentionSection && !state.showAttentionSection) clearAttentionSticky();
});
