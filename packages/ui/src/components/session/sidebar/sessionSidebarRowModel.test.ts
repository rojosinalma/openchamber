import { describe, expect, test } from 'bun:test';
import type { Session } from '@/lib/opencode/model';
import type { SessionGroup, SessionNode } from './types';
import type { ProjectSection } from './projects/sessionProjectRender';
import { buildSessionSidebarRowModel, countSessionSearchMatches, resolveSessionSidebarStickyHeader, runExpansionKey, timelineProjectContainerKey, type SessionSidebarActivityItem, type SessionSidebarRowModelArgs } from './sessionSidebarRowModel';
import { buildMultiRunIndex } from '@/lib/multirun/runs';
import { withMultiRunMembership } from '@/lib/multirun/identity';
import { getPinnedSessionKey } from '@/stores/useSessionPinnedStore';
import { getRuntimeKey } from '@/lib/runtime-switch';

const timelineItem = (id: string, overrides: Partial<SessionSidebarActivityItem> = {}): SessionSidebarActivityItem => ({
  node: { session: session(id), children: [], worktree: null },
  projectId: 'project-a',
  groupDirectory: '/repo',
  secondaryMeta: { projectLabel: 'repo', branchLabel: 'main' },
  ...overrides,
});

const pinnedIds = (...ids: string[]): Set<string> => new Set(
  ids.flatMap((id) => {
    const key = getPinnedSessionKey(getRuntimeKey(), '/repo', id);
    return key ? [key] : [];
  }),
);

// SAFETY: the row model only reads the supplied session identity, title, directory, parent, and lifecycle fields.
const session = (id: string, parentID?: string): Session => ({
  id,
  title: id,
  directory: '/repo',
  parentID,
  time: { created: 1, updated: 1 },
} as Session);

const node = (id: string, children: SessionNode[] = []): SessionNode => ({ session: session(id), children, worktree: null });

const group = (sessions: SessionNode[], overrides: Partial<SessionGroup> = {}): SessionGroup => ({
  id: 'main',
  label: 'main',
  branch: null,
  description: null,
  isMain: true,
  worktree: null,
  directory: '/repo',
  folderScopeKey: '/repo',
  sessions,
  ...overrides,
});

const project = (groups: SessionGroup[]): ProjectSection => ({
  project: { id: 'project-a', normalizedPath: '/repo' },
  groups,
});

const args = (sections: ProjectSection[]): SessionSidebarRowModelArgs => ({
  mode: 'normal',
  sections,
  authoritativeSections: sections,
  chatGroup: null,
  foldersMap: {},
  groupSearchDataByGroup: new WeakMap(),
  normalizedQuery: '',
  collapsedProjects: new Set(),
  collapsedGroups: new Set(),
  collapsedFolders: new Set(),
  collapsedActivities: new Set(),
  expandedParents: new Set(),
  visibleCountByContainer: new Map(),
  pinnedSessionIds: new Set(),
  sessionOrderIndex: new Map(),
  groupStatusByKey: new Map(),
  folderAuthorityByOwner: new Map([['project-a', { scopeKeys: ['/repo'], complete: true }]]),
  activeProjectId: 'project-a',
  singleProjectMode: false,
  singleProjectId: null,
  showOnlyMainWorkspace: false,
  hideDirectoryControls: false,
});

