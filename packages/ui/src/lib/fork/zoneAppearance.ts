import type { IconName } from '@/components/icon/icons';

/**
 * Fork-owned: the look of a sidebar zone header, icon and tint, per zone.
 *
 * Every zone (Pinned, Needs attention, In work, Chats, Projects) ships a
 * default glyph and a default tint; the zone's `⋯` menu lets the user pick
 * another from a curated set (`SessionSidebarZoneAppearance.tsx`), and the
 * choice is the `sidebarZoneAppearance` setting (profile scope, one map for
 * every surface). Colours are theme tokens, not hex: a tint that reads on
 * one theme is picked again by the next, and the stored key stays meaningful
 * when the theme changes. Unknown zones, icons and colours are dropped on
 * read, so a stale or hand-edited value falls back to the default.
 *
 * The server mirrors the key sets in `settings-helpers.js`
 * (`SIDEBAR_ZONE_APPEARANCE_*`); its test fails when the lists drift.
 */

/** The zone keys the setting may carry (`SidebarZoneKey` in the display store, kept local to avoid a store cycle). */
export const ZONE_APPEARANCE_ZONES = ['pinned', 'attention', 'work', 'chats', 'projects'] as const;
export type ZoneAppearanceZone = (typeof ZONE_APPEARANCE_ZONES)[number];
const ZONE_SET: ReadonlySet<string> = new Set(ZONE_APPEARANCE_ZONES);

/**
 * The tint palette: theme tokens the status, accent and syntax colours
 * already define, so every theme paints all twelve. The key is what gets
 * stored; `css` is what the header paints with.
 */
export const ZONE_COLORS = [
  { key: 'error', css: 'var(--status-error)' },
  { key: 'warning', css: 'var(--status-warning)' },
  { key: 'success', css: 'var(--status-success)' },
  { key: 'info', css: 'var(--status-info)' },
  { key: 'primary', css: 'var(--primary)' },
  { key: 'keyword', css: 'var(--syntax-keyword)' },
  { key: 'string', css: 'var(--syntax-string)' },
  { key: 'number', css: 'var(--syntax-number)' },
  { key: 'type', css: 'var(--syntax-type)' },
  { key: 'function', css: 'var(--syntax-function)' },
  { key: 'variable', css: 'var(--syntax-variable)' },
  { key: 'muted', css: 'var(--muted-foreground)' },
] as const;
export type ZoneColorKey = (typeof ZONE_COLORS)[number]['key'];
const ZONE_COLOR_CSS: ReadonlyMap<string, string> = new Map(ZONE_COLORS.map((color) => [color.key, color.css]));

/** Zone-appropriate glyphs from the existing sprite: the five defaults plus alternatives. */
export const ZONE_ICONS = [
  'pushpin',
  'notification-3',
  'eye',
  'chat-4',
  'folders',
  'play',
  'chat-thread',
  'folder-open',
  'star',
  'book-marked',
  'target',
  'rocket',
  'git-fork',
  'inbox-unarchive',
  'timer',
  'lightbulb',
] as const satisfies readonly IconName[];
export type ZoneIconName = (typeof ZONE_ICONS)[number];
const ZONE_ICON_SET: ReadonlySet<string> = new Set(ZONE_ICONS);

export type ZoneAppearance = { icon: ZoneIconName; color: ZoneColorKey };
export type ZoneAppearanceOverride = Partial<ZoneAppearance>;
/** The stored setting: an override per zone, absent fields fall back to the default. */
export type SidebarZoneAppearance = Partial<Record<ZoneAppearanceZone, ZoneAppearanceOverride>>;

// Attention asks like an error, pinned sits where the pin marker's warning
// tone does, work is informational, chats read as settled (success), projects
// take the accent.
export const DEFAULT_ZONE_APPEARANCE: Readonly<Record<ZoneAppearanceZone, ZoneAppearance>> = Object.freeze({
  pinned: { icon: 'pushpin', color: 'warning' },
  attention: { icon: 'notification-3', color: 'error' },
  work: { icon: 'eye', color: 'info' },
  chats: { icon: 'chat-4', color: 'success' },
  projects: { icon: 'folders', color: 'primary' },
});

export const isZoneIconName = (value: unknown): value is ZoneIconName => typeof value === 'string' && ZONE_ICON_SET.has(value);
export const isZoneColorKey = (value: unknown): value is ZoneColorKey => typeof value === 'string' && ZONE_COLOR_CSS.has(value);

/** The CSS colour a tint key paints with. */
export const zoneColorCss = (color: ZoneColorKey): string => ZONE_COLOR_CSS.get(color) ?? ZONE_COLORS[0].css;

/**
 * Turns a stored or synced value into a clean override map: known zones
 * only, each with the known icon and colour fields it carries; an entry left
 * with neither field is dropped. Anything that is not an object yields `{}`.
 */
export const normalizeSidebarZoneAppearance = (input: unknown): SidebarZoneAppearance => {
  const result: SidebarZoneAppearance = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return result;
  for (const [zone, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ZONE_SET.has(zone) || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const { icon, color } = value as { icon?: unknown; color?: unknown };
    const entry: ZoneAppearanceOverride = {};
    if (isZoneIconName(icon)) entry.icon = icon;
    if (isZoneColorKey(color)) entry.color = color;
    if (entry.icon || entry.color) result[zone as ZoneAppearanceZone] = entry;
  }
  return result;
};

/** The icon and tint a zone header paints with: the override where set, the default elsewhere. */
export const resolveZoneAppearance = (zone: ZoneAppearanceZone, overrides: SidebarZoneAppearance | undefined): ZoneAppearance & { colorCss: string } => {
  const base = DEFAULT_ZONE_APPEARANCE[zone];
  const override = overrides?.[zone];
  const icon = override?.icon ?? base.icon;
  const color = override?.color ?? base.color;
  return { icon, color, colorCss: zoneColorCss(color) };
};

/**
 * The map with one zone's override changed: fields equal to the default are
 * not stored (so a zone put back by hand reads as untouched), an entry left
 * empty is removed.
 */
export const withZoneAppearance = (
  overrides: SidebarZoneAppearance,
  zone: ZoneAppearanceZone,
  patch: ZoneAppearanceOverride,
): SidebarZoneAppearance => {
  const base = DEFAULT_ZONE_APPEARANCE[zone];
  const merged = { ...overrides[zone], ...patch };
  const entry: ZoneAppearanceOverride = {};
  if (merged.icon && merged.icon !== base.icon) entry.icon = merged.icon;
  if (merged.color && merged.color !== base.color) entry.color = merged.color;
  const rest = withoutZoneAppearance(overrides, zone);
  return entry.icon || entry.color ? { ...rest, [zone]: entry } : rest;
};

/** The map without `zone`'s override. */
export const withoutZoneAppearance = (overrides: SidebarZoneAppearance, zone: ZoneAppearanceZone): SidebarZoneAppearance => {
  const rest: SidebarZoneAppearance = { ...overrides };
  delete rest[zone];
  return rest;
};
