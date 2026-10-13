import { createJSONStorage } from 'zustand/middleware';
import { afterAll, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'window');
const testWindow = new Window();
Object.defineProperty(globalThis, 'window', { configurable: true, value: testWindow });
const { DEFAULT_SIDEBAR_SINGLE_LINE_ROWS, DEFAULT_SIDEBAR_ZONE_ORDER, migrateSessionDisplayState, moveSidebarZone, moveSidebarZoneTo, normalizeSidebarZoneOrder, useSessionDisplayStore } = await import('./useSessionDisplayStore');
const { DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS } = await import('@/lib/sidebarTimeWindows');
afterAll(() => {
  testWindow.close();
  if (previousStorage) Object.defineProperty(globalThis, 'window', previousStorage);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('useSessionDisplayStore worktree sorting', () => {
  test('defaults to manual ordering', () => {
    expect(useSessionDisplayStore.getState().worktreeSortOrder).toBe('manual');
  });

  test('v8→v9 starts existing users on manual ordering', () => {
    expect(migrateSessionDisplayState({}, 8).worktreeSortOrder).toBe('manual');
  });
});

describe('useSessionDisplayStore project sorting', () => {
  test('defaults to manual ordering', () => {
    expect(useSessionDisplayStore.getState().projectSortOrder).toBe('manual');
  });

  test('migrates the v2 recent default to manual', () => {
    const migrated = migrateSessionDisplayState({ projectSortOrder: 'recent' }, 2);

    expect(migrated.projectSortOrder).toBe('manual');
  });

  for (const projectSortOrder of ['manual', 'a-z', 'z-a', 'date-added'] as const) {
    test(`preserves the v2 ${projectSortOrder} sort order`, () => {
      const migrated = migrateSessionDisplayState({ projectSortOrder }, 2);

      expect(migrated.projectSortOrder).toBe(projectSortOrder);
    });
  }

  test('v3→v4 drops the removed displayMode key and keeps the rest', () => {
    const migrated = migrateSessionDisplayState(
      { displayMode: 'default', projectSortOrder: 'a-z', showArchivedSessions: true },
      3,
    );

    expect('displayMode' in migrated).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
    expect(migrated.showArchivedSessions).toBe(true);
  });
});

describe('useSessionDisplayStore project display', () => {
  test('defaults to showing all projects without a selected single project', () => {
    expect(useSessionDisplayStore.getState().projectDisplayMode).toBe('all');
    expect(useSessionDisplayStore.getState().singleProjectId).toBeNull();
  });

  test('stores the single-project mode independently from the view mode', () => {
    useSessionDisplayStore.getState().setProjectDisplayMode('single');
    useSessionDisplayStore.getState().setSingleProjectId('project-alpha');
    useSessionDisplayStore.getState().setSidebarViewMode('projects');

    expect(useSessionDisplayStore.getState().projectDisplayMode).toBe('single');
    expect(useSessionDisplayStore.getState().singleProjectId).toBe('project-alpha');
    expect(useSessionDisplayStore.getState().sidebarViewMode).toBe('projects');

    useSessionDisplayStore.setState({
      projectDisplayMode: 'all',
      singleProjectId: null,
      sidebarViewMode: 'timeline',
    });
  });
});

describe('useSessionDisplayStore view mode', () => {
  test('starts new installs on the timeline view', () => {
    expect(useSessionDisplayStore.getState().sidebarViewMode).toBe('timeline');
  });

  test('v9→v10 drops the removed Recent toggle and keeps the rest', () => {
    const migrated = migrateSessionDisplayState({ showRecentSection: true, projectSortOrder: 'a-z' }, 9);

    expect('showRecentSection' in migrated).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
  });

  test('v5→v6 drops the removed grouping key and keeps the rest', () => {
    const migrated = migrateSessionDisplayState(
      { sessionGroupingMode: 'flat', projectSortOrder: 'a-z' },
      5,
    );

    expect('sessionGroupingMode' in migrated).toBe(false);
    expect(migrated.projectSortOrder).toBe('a-z');
  });
});


describe('useSessionDisplayStore attention and pinned zones', () => {
  test('both zones default to off', () => {
    expect(useSessionDisplayStore.getState().showAttentionSection).toBe(false);
    expect(useSessionDisplayStore.getState().showPinnedSection).toBe(false);
  });

  test('v9→v10 fills the two new flags with false, drops Recent and keeps the rest', () => {
    const migrated = migrateSessionDisplayState({ showRecentSection: true, projectSortOrder: 'a-z' }, 9);

    expect(migrated.showAttentionSection).toBe(false);
    expect(migrated.showPinnedSection).toBe(false);
    expect((migrated as { showRecentSection?: boolean }).showRecentSection).toBeUndefined();
    expect(migrated.projectSortOrder).toBe('a-z');
  });

  test('v9→v10 keeps flags already stored as booleans', () => {
    const migrated = migrateSessionDisplayState({ showAttentionSection: true, showPinnedSection: true }, 9);

    expect(migrated.showAttentionSection).toBe(true);
    expect(migrated.showPinnedSection).toBe(true);
  });

  test('persists at version 14', () => {
    expect(useSessionDisplayStore.persist.getOptions().version).toBe(14);
  });
});

describe('useSessionDisplayStore zone appearance', () => {
  test('starts without overrides', () => {
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({});
  });

  test('v13→v14 adds an empty map and keeps what a newer snapshot stored, cleaned', () => {
    expect(migrateSessionDisplayState({ sidebarSingleLineRows: false }, 13).sidebarZoneAppearance).toEqual({});
    const migrated = migrateSessionDisplayState({
      sidebarZoneAppearance: { chats: { icon: 'star', color: 'nope' }, bogus: { icon: 'star' }, work: { icon: 'unknown-glyph' } },
    }, 13);
    expect(migrated.sidebarZoneAppearance).toEqual({ chats: { icon: 'star' } });
  });

  test('the setters store only what differs from the default, the reset clears the zone', () => {
    const store = useSessionDisplayStore.getState();
    store.setZoneAppearance('chats', { color: 'keyword' });
    store.setZoneAppearance('chats', { icon: 'star' });
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ chats: { icon: 'star', color: 'keyword' } });
    // Back on the default icon: the field goes, the colour stays.
    store.setZoneAppearance('chats', { icon: 'chat-4' });
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ chats: { color: 'keyword' } });
    store.setZoneAppearance('work', { icon: 'play' });
    store.resetZoneAppearance('chats');
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ work: { icon: 'play' } });
    store.setSidebarZoneAppearance({ pinned: { color: 'string' }, work: 'garbage' });
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({ pinned: { color: 'string' } });
    store.setSidebarZoneAppearance(null);
    expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({});
  });
});

