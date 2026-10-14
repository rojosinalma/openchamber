/** Environment variables in Settings: the General section, the project section and the shared editor. Merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./environment/ so the English startup bundle does not
// carry the other translations.
import { environmentEn } from './environment/en';
import { environmentDe } from './environment/de';
import { environmentFr } from './environment/fr';
import { environmentNl } from './environment/nl';
import { environmentEs } from './environment/es';
import { environmentJa } from './environment/ja';
import { environmentPtBR } from './environment/pt-BR';
import { environmentUk } from './environment/uk';
import { environmentKo } from './environment/ko';
import { environmentPl } from './environment/pl';
import { environmentZhCN } from './environment/zh-CN';
import { environmentZhTW } from './environment/zh-TW';
import { environmentTr } from './environment/tr';
import { environmentAr } from './environment/ar';
import { environmentHe } from './environment/he';

export const environmentI18n = {
  en: environmentEn,
  de: environmentDe,
  fr: environmentFr,
  nl: environmentNl,
  es: environmentEs,
  ja: environmentJa,
  'pt-BR': environmentPtBR,
  uk: environmentUk,
  ko: environmentKo,
  pl: environmentPl,
  'zh-CN': environmentZhCN,
  'zh-TW': environmentZhTW,
  tr: environmentTr,
  ar: environmentAr,
  he: environmentHe,
} as const;
