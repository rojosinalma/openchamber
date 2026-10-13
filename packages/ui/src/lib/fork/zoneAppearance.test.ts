import { describe, expect, test } from 'bun:test';

import {
  DEFAULT_ZONE_APPEARANCE,
  ZONE_COLORS,
  ZONE_ICONS,
  normalizeSidebarZoneAppearance,
  resolveZoneAppearance,
  withZoneAppearance,
  withoutZoneAppearance,
} from './zoneAppearance';

describe('zone appearance model', () => {
  test('every default sits in the curated sets', () => {
    for (const { icon, color } of Object.values(DEFAULT_ZONE_APPEARANCE)) {
      expect(ZONE_ICONS).toContain(icon);
      expect(ZONE_COLORS.map((entry) => entry.key)).toContain(color);
    }
  });

  test('normalize keeps known zones, icons and colours and drops the rest', () => {
    expect(normalizeSidebarZoneAppearance(undefined)).toEqual({});
    expect(normalizeSidebarZoneAppearance(null)).toEqual({});
    expect(normalizeSidebarZoneAppearance('chats')).toEqual({});
    expect(normalizeSidebarZoneAppearance(['chats'])).toEqual({});
    expect(normalizeSidebarZoneAppearance({
      chats: { icon: 'star', color: 'keyword' },
      work: { icon: 'not-a-glyph', color: 'info' },
      pinned: { icon: 'rocket', color: '#ff0000' },
      projects: { icon: 42, color: 'nope' },
      bogus: { icon: 'star' },
      attention: 'star',
    })).toEqual({
      chats: { icon: 'star', color: 'keyword' },
      work: { color: 'info' },
      pinned: { icon: 'rocket' },
    });
  });

  test('resolve paints the override where set and the default elsewhere', () => {
    expect(resolveZoneAppearance('chats', undefined)).toEqual({ icon: 'chat-4', color: 'success', colorCss: 'var(--status-success)' });
    expect(resolveZoneAppearance('projects', {})).toEqual({ icon: 'folders', color: 'primary', colorCss: 'var(--primary)' });
    expect(resolveZoneAppearance('work', { work: { color: 'keyword' } })).toEqual({ icon: 'eye', color: 'keyword', colorCss: 'var(--syntax-keyword)' });
    expect(resolveZoneAppearance('attention', { attention: { icon: 'star' } })).toEqual({ icon: 'star', color: 'error', colorCss: 'var(--status-error)' });
  });

  test('with/without store only what differs from the default', () => {
    let map = withZoneAppearance({}, 'pinned', { color: 'number' });
    expect(map).toEqual({ pinned: { color: 'number' } });
    map = withZoneAppearance(map, 'pinned', { icon: 'star' });
    expect(map).toEqual({ pinned: { icon: 'star', color: 'number' } });
    // Picking the default again clears that field; the other stays.
    map = withZoneAppearance(map, 'pinned', { color: 'warning' });
    expect(map).toEqual({ pinned: { icon: 'star' } });
    map = withZoneAppearance(map, 'pinned', { icon: 'pushpin' });
    expect(map).toEqual({});
    map = withZoneAppearance({ chats: { icon: 'play' }, work: { color: 'muted' } }, 'work', { color: 'info' });
    expect(map).toEqual({ chats: { icon: 'play' } });
    expect(withoutZoneAppearance({ chats: { icon: 'play' }, work: { color: 'muted' } }, 'chats')).toEqual({ work: { color: 'muted' } });
    expect(withoutZoneAppearance({}, 'chats')).toEqual({});
  });
});
