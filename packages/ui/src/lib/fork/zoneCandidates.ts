import type { Session } from '@/lib/opencode/model';
import { isChatDirectoryPath } from '@/lib/chatDirectories';
import type { SessionSidebarRenderContext } from '@/components/session/sidebar/sessionSidebarRowModel';

/**
 * Fork-owned: chat sessions take the same zone rules as project sessions.
 *
 * Upstream keeps the managed Chats bucket out of the Needs attention and In
 * work zones and out of Track / Done. Here one module decides who is a
 * candidate for those zones and how a chat row stands in for its missing
 * project, so the upstream files carry nothing but one-line call sites:
 *
 *  - `components/session/sidebar/list/SessionProjectCollection.tsx`
 *      `workSessions` and `attentionSessions` filter with `isZoneCandidate`
 *      (in place of `!parentID && !archived && !isChatDirectoryPath`).
 *  - `components/session/sidebar/sessions/SessionNodeItem.tsx`
 *      `canTrackWork` comes from `canTrackSessionWork`; `timelineProject`
 *      and `tooltipProjectLabel` fall back to `chatZoneProject` /
 *      `chatZoneProjectLabel` for a chat row in a mixed zone.
 *  - `lib/projectMeta.ts`
 *      the `chat` icon key the synthetic chats project paints with.
 *
 * Dedup is upstream's: In work and the duplicate zones list a session that
 * stays in its own group (Chats here), and search lists an in-work session
 * once, in the work block (`isMovedToWork` in the row model).
 */

/** Top-level, unarchived: a session the attention and work zones may list, chat or project. */
export const isZoneCandidate = (session: Session): boolean => !session.parentID && !session.time?.archived;

/** Track / Done applies to every top-level live session when the feature is on; the mobile sheet keeps upstream's rule. */
export const canTrackSessionWork = ({ sessionWorkEnabled, archivedBucket, session }: {
  sessionWorkEnabled: boolean;
  archivedBucket: boolean;
  session: Session;
}): boolean => sessionWorkEnabled && !archivedBucket && !session.parentID;

/** The project-shaped record a chat row shows where a project session shows its project's icon. */
export type ChatZoneProject = {
  id: string;
  icon: string;
  color: string | null;
  iconImage: null;
  iconBackground: null;
};

export const CHAT_ZONE_PROJECT: ChatZoneProject = Object.freeze({
  id: 'managed-chats',
  icon: 'chat',
  color: null,
  iconImage: null,
  iconBackground: null,
});

const isChatRowInMixedZone = (renderContext: SessionSidebarRenderContext, directory: string | null | undefined): boolean => (
  renderContext === 'timeline-mixed' && isChatDirectoryPath(directory)
);

/** The chats mark for a chat row in a mixed zone (In work, Needs attention, Pinned); null elsewhere. */
export const chatZoneProject = (renderContext: SessionSidebarRenderContext, directory: string | null | undefined): ChatZoneProject | null => (
  isChatRowInMixedZone(renderContext, directory) ? CHAT_ZONE_PROJECT : null
);

/** The Chats zone's title as the row's project label (icon tooltip and row tooltip); null elsewhere. */
export const chatZoneProjectLabel = (
  renderContext: SessionSidebarRenderContext,
  directory: string | null | undefined,
  t: (key: 'sessions.sidebar.activity.chatsTitle') => string,
): string | null => (
  isChatRowInMixedZone(renderContext, directory) ? t('sessions.sidebar.activity.chatsTitle') : null
);