describe('buildSessionSidebarRowModel', () => {
  test('a session in work is in the top block and stays in its project group', () => {
    const working = node('working');
    const other = node('other');
    const input = args([project([group([working, other])])]);
    input.workItems = [timelineItem('working')];
    input.workSessionIds = new Set(['working']);

    const model = buildSessionSidebarRowModel(input);
    const sessionRows = model.rows.flatMap((row) => (row.kind === 'session' ? [`${row.renderContext}:${row.node.session.id}`] : []));

    expect(model.rows[0]).toMatchObject({ kind: 'activity-header', activityKey: 'work' });
    expect(sessionRows).toEqual(['mixed-compact:working', 'project:other', 'project:working']);
    expect(model.selectionEntries.filter((entry) => entry.id === 'working')).toHaveLength(2);
    expect(new Set(model.rows.map((row) => row.key)).size).toBe(model.rows.length);
  });

  test('detailed zone rows give the Tree view the two-line row', () => {
    const input = args([project([group([node('working')])])]);
    input.workItems = [timelineItem('working')];
    input.workSessionIds = new Set(['working']);
    input.detailedZoneRows = true;

    const rows = buildSessionSidebarRowModel(input).rows;
    const zoneRow = rows.find((row) => row.kind === 'session');

    expect(zoneRow?.kind === 'session' && zoneRow.renderContext).toBe('timeline-mixed');
  });

  test('a session in work stays in its folder', () => {
    const input = args([project([group([node('in-folder'), node('top-level')])])]);
    input.foldersMap = { '/repo': [{ id: 'outer', name: 'Outer', createdAt: 1, sessionIds: ['in-folder'] }] };
    input.workItems = [timelineItem('in-folder')];
    input.workSessionIds = new Set(['in-folder']);

    const rows = buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'folder-header' || row.kind === 'session');

    expect(rows.map((row) => (row.kind === 'session' ? `${row.renderContext}:${row.node.session.id}` : row.displayName))).toEqual([
      'mixed-compact:in-folder', 'Outer', 'project:in-folder', 'project:top-level',
    ]);
  });

  test('search lists a session in work once, in the work block, and counts the tree once', () => {
    const parent = node('ses_parent', [node('ses_child'), node('ses_other')]);
    const main = group([parent]);
    const input = args([project([main])]);
    input.mode = 'search';
    input.normalizedQuery = 'ses_child';
    input.groupSearchDataByGroup.set(main, {
      filteredNodes: [parent],
      matchedSessionCount: countSessionSearchMatches([parent], 'ses_child'),
      folderNameMatchCount: 0,
      groupMatches: false,
      hasMatch: true,
    });
    input.workItems = [{ ...timelineItem('ses_parent'), node: parent }];
    input.workSessionIds = new Set(['ses_parent']);

    const model = buildSessionSidebarRowModel(input);
    const rows = model.rows.flatMap((row) => (row.kind === 'session' ? [row.node.session.id] : []));

    expect(model.searchMatchCount).toBe(1);
    expect(rows).toEqual(['ses_parent', 'ses_child', 'ses_other']);
    expect(model.selectionEntries.filter((entry) => entry.id === 'ses_parent')).toHaveLength(1);
  });

  test('timeline lists work sessions with the project icon and keeps them in their project', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';
    input.timelineItems = [timelineItem('working'), timelineItem('other')];
    input.workItems = [timelineItem('working')];
    input.workSessionIds = new Set(['working']);

    const rows = buildSessionSidebarRowModel(input).rows;
    const headers = rows.flatMap((row) => (row.kind === 'activity-header' ? [row.activityKey] : row.kind === 'project-header' ? [row.section.project.id] : []));
    const sessions = rows.flatMap((row) => (row.kind === 'session' ? [`${row.renderContext}:${row.node.session.id}`] : []));

    expect(headers).toEqual(['work', 'projects', 'project-a']);
    expect(sessions).toEqual(['timeline-mixed:working', 'timeline:working', 'timeline:other']);
  });

  test('timeline reveals seven sessions per project, seven more per Show more', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';
    input.timelineItems = Array.from({ length: 16 }, (_, index) => timelineItem(`s${index}`));

    for (const count of [7, 14, 16]) {
      const model = buildSessionSidebarRowModel(input);
      expect(model.rows.filter((row) => row.kind === 'session')).toHaveLength(count);
      const control = model.rows.find((row) => row.kind === 'show-control');
      if (!control || control.kind !== 'show-control') throw new Error('Missing reveal control');
      expect(control.containerKey).toBe(timelineProjectContainerKey('project-a'));
      expect(control.control).toBe(count === 16 ? 'fewer' : 'more');
      input.visibleCountByContainer = new Map([[control.containerKey, control.currentCount + control.increment]]);
    }
  });

  test('a collapsed timeline project shows only its header', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';
    input.timelineItems = [timelineItem('a')];
    input.collapsedProjects = new Set(['project-a']);

    expect(buildSessionSidebarRowModel(input).rows).toMatchObject([{ kind: 'activity-header', activityKey: 'projects' }, { kind: 'project-header', collapsed: true }]);
  });

  test('keeps badge scopes for hidden timeline descendants without adding child rows', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';
    input.timelineItems = [timelineItem('root', {
      blockingBadgeSessionScopes: [
        { directory: '/repo', sessionIDs: ['root'] },
        { directory: '/worktree', sessionIDs: ['child'] },
      ],
    })];
    input.workItems = [timelineItem('working', {
      blockingBadgeSessionScopes: [
        { directory: '/repo', sessionIDs: ['working'] },
        { directory: '/worktree', sessionIDs: ['worker'] },
      ],
    })];
    input.workSessionIds = new Set(['working']);

    const model = buildSessionSidebarRowModel(input);
    const rows = model.rows.filter((row) => row.kind === 'session');
    expect(rows.map((row) => row.node.session.id)).toEqual(['working', 'root']);
    expect(rows.map((row) => row.blockingBadgeSessionScopes?.[1]?.sessionIDs)).toEqual([['worker'], ['child']]);
    expect(rows.every((row) => row.node.children.length === 0)).toBe(true);
    expect(model.selectionEntries.map((entry) => entry.id)).toEqual(['working', 'root']);
  });

  test('search counts a subsession of a session in work once, and the moved tree leaves its group', () => {
    const parent = node('ses_parent', [node('ses_child'), node('ses_other')]);
    const main = group([parent]);
    const input = args([project([main])]);
    input.mode = 'search';
    input.normalizedQuery = 'ses_child';
    input.groupSearchDataByGroup.set(main, {
      filteredNodes: [parent],
      matchedSessionCount: countSessionSearchMatches([parent], 'ses_child'),
      folderNameMatchCount: 0,
      groupMatches: false,
      hasMatch: true,
    });
    input.workItems = [{ ...timelineItem('ses_parent'), node: parent }];
    input.workSessionIds = new Set(['ses_parent']);

    const model = buildSessionSidebarRowModel(input);
    const rows = model.rows.flatMap((row) => (row.kind === 'session' ? [row.node.session.id] : []));

    expect(model.searchMatchCount).toBe(1);
    expect(rows).toEqual(['ses_parent', 'ses_child', 'ses_other']);
    // The project had no other match: no empty project header.
    expect(model.rows.some((row) => row.kind === 'project-header')).toBe(false);
  });

  test('search counts every matching subsession of a session in work', () => {
    const titled = (id: string, title: string, children: SessionNode[] = []): SessionNode => ({ session: { ...session(id), title }, children, worktree: null });
    const parent = titled('ses_parent', 'Parent', [titled('ses_a', 'fix header'), titled('ses_b', 'header spacing'), titled('ses_c', 'footer')]);
    const input = args([]);
    input.mode = 'search';
    input.normalizedQuery = 'header';
    input.workItems = [{ ...timelineItem('ses_parent'), node: parent }];
    input.workSessionIds = new Set(['ses_parent']);

    expect(buildSessionSidebarRowModel(input).searchMatchCount).toBe(2);
  });

  test('in work sits above Chats and the projects', () => {
    const working = node('working');
    const input = args([project([group([working, node('other')])])]);
    input.chatGroup = group([node('chat')], { id: 'chats', directory: '/chats', folderScopeKey: '/chats' });
    input.workItems = [timelineItem('working')];
    input.workSessionIds = new Set(['working']);

    const headers = buildSessionSidebarRowModel(input).rows.flatMap((row) => (
      row.kind === 'activity-header' ? [row.activityKey] : row.kind === 'project-header' ? [row.section.project.id] : []
    ));

    expect(headers).toEqual(['work', 'chats', 'projects', 'project-a']);
  });

  test('no block while nothing is in work', () => {
    const input = args([project([group([node('other')])])]);
    input.workItems = [];
    const headers = buildSessionSidebarRowModel(input).rows.flatMap((row) => (row.kind === 'activity-header' ? [row.activityKey] : []));
    expect(headers).not.toContain('work');
  });

  test('uses occurrence keys while retaining duplicate session IDs in logical order', () => {
    const repeated = node('same-session');
    const input = args([project([group([repeated])])]);
    input.workItems = [{ node: repeated, projectId: 'project-a', groupDirectory: '/repo', secondaryMeta: null }];
    input.workSessionIds = new Set(['same-session']);

    const model = buildSessionSidebarRowModel(input);
    const entries = model.selectionEntries.filter((entry) => entry.id === 'same-session');

    expect(entries).toHaveLength(2);
    expect(entries[0]?.rowKey).not.toBe(entries[1]?.rowKey);
    expect(new Set(model.rows.map((row) => row.key)).size).toBe(model.rows.length);
  });

  test('forces descendants open in search without changing persisted expansion state', () => {
    const parent = node('parent', [node('child')]);
    const main = group([parent]);
    const input = args([project([main])]);
    input.mode = 'search';
    input.normalizedQuery = 'child';
    input.groupSearchDataByGroup.set(main, {
      filteredNodes: [parent],
      matchedSessionCount: 1,
      folderNameMatchCount: 0,
      groupMatches: false,
      hasMatch: true,
    });

    const model = buildSessionSidebarRowModel(input);

    expect(model.rows.filter((row) => row.kind === 'session').map((row) => row.node.session.id)).toEqual(['parent', 'child']);
    const parentEntry = model.selectionEntries.find((entry) => entry.id === 'parent');
    expect(parentEntry?.descendantRange).toBeDefined();
    expect(parentEntry?.descendantRange
      ? model.selectionDescendantIds.slice(parentEntry.descendantRange[0], parentEntry.descendantRange[1])
      : []).toEqual(['child']);
    expect(input.expandedParents.size).toBe(0);
  });

  test('enables folder drops only when the owner scope set is authoritative', () => {
    const main = group([node('session-a')]);
    const input = args([project([main])]);
    input.foldersMap = { '/repo': [{ id: 'folder-a', name: 'Folder', sessionIds: ['session-a'], createdAt: 1 }] };

    expect(buildSessionSidebarRowModel(input).folderDropTargets[0]?.enabled).toBe(true);

    input.folderAuthorityByOwner = new Map([['project-a', { scopeKeys: ['/repo'], complete: false }]]);
    expect(buildSessionSidebarRowModel(input).folderDropTargets[0]?.enabled).toBe(false);
  });

  test('keeps a 25,000-session group bounded until show-more is requested', () => {
    const sessions = Array.from({ length: 25_000 }, (_, index) => node(`session-${index}`));
    const model = buildSessionSidebarRowModel(args([project([group(sessions)])]));

    expect(model.rows.filter((row) => row.kind === 'session')).toHaveLength(7);
    expect(model.rows.some((row) => row.kind === 'show-control' && row.control === 'more')).toBe(true);
  });

  test('single-project flat mode reveals twenty at a time and resets without changing Chats', () => {
    const nodes = Array.from({ length: 45 }, (_, index) => node(`session-${index}`));
    const input = args([project([group(nodes)])]);
    input.singleProjectMode = true;
    input.singleProjectId = 'project-a';
    input.sessionBatchSize = 20;
    input.chatGroup = group(nodes, { id: 'managed-chats' });
    for (const count of [20, 40, 45]) {
      const model = buildSessionSidebarRowModel(input);
      expect(model.rows.filter((row) => row.kind === 'session' && row.projectId === 'project-a')).toHaveLength(count);
      expect(model.rows.filter((row) => row.kind === 'session' && row.projectId === null)).toHaveLength(3);
      const control = model.rows.find((row) => row.kind === 'show-control' && row.containerKey === 'project-a:main');
      if (!control || control.kind !== 'show-control') throw new Error('Missing reveal control');
      expect(control.increment).toBe(20);
      expect(control.control).toBe(count === 45 ? 'fewer' : 'more');
      if (control.control === 'more') input.visibleCountByContainer = new Map([[control.containerKey, control.currentCount + control.increment]]);
      else input.visibleCountByContainer = new Map();
    }
    expect(buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'session' && row.projectId === 'project-a')).toHaveLength(20);
  });

  test('Chats failure stays visible beside retained sessions', () => {
    const input = args([]);
    input.chatGroup = group([node('retained-chat')], { id: 'managed-chats' });
    input.groupStatusByKey = new Map([['activity:chats', { state: 'load-failed', directory: '/chats', canGrantAccess: false }]]);
    const rows = buildSessionSidebarRowModel(input).rows;
    expect(rows.some((row) => row.kind === 'session' && row.node.session.id === 'retained-chat')).toBe(true);
    expect(rows.find((row) => row.kind === 'status')).toMatchObject({ groupKey: 'activity:chats', status: { state: 'load-failed' } });
    expect(rows.some((row) => row.kind === 'empty')).toBe(false);
  });

  test('a collapsed folder retains activity coverage from nested folders without flattening subtasks', () => {
    const child = node('child');
    child.session.parentID = 'parent';
    const parent = node('parent', [child]);
    const input = args([project([group([parent])])]);
    input.foldersMap = { '/repo': [
      { id: 'outer', name: 'Outer', createdAt: 1, sessionIds: [] },
      { id: 'inner', name: 'Inner', parentId: 'outer', createdAt: 1, sessionIds: ['parent', 'child'] },
    ] };
    input.collapsedFolders = new Set(['outer']);
    const model = buildSessionSidebarRowModel(input);
    const folder = model.rows.find((row) => row.kind === 'folder-header');
    if (!folder || folder.kind !== 'folder-header') throw new Error('Missing outer folder');
    expect(folder.nodes).toEqual([]);
    expect(folder.activityNodes).toEqual([parent]);
    expect(folder.activityNodes[0]?.children).toEqual([child]);
    expect(model.rows.filter((row) => row.kind === 'folder-header')).toHaveLength(1);
    expect(model.rows.some((row) => row.kind === 'session')).toBe(false);
  });

  test('sessions inside a folder sit one level deeper than ungrouped sessions', () => {
    const child = node('child');
    child.session.parentID = 'in-folder';
    const input = args([project([group([node('in-folder', [child]), node('top-level')])])]);
    input.foldersMap = { '/repo': [
      { id: 'outer', name: 'Outer', createdAt: 1, sessionIds: [] },
      { id: 'inner', name: 'Inner', parentId: 'outer', createdAt: 1, sessionIds: ['in-folder'] },
    ] };
    input.expandedParents = new Set(['project:active:in-folder']);
    const rows = buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'folder-header' || row.kind === 'session');

    expect(rows.map((row) => (row.kind === 'session' ? `${row.node.session.id}@${row.depth}` : row.displayName))).toEqual([
      'Outer', 'Outer / Inner', 'in-folder@1', 'child@2', 'top-level@0',
    ]);
  });

  test('builds the folder-heavy 25,000-session projection without duplicating descendant storage', () => {
    const sessions = Array.from({ length: 25_000 }, (_, index) => node(`session-${index}`));
    const input = args([project([group(sessions)])]);
    input.foldersMap = {
      '/repo': Array.from({ length: 1_250 }, (_, folderIndex) => ({
        id: `folder-${folderIndex}`,
        name: `Folder ${folderIndex}`,
        createdAt: folderIndex,
        sessionIds: Array.from({ length: 20 }, (_, itemIndex) => `session-${folderIndex * 20 + itemIndex}`),
      })),
    };

    const model = buildSessionSidebarRowModel(input);

    expect(model.rows.filter((row) => row.kind === 'folder-header')).toHaveLength(1_250);
    expect(model.rows.filter((row) => row.kind === 'session')).toHaveLength(25_000);
    expect(model.selectionDescendantIds).toHaveLength(25_000);
    // 1 Projects zone header + 1 project header + 1,250 folder headers + 25,000 sessions.
    expect(model.rows).toHaveLength(26_252);
  });

  test('keeps normal activity state while search forces the same headers open', () => {
    const repeated = node('recent-match');
    const normal = args([]);
    normal.chatGroup = group([repeated], { id: 'managed-chats' });
    normal.collapsedActivities = new Set(['chats']);
    const normalModel = buildSessionSidebarRowModel(normal);

    const search = { ...normal, mode: 'search' as const, normalizedQuery: 'recent' };
    search.groupSearchDataByGroup = new WeakMap([[search.chatGroup!, {
      filteredNodes: [repeated], matchedSessionCount: 1, folderNameMatchCount: 0, groupMatches: false, hasMatch: true,
    }]]);
    const searchModel = buildSessionSidebarRowModel(search);

    expect(normalModel.rows.find((row) => row.kind === 'activity-header')).toMatchObject({ collapsed: true, forceExpanded: false });
    expect(searchModel.rows.find((row) => row.kind === 'activity-header')).toMatchObject({ collapsed: false, forceExpanded: true });
    expect(normal.collapsedActivities.has('chats')).toBe(true);
  });

  test('emits loading, failure, and permission status rows without treating them as empty success', () => {
    for (const state of ['loading', 'load-failed', 'permission-denied'] as const) {
      const main = group([]);
      const input = args([project([main])]);
      input.groupStatusByKey = new Map([['project-a:main', { state, directory: '/repo', canGrantAccess: state === 'permission-denied' }]]);
      expect(buildSessionSidebarRowModel(input).rows.some((row) => row.kind === 'status' && row.status.state === state)).toBe(true);
    }
  });

  test('resolves sticky identity from logical row ranges', () => {
    const first = project([group([node('a')])]);
    const second = { ...project([group([node('b')])]), project: { id: 'project-b', normalizedPath: '/repo-b' } };
    const model = buildSessionSidebarRowModel(args([first, second]));
    const secondHeader = model.stickyHeaders.find((header) => header.id === 'project-b');

    expect(secondHeader).toBeDefined();
    expect(resolveSessionSidebarStickyHeader(model.stickyHeaders, secondHeader?.rowIndex ?? 0)?.id).toBe('project-b');
  });

  test('timeline mode lists root sessions flat under their project header, without worktree groups', () => {
    const worktree = group([node('worktree-session')], { id: 'worktree:/wt', isMain: false, directory: '/wt', folderScopeKey: '/wt' });
    const input = args([project([group([node('project-session', [node('child')])]), worktree])]);
    input.viewMode = 'timeline';
    input.timelineItems = [timelineItem('a'), timelineItem('b')];

    const model = buildSessionSidebarRowModel(input);
    const sessions = model.rows.filter((row) => row.kind === 'session');

    expect(model.rows[0]).toMatchObject({ kind: 'activity-header', activityKey: 'projects' });
    expect(model.rows[1]).toMatchObject({ kind: 'project-header' });
    expect(model.rows.some((row) => row.kind === 'group-header' || (row.kind === 'activity-header' && row.activityKey !== 'projects'))).toBe(false);
    expect(model.stickyHeaders.map((header) => header.id)).toEqual(['projects', 'project-a']);
    expect(sessions.map((row) => row.node.session.id)).toEqual(['a', 'b']);
    expect(sessions.every((row) => row.renderContext === 'timeline' && row.depth === 0)).toBe(true);
    expect(model.rows.some((row) => row.kind === 'show-control')).toBe(false);
  });

  for (const viewMode of ['projects', 'timeline'] as const) {
    test(`${viewMode} mode reveals three chats and never counts pinned chats against that limit`, () => {
      const chats = [node('pinned-1'), node('pinned-2'), ...Array.from({ length: 6 }, (_, index) => node(`chat-${index}`))];
      const input = args([]);
      input.viewMode = viewMode;
      input.chatGroup = group(chats, { id: 'managed-chats' });
      input.pinnedSessionIds = pinnedIds('pinned-1', 'pinned-2');

      const model = buildSessionSidebarRowModel(input);
      const shown = model.rows.filter((row) => row.kind === 'session').map((row) => row.node.session.id);

      expect(shown).toContain('pinned-1');
      expect(shown).toContain('pinned-2');
      expect(shown.filter((id) => id.startsWith('chat-'))).toHaveLength(3);
      const control = model.rows.find((row) => row.kind === 'show-control');
      expect(control).toMatchObject({ control: 'more', currentCount: 3, increment: 7 });
    });
  }

  test('pinned project sessions spend the reveal limit', () => {
    const nodes = [node('pinned-1'), node('pinned-2'), ...Array.from({ length: 8 }, (_, index) => node(`s${index}`))];
    const input = args([project([group(nodes)])]);
    input.pinnedSessionIds = pinnedIds('pinned-1', 'pinned-2');

    expect(buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'session')).toHaveLength(7);
  });

  test('timeline search counts one match per listed session', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';
    input.mode = 'search';
    input.normalizedQuery = 'a';
    input.timelineItems = [timelineItem('a'), timelineItem('b')];

    expect(buildSessionSidebarRowModel(input).searchMatchCount).toBe(2);
  });

  test('a timeline project without sessions shows only its header', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';

    expect(buildSessionSidebarRowModel(input).rows).toMatchObject([{ kind: 'activity-header', activityKey: 'projects' }, { kind: 'project-header' }]);
    expect(buildSessionSidebarRowModel(input).rows).toHaveLength(2);
  });

  test('an empty worktree group is open whatever was saved, with no rows under it', () => {
    const worktree = group([], { id: 'worktree:/wt', label: 'feature', isMain: false, directory: '/wt', folderScopeKey: '/wt' });
    const input = args([project([group([node('root')]), worktree])]);
    input.collapsedGroups = new Set(['project-a:worktree:/wt']);

    const rows = buildSessionSidebarRowModel(input).rows;
    const header = rows.find((row) => row.kind === 'group-header');

    expect(header).toMatchObject({ empty: true, collapsed: false });
    expect(rows.at(-1)).toBe(header);
  });

  test('a worktree group with sessions keeps its saved collapse', () => {
    const worktree = group([node('wt-session')], { id: 'worktree:/wt', label: 'feature', isMain: false, directory: '/wt', folderScopeKey: '/wt' });
    const input = args([project([group([]), worktree])]);
    input.collapsedGroups = new Set(['project-a:worktree:/wt']);

    const rows = buildSessionSidebarRowModel(input).rows;

    expect(rows.find((row) => row.kind === 'group-header')).toMatchObject({ empty: false, collapsed: true });
    expect(rows.some((row) => row.kind === 'session')).toBe(false);
  });

  test('a folder keeps its saved collapse while its sessions are still loading', () => {
    const input = args([project([group([])])]);
    input.foldersMap = { '/repo': [{ id: 'outer', name: 'Outer', createdAt: 1, sessionIds: ['not-loaded-yet'] }] };
    input.collapsedFolders = new Set(['outer']);
    const folderRow = () => buildSessionSidebarRowModel(input).rows.find((row) => row.kind === 'folder-header');

    input.groupStatusByKey = new Map([['project-a:main', { state: 'loading', directory: null, canGrantAccess: false }]]);
    expect(folderRow()).toMatchObject({ empty: false, collapsed: true });

    input.groupStatusByKey = new Map([['project-a:main', { state: 'ready', directory: '/repo', canGrantAccess: false }]]);
    expect(folderRow()).toMatchObject({ empty: true, collapsed: false });
  });

  test('timeline mode shows the sidebar empty row without projects', () => {
    const input = args([]);
    input.viewMode = 'timeline';

    expect(buildSessionSidebarRowModel(input).rows).toMatchObject([{ kind: 'empty', emptyKind: 'sidebar' }]);
  });

  describe('multi-run rows', () => {
    const runMember = (id: string): Session => ({
      ...session(id),
      metadata: withMultiRunMembership({}, {
        version: 1, sessionID: id, group: { kind: 'id', id: '9f512893-6e63-4e49-a534-5de733ca103e' },
        groupSlug: 'fix-auth', role: 'run', providerID: 'anthropic', modelID: 'claude', title: 'Fix auth',
      }),
    });
    const runIndex = buildMultiRunIndex([runMember('lane-1'), runMember('lane-2')], () => '/repo');
    const runKey = [...runIndex.runs.keys()][0] ?? '';

    test('lanes collapse into one run row at the first lane, outside selection', () => {
      const input = args([project([group([node('lane-1'), node('other'), node('lane-2')])])]);
      input.runIndex = runIndex;
      const model = buildSessionSidebarRowModel(input);
      const listed = model.rows.flatMap((row) => (row.kind === 'run' ? [`run:${row.run.title}`] : row.kind === 'session' ? [row.node.session.id] : []));

      expect(listed).toEqual(['run:Fix auth', 'other']);
      expect(model.selectionEntries.map((entry) => entry.id)).toEqual(['other']);
    });

    test('an expanded run lists its lanes one level deeper', () => {
      const input = args([project([group([node('lane-1'), node('lane-2')])])]);
      input.runIndex = runIndex;
      input.expandedParents = new Set([runExpansionKey('project', runKey)]);
      const rows = buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'run' || row.kind === 'session');

      expect(rows.map((row) => (row.kind === 'session' ? `${row.node.session.id}@${row.depth}` : `run@${row.depth}`))).toEqual(['run@0', 'lane-1@1', 'lane-2@1']);
    });

    test('a run inside a folder and its lanes sit one level deeper', () => {
      const input = args([project([group([node('lane-1'), node('lane-2')])])]);
      input.runIndex = runIndex;
      input.foldersMap = { '/repo': [{ id: 'folder-a', name: 'Folder', createdAt: 1, sessionIds: ['lane-1', 'lane-2'] }] };
      input.expandedParents = new Set([runExpansionKey('project', runKey)]);
      const rows = buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'run' || row.kind === 'session');

      expect(rows.map((row) => (row.kind === 'session' ? `${row.node.session.id}@${row.depth}` : `run@${row.depth}`))).toEqual(['run@1', 'lane-1@2', 'lane-2@2']);
    });

    test('a run spends one slot of the reveal limit', () => {
      const nodes = [node('lane-1'), node('lane-2'), ...Array.from({ length: 7 }, (_, index) => node(`s${index}`))];
      const input = args([project([group(nodes)])]);
      input.runIndex = runIndex;
      const model = buildSessionSidebarRowModel(input);

      expect(model.rows.filter((row) => row.kind === 'run')).toHaveLength(1);
      expect(model.rows.filter((row) => row.kind === 'session')).toHaveLength(6);
    });

    test('an In work run row never expands and carries the sessions that block its lanes', () => {
      const input = args([]);
      input.runIndex = runIndex;
      input.workItems = [
        timelineItem('lane-1', { blockingBadgeSessionScopes: [{ directory: '/repo', sessionIDs: ['lane-1', 'lane-1-child'] }] }),
        timelineItem('lane-2', { blockingBadgeSessionScopes: [{ directory: '/repo', sessionIDs: ['lane-2'] }] }),
      ];
      input.workSessionIds = new Set(['lane-1', 'lane-2']);
      input.expandedParents = new Set([runExpansionKey('mixed-compact', runKey)]);
      const rows = buildSessionSidebarRowModel(input).rows;
      const run = rows.find((row) => row.kind === 'run');

      expect(rows.some((row) => row.kind === 'session')).toBe(false);
      expect(run?.kind === 'run' && [...run.blockingSessionIds]).toEqual(['lane-1', 'lane-1-child', 'lane-2']);
    });

    test('a timeline run row carries the sessions that block its lanes', () => {
      const input = args([project([group([])])]);
      input.viewMode = 'timeline';
      input.runIndex = runIndex;
      input.timelineItems = [
        timelineItem('lane-1', { blockingBadgeSessionScopes: [{ directory: '/repo', sessionIDs: ['lane-1', 'lane-1-subagent'] }] }),
        timelineItem('lane-2', { blockingBadgeSessionScopes: [{ directory: '/repo', sessionIDs: ['lane-2'] }] }),
      ];
      const run = buildSessionSidebarRowModel(input).rows.find((row) => row.kind === 'run');

      expect(run?.kind === 'run' && [...run.blockingSessionIds]).toEqual(['lane-1', 'lane-1-subagent', 'lane-2']);
    });

    test('timeline items collapse into one run row', () => {
      const input = args([project([group([])])]);
      input.viewMode = 'timeline';
      input.runIndex = runIndex;
      input.timelineItems = [timelineItem('lane-1'), timelineItem('a'), timelineItem('lane-2')];
      const rows = buildSessionSidebarRowModel(input).rows.filter((row) => row.kind === 'run' || row.kind === 'session');

      expect(rows.map((row) => (row.kind === 'session' ? row.node.session.id : row.kind))).toEqual(['run', 'a']);
    });
  });

  test('retains current session authority when presentation filters the row out', () => {
    const authoritative = project([group([node('hidden')])]);
    const input = args([]);
    input.authoritativeSections = [authoritative];

    expect(buildSessionSidebarRowModel(input).sessionById.get('hidden')?.id).toBe('hidden');
  });
});

