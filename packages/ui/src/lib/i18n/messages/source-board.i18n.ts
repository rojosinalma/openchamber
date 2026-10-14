/** The issues and pull requests board: its page, switches and actions. Merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./source-board/ so the English startup bundle does not
// carry the other translations.
import { sourceBoardEn } from './source-board/en';
import { sourceBoardDe } from './source-board/de';
import { sourceBoardFr } from './source-board/fr';
import { sourceBoardNl } from './source-board/nl';
import { sourceBoardEs } from './source-board/es';
import { sourceBoardJa } from './source-board/ja';
import { sourceBoardPtBR } from './source-board/pt-BR';
import { sourceBoardUk } from './source-board/uk';
import { sourceBoardKo } from './source-board/ko';
import { sourceBoardPl } from './source-board/pl';
import { sourceBoardZhCN } from './source-board/zh-CN';
import { sourceBoardZhTW } from './source-board/zh-TW';
import { sourceBoardTr } from './source-board/tr';
import { sourceBoardAr } from './source-board/ar';
import { sourceBoardHe } from './source-board/he';

export const sourceBoardI18n = {
  en: sourceBoardEn,
  de: sourceBoardDe,
  fr: sourceBoardFr,
  nl: sourceBoardNl,
  es: sourceBoardEs,
  ja: sourceBoardJa,
  'pt-BR': sourceBoardPtBR,
  uk: sourceBoardUk,
  ko: sourceBoardKo,
  pl: sourceBoardPl,
  'zh-CN': sourceBoardZhCN,
  'zh-TW': sourceBoardZhTW,
  tr: sourceBoardTr,
  ar: sourceBoardAr,
  he: sourceBoardHe,
} as const;
