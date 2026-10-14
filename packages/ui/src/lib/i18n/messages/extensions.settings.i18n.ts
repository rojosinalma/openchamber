/** Settings → Extensions. Not OpenCode Plugins. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./extensions.settings/ so the English startup bundle does not
// carry the other translations.
import { extensionsSettingsEn } from './extensions.settings/en';
import { extensionsSettingsNl } from './extensions.settings/nl';
import { extensionsSettingsDe } from './extensions.settings/de';
import { extensionsSettingsFr } from './extensions.settings/fr';
import { extensionsSettingsEs } from './extensions.settings/es';
import { extensionsSettingsJa } from './extensions.settings/ja';
import { extensionsSettingsKo } from './extensions.settings/ko';
import { extensionsSettingsPl } from './extensions.settings/pl';
import { extensionsSettingsPtBR } from './extensions.settings/pt-BR';
import { extensionsSettingsUk } from './extensions.settings/uk';
import { extensionsSettingsZhCN } from './extensions.settings/zh-CN';
import { extensionsSettingsZhTW } from './extensions.settings/zh-TW';
import { extensionsSettingsTr } from './extensions.settings/tr';
import { extensionsSettingsAr } from './extensions.settings/ar';
import { extensionsSettingsHe } from './extensions.settings/he';

export const extensionsSettingsI18n = {
  en: extensionsSettingsEn,
  nl: extensionsSettingsNl,
  de: extensionsSettingsDe,
  fr: extensionsSettingsFr,
  es: extensionsSettingsEs,
  ja: extensionsSettingsJa,
  ko: extensionsSettingsKo,
  pl: extensionsSettingsPl,
  'pt-BR': extensionsSettingsPtBR,
  uk: extensionsSettingsUk,
  'zh-CN': extensionsSettingsZhCN,
  'zh-TW': extensionsSettingsZhTW,
  tr: extensionsSettingsTr,
  ar: extensionsSettingsAr,
  he: extensionsSettingsHe,
} as const;