describe('buildSessionSidebarRowModel attention and pinned zones', () => {
  const headersOf = (input: SessionSidebarRowModelArgs) => buildSessionSidebarRowModel(input).rows
    .flatMap((row) => (row.kind === 'activity-header' ? [row.activityKey] : []));
  // Session rows in document order, each tagged with the zone or project it
  // sits under: the header above it, or 'project' once the project tree starts.
  // Order inside the project group follows lifecycle sorting, which these
  // fixtures do not control, so project placements are compared as a set.
  const placementsOf = (input: SessionSidebarRowModelArgs): string[] => {
    const placements: string[] = [];
    let current = 'project';
    for (const row of buildSessionSidebarRowModel(input).rows) {
      if (row.kind === 'activity-header') current = row.activityKey;
      else if (row.kind === 'project-header') current = 'project';
      else if (row.kind === 'session') placements.push(`${current}:${row.node.session.id}`);
    }
    return placements;
  };

  test('attention sits ahead of Chats with its own header and keeps its sessions in their project group', () => {
    const urgent = node('urgent');
    const input = args([project([group([urgent, node('other')])])]);
    input.chatGroup = group([node('chat')], { id: 'chats', directory: '/chats', folderScopeKey: '/chats' });
    input.attentionItems = [timelineItem('urgent')];

    const model = buildSessionSidebarRowModel(input);

    expect(model.rows[0]).toMatchObject({ kind: 'activity-header', activityKey: 'attention', key: 'activity:attention:header' });
    expect(headersOf(input)).toEqual(['attention', 'chats', 'projects']);
    const placements = placementsOf(input);
    expect(placements.slice(0, 2)).toEqual(['attention:urgent', 'chats:chat']);
    expect(placements.slice(2).sort()).toEqual(['project:other', 'project:urgent']);
  });

  test('pinned sits above attention and Chats, and also duplicates into the project group', () => {
    const urgent = node('urgent');
    const pinned = node('pinned');
    const input = args([project([group([urgent, pinned, node('other')])])]);
    input.chatGroup = group([node('chat')], { id: 'chats', directory: '/chats', folderScopeKey: '/chats' });
    input.attentionItems = [timelineItem('urgent')];
    input.pinnedItems = [timelineItem('pinned')];

    expect(headersOf(input)).toEqual(['pinned', 'attention', 'chats', 'projects']);
    const placements = placementsOf(input);
    expect(placements.slice(0, 3)).toEqual(['pinned:pinned', 'attention:urgent', 'chats:chat']);
    expect(placements.slice(3).sort()).toEqual(['project:other', 'project:pinned', 'project:urgent']);
  });

  test('empty attention and pinned lists render no header', () => {
    const input = args([project([group([node('other')])])]);
    input.attentionItems = [];
    input.pinnedItems = [];

    expect(headersOf(input)).toEqual(['projects']);

    const omitted = args([project([group([node('other')])])]);
    expect(headersOf(omitted)).toEqual(['projects']);
  });

  test('a collapsed zone keeps its header and hides its items', () => {
    const input = args([project([group([node('urgent'), node('pinned')])])]);
    input.attentionItems = [timelineItem('urgent')];
    input.pinnedItems = [timelineItem('pinned')];
    input.collapsedActivities = new Set(['attention', 'pinned']);

    const model = buildSessionSidebarRowModel(input);
    const headers = model.rows.filter((row) => row.kind === 'activity-header');

    expect(headers.map((row) => [row.activityKey, row.collapsed])).toEqual([['pinned', true], ['attention', true], ['projects', false]]);
    expect(placementsOf(input).sort()).toEqual(['project:pinned', 'project:urgent']);
  });

  test('a pinned session in work appears under Pinned and Work and stays in its project group', () => {
    const both = node('both');
    const input = args([project([group([both, node('other')])])]);
    input.pinnedItems = [timelineItem('both')];
    input.workItems = [timelineItem('both')];
    input.workSessionIds = new Set(['both']);

    expect(headersOf(input)).toEqual(['pinned', 'work', 'projects']);
    const placements = placementsOf(input);
    expect(placements.slice(0, 2)).toEqual(['pinned:both', 'work:both']);
    expect(placements.slice(2).sort()).toEqual(['project:both', 'project:other']);
  });
});