describe('useSessionDisplayStore single-line rows', () => {
  test('defaults to on', () => {
    expect(DEFAULT_SIDEBAR_SINGLE_LINE_ROWS).toBe(true);
    expect(useSessionDisplayStore.getState().sidebarSingleLineRows).toBe(true);
  });

  test('v12→v13 turns the switch on for a snapshot without it and keeps the rest', () => {
    const migrated = migrateSessionDisplayState({ showPinnedSection: true, sidebarAttentionWindowHours: 72 }, 12);

    expect(migrated.sidebarSingleLineRows).toBe(true);
    expect(migrated.showPinnedSection).toBe(true);
    expect(migrated.sidebarAttentionWindowHours).toBe(72);
  });

  test('v12→v13 keeps a stored boolean and replaces anything else', () => {
    expect(migrateSessionDisplayState({ sidebarSingleLineRows: false }, 12).sidebarSingleLineRows).toBe(false);
    expect(migrateSessionDisplayState({ sidebarSingleLineRows: 'off' }, 12).sidebarSingleLineRows).toBe(true);
    expect(migrateSessionDisplayState({ displayMode: 'grouped' }, 1).sidebarSingleLineRows).toBe(true);
  });

  test('the setter and the toggle flip the switch', () => {
    const { setSidebarSingleLineRows, toggleSidebarSingleLineRows } = useSessionDisplayStore.getState();

    setSidebarSingleLineRows(false);
    expect(useSessionDisplayStore.getState().sidebarSingleLineRows).toBe(false);
    toggleSidebarSingleLineRows();
    expect(useSessionDisplayStore.getState().sidebarSingleLineRows).toBe(true);
  });
});

