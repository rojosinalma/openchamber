import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ProjectSortOrder = 'manual' | 'a-z' | 'z-a' | 'date-added' | 'recent';
// Worktree groups inside a project. 'recent' floats worktrees with the latest
// session activity to the top, so the list moves as sessions run; 'manual'
// and 'a-z' keep positions stable.
type WorktreeSortOrder = 'recent' | 'manual' | 'a-z';

// 'projects' is the grouped sidebar: project zones with worktree sub-headers,
// optional Recent. 'timeline' is one recency-ordered list of root sessions
// across every project, with three-line rows carrying project and branch.
export type SidebarViewMode = 'projects' | 'timeline';
type ProjectDisplayMode = 'all' | 'single';

// The sidebar zones the user can reorder, one order for both views. Zones
// that are off or empty keep their slot and are simply skipped.
export type SidebarZoneKey = 'pinned' | 'attention' | 'work' | 'chats' | 'projects';
export const DEFAULT_SIDEBAR_ZONE_ORDER: readonly SidebarZoneKey[] = Object.freeze(['pinned', 'attention', 'work', 'chats', 'projects']);
const SIDEBAR_ZONE_KEYS: ReadonlySet<string> = new Set(DEFAULT_SIDEBAR_ZONE_ORDER);
const isSidebarZoneKey = (value: string): value is SidebarZoneKey => SIDEBAR_ZONE_KEYS.has(value);

/**
 * Turns a stored or synced list into a complete order: known keys in the
 * given order, unknown keys and duplicates dropped, missing keys appended in
 * the default order. A stale or partial value therefore never hides a zone.
 */
export const normalizeSidebarZoneOrder = (input: readonly string[] | undefined): SidebarZoneKey[] => {
  const order: SidebarZoneKey[] = [];
  for (const entry of Array.isArray(input) ? input : []) {
    if (isSidebarZoneKey(entry) && !order.includes(entry)) order.push(entry);
  }
  for (const key of DEFAULT_SIDEBAR_ZONE_ORDER) {
    if (!order.includes(key)) order.push(key);
  }
  return order;
};

/**
 * Moves `key` next to `target`: above it when `key` currently sits below it
 * in `rendered` (the zones on screen right now, a subset of `order`), below
 * it otherwise. Hidden zones keep their place relative to `target`, so a drop
 * lands exactly where the user saw it land.
 */
export const moveSidebarZoneTo = (
  order: readonly SidebarZoneKey[],
  key: SidebarZoneKey,
  target: SidebarZoneKey,
  rendered: readonly SidebarZoneKey[] = order,
): SidebarZoneKey[] => {
  const from = rendered.indexOf(key);
  const to = rendered.indexOf(target);
  if (from < 0 || to < 0 || from === to || !order.includes(target)) return [...order];
  const without = order.filter((entry) => entry !== key);
  const anchor = without.indexOf(target);
  const insertAt = from > to ? anchor : anchor + 1;
  return [...without.slice(0, insertAt), key, ...without.slice(insertAt)];
};

/**
 * Moves `key` one step past its nearest neighbour in `rendered`. Hidden zones
 * in between are skipped, so one step always has a visible effect; at either
 * end nothing changes.
 */
export const moveSidebarZone = (
  order: readonly SidebarZoneKey[],
  key: SidebarZoneKey,
  direction: 'up' | 'down',
  rendered: readonly SidebarZoneKey[] = order,
): SidebarZoneKey[] => {
  const renderedIndex = rendered.indexOf(key);
  const neighbour = renderedIndex < 0 ? undefined : rendered[direction === 'up' ? renderedIndex - 1 : renderedIndex + 1];
  return neighbour ? moveSidebarZoneTo(order, key, neighbour, rendered) : [...order];
};