describe('buildSessionSidebarRowModel projects zone', () => {
  const kindsOf = (input: SessionSidebarRowModelArgs) => buildSessionSidebarRowModel(input).rows
    .map((row) => (row.kind === 'activity-header' ? `activity:${row.activityKey}` : row.kind === 'session' ? `session:${row.node.session.id}` : row.kind));

  test('one Projects header sits above the project sections in the projects view', () => {
    const input = args([project([group([node('a')])])]);

    const model = buildSessionSidebarRowModel(input);

    expect(model.rows[0]).toMatchObject({ kind: 'activity-header', activityKey: 'projects', key: 'activity:projects:header', collapsed: false, forceExpanded: false });
    expect(kindsOf(input)).toEqual(['activity:projects', 'project-header', 'session:a']);
    expect(model.stickyHeaders.map((header) => `${header.kind}:${header.id}`)).toEqual(['activity:projects', 'project:project-a']);
  });

  test('a collapsed Projects zone hides every project row and keeps the zones above it', () => {
    const working = node('working');
    const input = args([project([group([working, node('other')])])]);
    input.chatGroup = group([node('chat')], { id: 'chats', directory: '/chats', folderScopeKey: '/chats' });
    input.workItems = [timelineItem('working')];
    input.workSessionIds = new Set(['working']);
    input.collapsedActivities = new Set(['projects']);

    const model = buildSessionSidebarRowModel(input);

    expect(kindsOf(input)).toEqual(['activity:work', 'session:working', 'activity:chats', 'session:chat', 'activity:projects']);
    expect(model.rows.at(-1)).toMatchObject({ kind: 'activity-header', activityKey: 'projects', collapsed: true });
    // Only project sessions are gone from selection; the zones keep theirs.
    expect(model.selectionEntries.map((entry) => entry.id)).toEqual(['working', 'chat']);
  });

  test('a collapsed Projects zone alone is not an empty sidebar', () => {
    const input = args([project([group([node('a')])])]);
    input.collapsedActivities = new Set(['projects']);

    expect(kindsOf(input)).toEqual(['activity:projects']);
  });

  test('no Projects header without a project section', () => {
    expect(kindsOf(args([]))).toEqual(['empty']);
  });

  test('the timeline view has the Projects header over its project headers too', () => {
    const input = args([project([group([node('a')])])]);
    input.viewMode = 'timeline';
    input.timelineItems = [timelineItem('a')];

    expect(kindsOf(input)).toEqual(['activity:projects', 'project-header', 'session:a']);
  });

  test('a collapsed Projects zone hides the timeline project list', () => {
    const input = args([project([group([node('a')])])]);
    input.viewMode = 'timeline';
    input.timelineItems = [timelineItem('a')];
    input.collapsedActivities = new Set(['projects']);

    expect(kindsOf(input)).toEqual(['activity:projects']);
  });

  test('single-project mode has no Projects header', () => {
    const input = args([project([group([node('a')])])]);
    input.singleProjectMode = true;
    input.singleProjectId = 'project-a';

    expect(kindsOf(input)).toEqual(['project-header', 'session:a']);
  });

  test('the main-workspace-only list has no Projects header', () => {
    const input = args([project([group([node('a')])])]);
    input.showOnlyMainWorkspace = true;

    expect(kindsOf(input)).toEqual(['session:a']);
  });

  test('search forces a collapsed Projects zone open, like the project headers', () => {
    const main = group([node('match')]);
    const input = args([project([main])]);
    input.mode = 'search';
    input.normalizedQuery = 'match';
    input.groupSearchDataByGroup.set(main, { filteredNodes: main.sessions, matchedSessionCount: 1, folderNameMatchCount: 0, groupMatches: false, hasMatch: true });
    input.collapsedActivities = new Set(['projects']);

    const model = buildSessionSidebarRowModel(input);

    expect(model.rows[0]).toMatchObject({ kind: 'activity-header', activityKey: 'projects', collapsed: false, forceExpanded: true });
    expect(model.rows[1]).toMatchObject({ kind: 'project-header', forceExpanded: true });
    expect(kindsOf(input)).toEqual(['activity:projects', 'project-header', 'session:match']);
  });

  test('a search with no project match shows neither a Projects header nor a project header', () => {
    const main = group([node('miss')]);
    const input = args([project([main])]);
    input.mode = 'search';
    input.normalizedQuery = 'zzz';
    input.groupSearchDataByGroup.set(main, { filteredNodes: [], matchedSessionCount: 0, folderNameMatchCount: 0, groupMatches: false, hasMatch: false });

    expect(kindsOf(input)).toEqual(['empty']);
  });
});