describe('useSessionDisplayStore attention window', () => {
  test('defaults to the 48 h attention window that was a constant before', () => {
    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(48);
    expect(DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS).toBe(48);
  });

  test('v11→v12 fills the window with the default and keeps the rest', () => {
    const migrated = migrateSessionDisplayState({ showPinnedSection: true, sidebarZoneOrder: ['projects'] }, 11);

    expect(migrated.sidebarAttentionWindowHours).toBe(48);
    expect(migrated.showPinnedSection).toBe(true);
    expect(migrated.sidebarZoneOrder).toEqual(['projects']);
  });

  test('v11→v12 keeps a usable stored value and normalises the rest', () => {
    expect(migrateSessionDisplayState({ sidebarAttentionWindowHours: 'bogus' }, 11).sidebarAttentionWindowHours).toBe(48);
    expect(migrateSessionDisplayState({ sidebarAttentionWindowHours: 72 }, 11).sidebarAttentionWindowHours).toBe(72);
    expect(migrateSessionDisplayState({ sidebarAttentionWindowHours: 0 }, 11).sidebarAttentionWindowHours).toBe(1);
    expect(migrateSessionDisplayState({ sidebarAttentionWindowHours: 9999 }, 11).sidebarAttentionWindowHours).toBe(720);
  });

  test('a v1 snapshot migrates through every step and lands on the default', () => {
    expect(migrateSessionDisplayState({ displayMode: 'grouped' }, 1).sidebarAttentionWindowHours).toBe(48);
  });

  test('the setter stores whole hours within the limits and falls back to the default otherwise', () => {
    const { setSidebarAttentionWindowHours } = useSessionDisplayStore.getState();

    setSidebarAttentionWindowHours(12.4);
    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(12);
    setSidebarAttentionWindowHours(1000);
    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(720);

    setSidebarAttentionWindowHours(Number.NaN);
    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(48);
    setSidebarAttentionWindowHours(undefined);
    expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(48);
  });
});

describe('useSessionDisplayStore zone order', () => {
  const DEFAULT = ['pinned', 'attention', 'work', 'chats', 'projects'];

  test('defaults to the order the sidebar always had', () => {
    expect(useSessionDisplayStore.getState().sidebarZoneOrder).toEqual(DEFAULT);
    expect([...DEFAULT_SIDEBAR_ZONE_ORDER]).toEqual(DEFAULT);
  });

  test('v10→v11 fills the order with the default and keeps the rest', () => {
    const migrated = migrateSessionDisplayState({ showPinnedSection: true, projectSortOrder: 'a-z' }, 10);

    expect(migrated.sidebarZoneOrder).toEqual(DEFAULT);
    expect(migrated.showPinnedSection).toBe(true);
    expect(migrated.projectSortOrder).toBe('a-z');
  });

  test('v10→v11 normalises an order already stored', () => {
    const migrated = migrateSessionDisplayState({ sidebarZoneOrder: ['projects', 'bogus', 'chats', 'chats', 'active-now'] }, 10);

    expect(migrated.sidebarZoneOrder).toEqual(['projects', 'chats', 'pinned', 'attention', 'work']);
  });

  test('normalizeSidebarZoneOrder keeps known keys in order, drops unknown and duplicate keys, appends missing ones', () => {
    expect(normalizeSidebarZoneOrder(['chats', 'projects', 'chats', 'timeline', 'active-now', ''])).toEqual(['chats', 'projects', 'pinned', 'attention', 'work']);
    expect(normalizeSidebarZoneOrder(undefined)).toEqual(DEFAULT);
    expect(normalizeSidebarZoneOrder([])).toEqual(DEFAULT);
  });

  test('setSidebarZoneOrder stores the normalised order', () => {
    useSessionDisplayStore.getState().setSidebarZoneOrder(['projects', 'chats']);

    expect(useSessionDisplayStore.getState().sidebarZoneOrder).toEqual(['projects', 'chats', 'pinned', 'attention', 'work']);

    useSessionDisplayStore.getState().setSidebarZoneOrder(DEFAULT_SIDEBAR_ZONE_ORDER);
  });

  test('moveSidebarZone swaps with the adjacent zone and stops at the ends', () => {
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'chats', 'up')).toEqual(['pinned', 'attention', 'chats', 'work', 'projects']);
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'chats', 'down')).toEqual(['pinned', 'attention', 'work', 'projects', 'chats']);
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'pinned', 'up')).toEqual(DEFAULT);
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'projects', 'down')).toEqual(DEFAULT);
  });

  test('moveSidebarZone skips zones that are not rendered', () => {
    // Pinned, attention and work are off: Chats moving up has nothing above
    // it on screen, and Projects moving up lands above Chats.
    const rendered = ['chats', 'projects'] as const;
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'chats', 'up', rendered)).toEqual(DEFAULT);
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'projects', 'up', rendered)).toEqual(['pinned', 'attention', 'work', 'projects', 'chats']);
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'work', 'up', ['work', 'projects'])).toEqual(DEFAULT);
    expect(moveSidebarZone(DEFAULT_SIDEBAR_ZONE_ORDER, 'projects', 'up', ['pinned', 'projects'])).toEqual(['projects', 'pinned', 'attention', 'work', 'chats']);
  });

  test('moveSidebarZoneTo drops a zone right above or below the target it was dropped on', () => {
    // Dragging Projects (below) onto Pinned (above) lands above Pinned.
    expect(moveSidebarZoneTo(DEFAULT_SIDEBAR_ZONE_ORDER, 'projects', 'pinned')).toEqual(['projects', 'pinned', 'attention', 'work', 'chats']);
    // Dragging Pinned (above) onto Work (below) lands below Work.
    expect(moveSidebarZoneTo(DEFAULT_SIDEBAR_ZONE_ORDER, 'pinned', 'work')).toEqual(['attention', 'work', 'pinned', 'chats', 'projects']);
    // With Attention and Work hidden, Projects dropped on Chats lands above
    // Chats and the hidden zones stay above both.
    expect(moveSidebarZoneTo(DEFAULT_SIDEBAR_ZONE_ORDER, 'projects', 'chats', ['pinned', 'chats', 'projects'])).toEqual(['pinned', 'attention', 'work', 'projects', 'chats']);
    expect(moveSidebarZoneTo(DEFAULT_SIDEBAR_ZONE_ORDER, 'chats', 'chats')).toEqual(DEFAULT);
    expect(moveSidebarZoneTo(DEFAULT_SIDEBAR_ZONE_ORDER, 'chats', 'projects', ['chats'])).toEqual(DEFAULT);
  });

  test('the store action moves within the rendered zones and persists the result', () => {
    useSessionDisplayStore.getState().moveSidebarZone('projects', 'up', ['chats', 'projects']);
    expect(useSessionDisplayStore.getState().sidebarZoneOrder).toEqual(['pinned', 'attention', 'work', 'projects', 'chats']);

    useSessionDisplayStore.getState().setSidebarZoneOrder(DEFAULT_SIDEBAR_ZONE_ORDER);
  });
});

