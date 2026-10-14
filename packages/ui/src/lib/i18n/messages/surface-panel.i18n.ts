/** Shared-surface panel strings — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./surface-panel/ so the English startup bundle does not
// carry the other translations.
import { surfacePanelEn } from './surface-panel/en';
import { surfacePanelNl } from './surface-panel/nl';
import { surfacePanelDe } from './surface-panel/de';
import { surfacePanelFr } from './surface-panel/fr';
import { surfacePanelEs } from './surface-panel/es';
import { surfacePanelJa } from './surface-panel/ja';
import { surfacePanelPtBR } from './surface-panel/pt-BR';
import { surfacePanelUk } from './surface-panel/uk';
import { surfacePanelKo } from './surface-panel/ko';
import { surfacePanelPl } from './surface-panel/pl';
import { surfacePanelZhCN } from './surface-panel/zh-CN';
import { surfacePanelZhTW } from './surface-panel/zh-TW';
import { surfacePanelTr } from './surface-panel/tr';
import { surfacePanelAr } from './surface-panel/ar';
import { surfacePanelHe } from './surface-panel/he';

export const surfacePanelI18n = {
  en: surfacePanelEn,
  nl: surfacePanelNl,
  de: surfacePanelDe,
  fr: surfacePanelFr,
  es: surfacePanelEs,
  ja: surfacePanelJa,
  'pt-BR': surfacePanelPtBR,
  uk: surfacePanelUk,
  ko: surfacePanelKo,
  pl: surfacePanelPl,
  'zh-CN': surfacePanelZhCN,
  'zh-TW': surfacePanelZhTW,
  tr: surfacePanelTr,
  ar: surfacePanelAr,
  he: surfacePanelHe,
} as const;