describe('buildSessionSidebarRowModel zone order', () => {
  const headersOf = (input: SessionSidebarRowModelArgs) => buildSessionSidebarRowModel(input).rows
    .flatMap((row) => (row.kind === 'activity-header' ? [row.activityKey] : []));
  // Every zone populated, so the order alone decides the header sequence.
  const everyZone = (): SessionSidebarRowModelArgs => {
    const input = args([project([group([node('pinned'), node('urgent'), node('working'), node('other')])])]);
    input.chatGroup = group([node('chat')], { id: 'chats', directory: '/chats', folderScopeKey: '/chats' });
    input.pinnedItems = [timelineItem('pinned')];
    input.attentionItems = [timelineItem('urgent')];
    input.workItems = [timelineItem('working')];
    input.workSessionIds = new Set(['working']);
    return input;
  };

  test('zones follow the given order, with the project tree under the Projects header wherever it lands', () => {
    const input = everyZone();
    input.zoneOrder = ['projects', 'chats', 'work', 'attention', 'pinned'];

    const rows = buildSessionSidebarRowModel(input).rows;

    expect(headersOf(input)).toEqual(['projects', 'chats', 'work', 'attention', 'pinned']);
    expect(rows.findIndex((row) => row.kind === 'project-header')).toBe(1);
    expect(rows.map((row) => row.key).filter((key) => key.endsWith(':header')))
      .toEqual(['activity:projects:header', 'project:project-a:header', 'activity:chats:header', 'activity:work:header', 'activity:attention:header', 'activity:pinned:header']);
  });

  test('no order given means the order the sidebar always had', () => {
    expect(headersOf(everyZone())).toEqual(['pinned', 'attention', 'work', 'chats', 'projects']);
  });

  test('a zone missing from the order is left out, so callers pass a normalised order', () => {
    const input = everyZone();
    input.zoneOrder = ['chats', 'projects'];

    expect(headersOf(input)).toEqual(['chats', 'projects']);
  });

  test('zones that are off or empty are skipped in a custom order too', () => {
    const input = everyZone();
    input.zoneOrder = ['chats', 'projects', 'work', 'pinned', 'attention'];
    input.pinnedItems = [];
    input.attentionItems = undefined;

    expect(headersOf(input)).toEqual(['chats', 'projects', 'work']);
  });

  test('the timeline view follows the same order, with the per-project timeline under Projects', () => {
    const input = args([project([group([])])]);
    input.viewMode = 'timeline';
    input.zoneOrder = ['projects', 'chats', 'pinned', 'attention', 'work'];
    input.chatGroup = group([node('chat')], { id: 'chats', directory: '/chats', folderScopeKey: '/chats' });
    input.timelineItems = [timelineItem('pinned'), timelineItem('other')];
    input.pinnedItems = [timelineItem('pinned')];

    const rows = buildSessionSidebarRowModel(input).rows;
    const headers = rows.flatMap((row) => (row.kind === 'activity-header' ? [row.activityKey] : row.kind === 'project-header' ? [row.section.project.id] : []));

    expect(headers).toEqual(['projects', 'project-a', 'chats', 'pinned']);
  });

  test('sticky headers keep document order under a custom zone order', () => {
    const input = everyZone();
    input.zoneOrder = ['projects', 'chats', 'pinned', 'attention', 'work'];

    const model = buildSessionSidebarRowModel(input);

    expect(model.stickyHeaders.map((header) => header.id)).toEqual(['projects', 'project-a', 'chats', 'pinned', 'attention', 'work']);
    expect(model.stickyHeaders.map((header) => header.rowIndex)).toEqual([...model.stickyHeaders.map((header) => header.rowIndex)].sort((left, right) => left - right));
  });
});
