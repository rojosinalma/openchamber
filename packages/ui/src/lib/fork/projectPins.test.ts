import { describe, expect, test } from 'bun:test';

import { pinnedProjectIds, pinnedProjectsFirst, storeProjectIndices } from './projectPins';

type Item = { id: string; pinned?: boolean };
const ids = (list: readonly Item[]): string[] => list.map((item) => item.id);
const isPinned = (item: Item): boolean => item.pinned === true;

describe('pinnedProjectsFirst', () => {
  test('moves pinned projects to the top and keeps both parts in their incoming order', () => {
    const items: Item[] = [{ id: 'a' }, { id: 'b', pinned: true }, { id: 'c' }, { id: 'd', pinned: true }];
    expect(ids(pinnedProjectsFirst(items, isPinned))).toEqual(['b', 'd', 'a', 'c']);
  });

  test('returns the same list when nothing moves', () => {
    const none: Item[] = [{ id: 'a' }, { id: 'b' }];
    const all: Item[] = [{ id: 'a', pinned: true }, { id: 'b', pinned: true }];
    const ordered: Item[] = [{ id: 'a', pinned: true }, { id: 'b' }];
    expect(pinnedProjectsFirst(none, isPinned)).toBe(none);
    expect(pinnedProjectsFirst(all, isPinned)).toBe(all);
    expect(pinnedProjectsFirst(ordered, isPinned)).toBe(ordered);
  });
});

describe('pinnedProjectIds', () => {
  test('lists only projects pinned with true', () => {
    expect([...pinnedProjectIds([{ id: 'a', pinned: true }, { id: 'b', pinned: false }, { id: 'c' }])]).toEqual(['a']);
  });
});

describe('storeProjectIndices', () => {
  const store = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('maps the dragged and target ids to store positions', () => {
    expect(storeProjectIndices(store, 'c', 'a')).toEqual({ from: 2, to: 0 });
  });

  test('is null when an id is not a stored project', () => {
    expect(storeProjectIndices(store, 'x', 'a')).toBeNull();
    expect(storeProjectIndices(store, 'a', 'x')).toBeNull();
  });
});
