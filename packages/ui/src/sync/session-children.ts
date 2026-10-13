import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Session } from '@/lib/opencode/model';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { useGlobalSessionStatusStore } from './global-session-status';

// A session's subagents are the sessions whose `parentID` is its id. The global
// sessions store already keeps that index (`structure.activeChildrenByParentId`,
// archived children excluded) and updates it per mutation with stable bucket
// references, so every reader here is one Map lookup against one shared index:
// the sidebar renders hundreds of rows and none of them may scan the list.

const EMPTY_SESSION_IDS: readonly string[] = [];

export const selectSessionChildIds = (
  childrenByParentId: ReadonlyMap<string, readonly string[]>,
  sessionId: string | null,
): readonly string[] => (sessionId ? childrenByParentId.get(sessionId) ?? EMPTY_SESSION_IDS : EMPTY_SESSION_IDS);

/** How many of `sessionIds` are running (busy or retrying) right now. */
export const countRunningSessions = (sessionIds: readonly string[], activeSessionIds: ReadonlySet<string>): number => {
  let running = 0;
  for (const id of sessionIds) if (activeSessionIds.has(id)) running += 1;
  return running;
};

/** Ids of the session's live (unarchived) child sessions; a stable empty array when none. */
export const useSessionChildIds = (sessionId: string | null): readonly string[] => useGlobalSessionsStore(
  React.useCallback((state) => selectSessionChildIds(state.structure.activeChildrenByParentId, sessionId), [sessionId]),
);

/** How many of the given sessions are running; re-renders only when that number changes. */
export const useRunningSessionCount = (sessionIds: readonly string[]): number => useGlobalSessionStatusStore(
  React.useCallback((state) => countRunningSessions(sessionIds, state.activeSessionIds), [sessionIds]),
);

/**
 * The session's child sessions themselves, for a surface that lists them.
 * Compared element-wise, so a step streamed into one child re-renders the
 * caller once rather than on every unrelated session update.
 */
export const useSessionChildren = (sessionId: string | null): Session[] => {
  const childIds = useSessionChildIds(sessionId);
  return useGlobalSessionsStore(useShallow(React.useCallback((state) => {
    const children: Session[] = [];
    for (const id of childIds) {
      const child = state.entityById.get(id);
      if (child) children.push(child);
    }
    return children;
  }, [childIds])));
};

export type SubagentRow = {
  session: Session;
  running: boolean;
};

/**
 * Order for a list of subagents: the ones still running first, then newest
 * created first, so what is happening now sits at the top and the rest reads
 * as a launch log. Created, never last activity: an activity order reshuffles
 * rows under the pointer on every streamed step.
 */
export const orderSubagentRows = (
  children: readonly Session[],
  activeSessionIds: ReadonlySet<string>,
  limit: number,
): SubagentRow[] => children
  .map((session) => ({ session, running: activeSessionIds.has(session.id) }))
  .sort((left, right) => (Number(right.running) - Number(left.running))
    || ((right.session.time?.created ?? 0) - (left.session.time?.created ?? 0)))
  .slice(0, limit);
