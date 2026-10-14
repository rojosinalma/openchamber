/** Linear priority names, shown by the reference picker and the board. Merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./linear-panel/ so the English startup bundle does not
// carry the other translations.
import { linearPanelEn } from './linear-panel/en';
import { linearPanelNl } from './linear-panel/nl';
import { linearPanelDe } from './linear-panel/de';
import { linearPanelFr } from './linear-panel/fr';
import { linearPanelEs } from './linear-panel/es';
import { linearPanelJa } from './linear-panel/ja';
import { linearPanelKo } from './linear-panel/ko';
import { linearPanelPl } from './linear-panel/pl';
import { linearPanelPtBR } from './linear-panel/pt-BR';
import { linearPanelUk } from './linear-panel/uk';
import { linearPanelZhCN } from './linear-panel/zh-CN';
import { linearPanelZhTW } from './linear-panel/zh-TW';
import { linearPanelTr } from './linear-panel/tr';
import { linearPanelAr } from './linear-panel/ar';
import { linearPanelHe } from './linear-panel/he';

export const linearPanelI18n = {
  en: linearPanelEn,
  nl: linearPanelNl,
  de: linearPanelDe,
  fr: linearPanelFr,
  es: linearPanelEs,
  ja: linearPanelJa,
  ko: linearPanelKo,
  pl: linearPanelPl,
  'pt-BR': linearPanelPtBR,
  uk: linearPanelUk,
  'zh-CN': linearPanelZhCN,
  'zh-TW': linearPanelZhTW,
  tr: linearPanelTr,
  ar: linearPanelAr,
  he: linearPanelHe,
} as const;
