/**
 * Fork-owned: pinned projects.
 *
 * A pinned project sits at the top of every project list, whatever the
 * project sort. Among themselves, and below them the unpinned projects, keep
 * the order the sort gave them. The pin is a `pinned` flag on the project
 * entry in settings, like `sidebarCollapsed`, so every client of the server
 * sees it. Upstream files carry only call sites:
 *
 *  - `lib/api/types.ts`, `lib/settings/parsers.ts`, `stores/useProjectsStore.ts`
 *    and the server's `settings-normalization-runtime.js` keep the flag.
 *  - `components/session/sidebar/list/projectSort.ts` (`sortProjectsByOrder`)
 *    and every caller of `rankByLatestActivity` (the sidebar's sections, the
 *    composer's picker order, the mobile sheet) end with `pinnedProjectsFirst`.
 *  - `components/session/sidebar/projects/sortableItems.tsx` shows the marker
 *    and the Pin / Unpin project menu item.
 *  - Manual reorder maps the dragged ids to store positions
 *    (`storeProjectIndices`), since the shown order puts the pins first.
 */

/** `items` with the pinned ones first; both parts keep their incoming order. Returns `items` itself when nothing moves. */
export const pinnedProjectsFirst = <T>(items: readonly T[], isPinned: (item: T) => boolean): readonly T[] => {
  const pinned: T[] = [];
  const rest: T[] = [];
  for (const item of items) (isPinned(item) ? pinned : rest).push(item);
  if (pinned.length === 0 || rest.length === 0) return items;
  const firstUnpinned = items.findIndex((item) => !isPinned(item));
  if (firstUnpinned >= pinned.length) return items;
  return [...pinned, ...rest];
};

/** The ids of the pinned projects, for surfaces whose project shape does not carry the flag. */
export const pinnedProjectIds = (projects: ReadonlyArray<{ id: string; pinned?: boolean }>): ReadonlySet<string> => (
  new Set(projects.filter((project) => project.pinned === true).map((project) => project.id))
);

/** Store positions of a dragged project and its drop target, or null when either is unknown. */
export const storeProjectIndices = (
  projects: ReadonlyArray<{ id: string }>,
  activeId: string,
  overId: string,
): { from: number; to: number } | null => {
  const from = projects.findIndex((project) => project.id === activeId);
  const to = projects.findIndex((project) => project.id === overId);
  return from >= 0 && to >= 0 ? { from, to } : null;
};
