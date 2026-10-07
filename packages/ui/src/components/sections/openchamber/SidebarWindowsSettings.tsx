import React from 'react';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import {
  SettingsSection,
  SettingsFieldRow,
  SETTINGS_ICON_BUTTON_CLASS,
  SETTINGS_NUMBER_INPUT_CLASS,
} from '@/components/sections/shared/SettingsSection';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { updateDesktopSettings } from '@/lib/persistence';
import {
  DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS,
  SIDEBAR_WINDOW_HOURS_MAX,
  SIDEBAR_WINDOW_HOURS_MIN,
  normalizeSidebarWindowHours,
} from '@/lib/sidebarTimeWindows';
import { useSessionDisplayStore } from '@/stores/useSessionDisplayStore';

type WindowRowProps = {
  settingsItem: string;
  label: string;
  info: string;
  value: number;
  defaultValue: number;
  onCommit: (hours: number) => void;
};

/**
 * One whole-hours window: the input edits a draft and commits on Enter or blur,
 * clamped to the shared limits; an empty or unreadable draft falls back to the
 * value in effect. The reset button returns to the shipped default.
 */
const SidebarWindowRow: React.FC<WindowRowProps> = ({ settingsItem, label, info, value, defaultValue, onCommit }) => {
  const { t } = useI18n();
  const commit = React.useCallback(
    (hours: number) => {
      const next = normalizeSidebarWindowHours(hours, value);
      if (next !== value) onCommit(next);
    },
    [onCommit, value],
  );

  return (
    <SettingsFieldRow settingsItem={settingsItem} label={label} info={info}>
      <NumberInput
        value={value}
        onValueChange={commit}
        min={SIDEBAR_WINDOW_HOURS_MIN}
        max={SIDEBAR_WINDOW_HOURS_MAX}
        step={1}
        deferExternalValueWhileFocused
        aria-label={label}
        className={cn(SETTINGS_NUMBER_INPUT_CLASS, 'tabular-nums')}
      />
      <span className="typography-ui-label text-muted-foreground">{t('settings.openchamber.spaces.idleStop.hours')}</span>
      <Button
        size="sm"
        type="button"
        variant="ghost"
        onClick={() => commit(defaultValue)}
        disabled={value === defaultValue}
        className={SETTINGS_ICON_BUTTON_CLASS}
        aria-label={t('settings.common.actions.reset')}
        title={t('settings.common.actions.reset')}
      >
        <Icon name="restart" className="h-3.5 w-3.5" />
      </Button>
    </SettingsFieldRow>
  );
};

/**
 * The Needs attention window (`lib/sidebarTimeWindows.ts`): how far back a
 * finished, unopened turn counts for Needs attention and the row's unread
 * mark. It lives in `useSessionDisplayStore` and is persisted like the zone
 * toggles, per surface.
 */
export const SidebarWindowsSettings: React.FC = () => {
  const { t } = useI18n();
  const attentionWindowHours = useSessionDisplayStore((state) => state.sidebarAttentionWindowHours);
  const setAttentionWindowHours = useSessionDisplayStore((state) => state.setSidebarAttentionWindowHours);

  const commitAttentionWindow = React.useCallback(
    (hours: number) => {
      setAttentionWindowHours(hours);
      void updateDesktopSettings({ sidebarAttentionWindowHours: hours });
    },
    [setAttentionWindowHours],
  );

  return (
    <SettingsSection
      title={t('settings.openchamber.sidebarWindows.title')}
      info={t('settings.openchamber.sidebarWindows.info')}
      settingsItem="sessions.sidebar-windows"
    >
      <SidebarWindowRow
        settingsItem="sessions.sidebar-attention-window"
        label={t('settings.openchamber.sidebarWindows.field.attentionWindowHours')}
        info={t('settings.openchamber.sidebarWindows.field.attentionWindowHoursInfo')}
        value={attentionWindowHours}
        defaultValue={DEFAULT_SIDEBAR_ATTENTION_WINDOW_HOURS}
        onCommit={commitAttentionWindow}
      />
    </SettingsSection>
  );
};