type SessionDisplayStore = {
  projectDisplayMode: ProjectDisplayMode;
  singleProjectId: string | null;
  setProjectDisplayMode: (mode: ProjectDisplayMode) => void;
  setSingleProjectId: (projectId: string) => void;
  sidebarViewMode: SidebarViewMode;
  setSidebarViewMode: (mode: SidebarViewMode) => void;
  /** Local display preference; motion remains opt-in. */
  animatedActivityIndicators: boolean;
  setAnimatedActivityIndicators: (enabled: boolean) => void;
  /** The managed Chats block in the sidebar (web and desktop). */
  showChatsSection: boolean;
  /** The In work block; hidden, its sessions stay in their projects. */
  showWorkSection: boolean;
  /**
   * The Needs attention block above everything: root sessions with a pending
   * request or a finished turn not viewed yet. Off by default: it duplicates
   * rows that already sit in the project groups.
   */
  showAttentionSection: boolean;
  /** The Pinned block above In work; off by default. Hidden, pinned sessions stay in their projects. */
  showPinnedSection: boolean;
  /** Pinned and In work rows in the Tree view: one line by default, two with branch, PR and model when set. */
  detailedZoneRows: boolean;
  // VS Code only: the compact webview keeps archived buckets inline because it
  // has no room for the full Archive page. Web/desktop ignore this flag and
  // always route archived sessions to the Archive page instead.
  showArchivedSessions: boolean;
  projectSortOrder: ProjectSortOrder;
  worktreeSortOrder: WorktreeSortOrder;
  /** Top-to-bottom order of the sidebar zones; always complete (see `normalizeSidebarZoneOrder`). */
  sidebarZoneOrder: SidebarZoneKey[];
  setShowChatsSection: (show: boolean) => void;
  setShowWorkSection: (show: boolean) => void;
  setShowAttentionSection: (show: boolean) => void;
  toggleAttentionSection: () => void;
  setShowPinnedSection: (show: boolean) => void;
  setDetailedZoneRows: (detailed: boolean) => void;
  setShowArchivedSessions: (show: boolean) => void;
  toggleArchivedSessions: () => void;
  setProjectSortOrder: (order: ProjectSortOrder) => void;
  setWorktreeSortOrder: (order: WorktreeSortOrder) => void;
  setSidebarZoneOrder: (order: readonly SidebarZoneKey[]) => void;
  /** See the `moveSidebarZone` helper; `rendered` is the zones currently shown. */
  moveSidebarZone: (key: SidebarZoneKey, direction: 'up' | 'down', rendered?: readonly SidebarZoneKey[]) => void;
};

export const migrateSessionDisplayState = (
  persisted: unknown,
  version: number,
): Partial<SessionDisplayStore> => {
  const state = (persisted ?? {}) as Partial<SessionDisplayStore> & {
    displayMode?: string;
    sessionGroupingMode?: string;
    stickyZoneHeaders?: boolean;
    showRecentSection?: boolean;
  };
  if (version < 2) {
    state.projectSortOrder = 'manual';
  }
  if (version < 3 && state.projectSortOrder === 'recent') {
    state.projectSortOrder = 'manual';
  }
  if (version < 4) {
    // v4 removes the default/minimal display mode: the sidebar now has a
    // single row layout. Drop the stale key from persisted state.
    delete state.displayMode;
  }
  if (version < 6) {
    // v6 removes the by-worktree/flat grouping choice: the projects view always
    // groups by worktree, and the flat recency list became the timeline view.
    delete state.sessionGroupingMode;
  }
  if (version < 7) {
    // v7 removes the sticky-headers toggle: zone headers are always pinned.
    delete state.stickyZoneHeaders;
  }
  if (version < 9 && !state.worktreeSortOrder) {
    // v9 adds the worktree sort. Everyone starts on a stable manual order:
    // an activity-sorted list moved rows under the pointer, next to
    // destructive actions like deleting a worktree.
    state.worktreeSortOrder = 'manual';
  }
  if (version < 10) {
    // v10 removes Recent: In work holds the sessions being worked on, and the
    // timeline view answers "what was I doing" across projects.
    delete state.showRecentSection;
    // v10 also adds the Needs attention zone, off until the user turns it on
    // (or a server preference re-enables it on sync): it duplicates rows that
    // already sit in the project groups.
    if (typeof state.showAttentionSection !== 'boolean') state.showAttentionSection = false;
  }
  if (version < 11) {
    // v11 adds the zone order. Everyone starts on the order the sidebar has
    // always had; a value from a newer build that was downgraded is kept.
    state.sidebarZoneOrder = normalizeSidebarZoneOrder(state.sidebarZoneOrder);
  }
  return state;
};

