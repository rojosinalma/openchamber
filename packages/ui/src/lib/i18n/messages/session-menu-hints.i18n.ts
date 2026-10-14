/** Session menu item explanations (sidebar and header menus) — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./session-menu-hints/ so the English startup bundle does not
// carry the other translations.
import { sessionMenuHintsEn } from './session-menu-hints/en';
import { sessionMenuHintsDe } from './session-menu-hints/de';
import { sessionMenuHintsFr } from './session-menu-hints/fr';
import { sessionMenuHintsNl } from './session-menu-hints/nl';
import { sessionMenuHintsEs } from './session-menu-hints/es';
import { sessionMenuHintsJa } from './session-menu-hints/ja';
import { sessionMenuHintsPtBR } from './session-menu-hints/pt-BR';
import { sessionMenuHintsUk } from './session-menu-hints/uk';
import { sessionMenuHintsKo } from './session-menu-hints/ko';
import { sessionMenuHintsPl } from './session-menu-hints/pl';
import { sessionMenuHintsZhCN } from './session-menu-hints/zh-CN';
import { sessionMenuHintsZhTW } from './session-menu-hints/zh-TW';
import { sessionMenuHintsTr } from './session-menu-hints/tr';
import { sessionMenuHintsAr } from './session-menu-hints/ar';
import { sessionMenuHintsHe } from './session-menu-hints/he';

export const sessionMenuHintsI18n = {
  en: sessionMenuHintsEn,
  de: sessionMenuHintsDe,
  fr: sessionMenuHintsFr,
  nl: sessionMenuHintsNl,
  es: sessionMenuHintsEs,
  ja: sessionMenuHintsJa,
  'pt-BR': sessionMenuHintsPtBR,
  uk: sessionMenuHintsUk,
  ko: sessionMenuHintsKo,
  pl: sessionMenuHintsPl,
  'zh-CN': sessionMenuHintsZhCN,
  'zh-TW': sessionMenuHintsZhTW,
  tr: sessionMenuHintsTr,
  ar: sessionMenuHintsAr,
  he: sessionMenuHintsHe,
} as const;
