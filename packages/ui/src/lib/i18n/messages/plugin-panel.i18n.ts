/** Guest panel strings — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./plugin-panel/ so the English startup bundle does not
// carry the other translations.
import { pluginPanelEn } from './plugin-panel/en';
import { pluginPanelNl } from './plugin-panel/nl';
import { pluginPanelDe } from './plugin-panel/de';
import { pluginPanelFr } from './plugin-panel/fr';
import { pluginPanelEs } from './plugin-panel/es';
import { pluginPanelJa } from './plugin-panel/ja';
import { pluginPanelKo } from './plugin-panel/ko';
import { pluginPanelPl } from './plugin-panel/pl';
import { pluginPanelPtBR } from './plugin-panel/pt-BR';
import { pluginPanelUk } from './plugin-panel/uk';
import { pluginPanelZhCN } from './plugin-panel/zh-CN';
import { pluginPanelZhTW } from './plugin-panel/zh-TW';
import { pluginPanelTr } from './plugin-panel/tr';
import { pluginPanelAr } from './plugin-panel/ar';
import { pluginPanelHe } from './plugin-panel/he';

export const pluginPanelI18n = {
  en: pluginPanelEn,
  nl: pluginPanelNl,
  de: pluginPanelDe,
  fr: pluginPanelFr,
  es: pluginPanelEs,
  ja: pluginPanelJa,
  ko: pluginPanelKo,
  pl: pluginPanelPl,
  'pt-BR': pluginPanelPtBR,
  uk: pluginPanelUk,
  'zh-CN': pluginPanelZhCN,
  'zh-TW': pluginPanelZhTW,
  tr: pluginPanelTr,
  ar: pluginPanelAr,
  he: pluginPanelHe,
} as const;
