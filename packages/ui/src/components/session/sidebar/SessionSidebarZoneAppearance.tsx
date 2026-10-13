import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { updateDesktopSettings } from '@/lib/persistence';
import {
  ZONE_COLORS,
  ZONE_ICONS,
  resolveZoneAppearance,
  type ZoneAppearanceOverride,
} from '@/lib/fork/zoneAppearance';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSessionDisplayStore, type SidebarZoneKey } from '@/stores/useSessionDisplayStore';

const stopPointer = (event: React.SyntheticEvent) => { event.stopPropagation(); };

const persistZoneAppearance = (): void => {
  void updateDesktopSettings({ sidebarZoneAppearance: useSessionDisplayStore.getState().sidebarZoneAppearance });
};

/**
 * Fork-owned: the Appearance group of a zone header's `⋯` menu. A row of
 * tint swatches (theme tokens, `ZONE_COLORS`) and a grid of glyphs
 * (`ZONE_ICONS`), the current pick marked, and a "Reset to default" item.
 * Everything is inline in the dropdown, no dialog: a pick applies at once
 * and the menu stays open so the header can be watched changing; only the
 * reset item closes it. Writes go to the display store and on to the
 * `sidebarZoneAppearance` setting.
 */
export const SessionSidebarZoneAppearanceGroup: React.FC<{ zone: SidebarZoneKey }> = ({ zone }) => {
  const { t } = useI18n();
  const overrides = useSessionDisplayStore((state) => state.sidebarZoneAppearance);
  const current = resolveZoneAppearance(zone, overrides);
  const hasOverride = overrides[zone] !== undefined;

  const pick = (patch: ZoneAppearanceOverride) => (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    useSessionDisplayStore.getState().setZoneAppearance(zone, patch);
    persistZoneAppearance();
  };
  const reset = () => {
    useSessionDisplayStore.getState().resetZoneAppearance(zone);
    persistZoneAppearance();
  };

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{t('sessions.sidebar.zone.appearance.title')}</DropdownMenuLabel>
      <div className="px-2 pb-1.5" data-zone-appearance-colors="" role="group" aria-label={t('sessions.sidebar.zone.appearance.color')}>
        <div className="grid grid-cols-6 gap-1.5">
          {ZONE_COLORS.map((color) => {
            const selected = color.key === current.color;
            return (
              <button
                key={color.key}
                type="button"
                data-zone-color={color.key}
                aria-pressed={selected}
                aria-label={t('sessions.sidebar.zone.appearance.colorAria', { color: color.key })}
                title={color.key}
                onClick={pick({ color: color.key })}
                onPointerDown={stopPointer}
                onMouseDown={stopPointer}
                className={cn(
                  'size-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selected ? 'border-foreground' : 'border-transparent hover:border-border',
                )}
                style={{ backgroundColor: color.css }}
              />
            );
          })}
        </div>
      </div>
      <div className="px-2 pb-1.5" data-zone-appearance-icons="" role="group" aria-label={t('sessions.sidebar.zone.appearance.icon')}>
        <div className="grid grid-cols-8 gap-1">
          {ZONE_ICONS.map((icon) => {
            const selected = icon === current.icon;
            return (
              <button
                key={icon}
                type="button"
                data-zone-icon={icon}
                aria-pressed={selected}
                aria-label={t('sessions.sidebar.zone.appearance.iconAria', { icon })}
                title={icon}
                onClick={pick({ icon })}
                onPointerDown={stopPointer}
                onMouseDown={stopPointer}
                className={cn(
                  'inline-flex size-6 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selected ? 'border-foreground bg-interactive-hover' : 'border-transparent hover:bg-interactive-hover',
                )}
              >
                <Icon name={icon} className="size-3.5" style={{ color: current.colorCss }} />
              </button>
            );
          })}
        </div>
      </div>
      <DropdownMenuItem disabled={!hasOverride} onClick={reset} data-zone-appearance-reset="">
        <Icon name="restart" className="me-1.5 h-4 w-4" />
        {t('sessions.sidebar.zone.appearance.reset')}
      </DropdownMenuItem>
    </>
  );
};