describe('useSessionDisplayStore animated activity', () => {
  test('hydrates existing v8 data with motion off and retains saved choices', async () => {
    const initialState = useSessionDisplayStore.getState();
    const originalStorage = useSessionDisplayStore.persist.getOptions().storage;
    let stored = JSON.stringify({ version: 8, state: { sidebarViewMode: 'timeline', showRecentSection: false } });
    const storage = createJSONStorage<Partial<ReturnType<typeof useSessionDisplayStore.getState>>>(() => ({
      getItem: () => stored,
      setItem: (_name, value) => { stored = value; },
      removeItem: () => { stored = ''; },
    }));
    useSessionDisplayStore.persist.setOptions({ storage });
    try {
      await useSessionDisplayStore.persist.rehydrate();
      expect(useSessionDisplayStore.getState().animatedActivityIndicators).toBe(false);
      expect(useSessionDisplayStore.getState().sidebarViewMode).toBe('timeline');
      expect(useSessionDisplayStore.getState().sidebarZoneOrder).toEqual(['pinned', 'attention', 'work', 'chats', 'projects']);
      expect(useSessionDisplayStore.getState().sidebarAttentionWindowHours).toBe(48);
      expect(useSessionDisplayStore.getState().sidebarSingleLineRows).toBe(true);
      expect(useSessionDisplayStore.getState().sidebarZoneAppearance).toEqual({});
      expect(useSessionDisplayStore.persist.getOptions().version).toBe(14);
      useSessionDisplayStore.getState().setAnimatedActivityIndicators(true);
      const enabledSnapshot = stored;
      useSessionDisplayStore.setState({ animatedActivityIndicators: false });
      stored = enabledSnapshot;
      await useSessionDisplayStore.persist.rehydrate();
      expect(useSessionDisplayStore.getState().animatedActivityIndicators).toBe(true);
      expect('showRecentSection' in useSessionDisplayStore.getState()).toBe(false);
    } finally {
      useSessionDisplayStore.persist.setOptions({ storage: originalStorage });
      useSessionDisplayStore.setState(initialState);
    }
  });
});