export const useSessionDisplayStore = create<SessionDisplayStore>()(
  persist(
    (set) => ({
      animatedActivityIndicators: false,
      setAnimatedActivityIndicators: (enabled) => set({ animatedActivityIndicators: enabled }),
      projectDisplayMode: 'all',
      singleProjectId: null,
      setProjectDisplayMode: (mode) => set({ projectDisplayMode: mode }),
      setSingleProjectId: (projectId) => set({ singleProjectId: projectId }),
      // New installs start on the timeline. Stored state keeps an earlier
      // choice, and VS Code always renders the grouped view.
      sidebarViewMode: 'timeline',
      setSidebarViewMode: (mode) => set({ sidebarViewMode: mode }),
      showChatsSection: true,
      showWorkSection: true,
      showAttentionSection: false,
      showPinnedSection: false,
      detailedZoneRows: false,
      // Default to HIDDEN so the pre-hydration state matches the quiet/safe
      // option: archived sessions must never flash visible on startup and then
      // disappear once the persisted preference rehydrates.
      showArchivedSessions: false,
      projectSortOrder: 'manual',
      worktreeSortOrder: 'manual',
      setShowChatsSection: (show) => set({ showChatsSection: show }),
      setShowWorkSection: (show) => set({ showWorkSection: show }),
      setShowAttentionSection: (show) => set({ showAttentionSection: show }),
      toggleAttentionSection: () => set((state) => ({ showAttentionSection: !state.showAttentionSection })),
      setShowPinnedSection: (show) => set({ showPinnedSection: show }),
      setDetailedZoneRows: (detailed) => set({ detailedZoneRows: detailed }),
      setShowArchivedSessions: (show) => set({ showArchivedSessions: show }),
      toggleArchivedSessions: () => set((state) => ({ showArchivedSessions: !state.showArchivedSessions })),
      sidebarZoneOrder: [...DEFAULT_SIDEBAR_ZONE_ORDER],
      setProjectSortOrder: (order) => set({ projectSortOrder: order }),
      setWorktreeSortOrder: (order) => set({ worktreeSortOrder: order }),
      setSidebarZoneOrder: (order) => set({ sidebarZoneOrder: normalizeSidebarZoneOrder(order) }),
      moveSidebarZone: (key, direction, rendered) => set((state) => ({
        sidebarZoneOrder: moveSidebarZone(state.sidebarZoneOrder, key, direction, rendered),
      })),
    }),
    {
      name: 'session-display-mode',
      version: 11,
      // v1→v2 adds projectSortOrder using the canonical manual ordering.
      // v2→v3 replaces the previously shipped recent default with manual.
      // v3→v4 removes displayMode (single sidebar row layout).
      // v4→v5 adds the independent all-projects/single-project view mode.
      // v5→v6 drops sessionGroupingMode in favour of sidebarViewMode.
      // v6→v7 drops stickyZoneHeaders (derived from the view mode now).
      // v7→v8 turned Recent off by default.
      // v8→v9 adds worktreeSortOrder (manual by default).
      // v9→v10 drops showRecentSection (Recent is gone) and adds
      // showAttentionSection (off by default).
      // v10→v11 adds sidebarZoneOrder (the fixed order the sidebar had before).
      migrate: migrateSessionDisplayState,
    },
  ),
);

export type {
  ProjectSortOrder,
  WorktreeSortOrder
};
