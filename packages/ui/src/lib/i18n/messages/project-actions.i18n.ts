/** The project actions dialog, its shortcut and its command palette entries. Merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./project-actions/ so the English startup bundle does not
// carry the other translations.
import { projectActionsEn } from './project-actions/en';
import { projectActionsDe } from './project-actions/de';
import { projectActionsFr } from './project-actions/fr';
import { projectActionsNl } from './project-actions/nl';
import { projectActionsEs } from './project-actions/es';
import { projectActionsJa } from './project-actions/ja';
import { projectActionsPtBR } from './project-actions/pt-BR';
import { projectActionsUk } from './project-actions/uk';
import { projectActionsKo } from './project-actions/ko';
import { projectActionsPl } from './project-actions/pl';
import { projectActionsZhCN } from './project-actions/zh-CN';
import { projectActionsZhTW } from './project-actions/zh-TW';
import { projectActionsTr } from './project-actions/tr';
import { projectActionsAr } from './project-actions/ar';
import { projectActionsHe } from './project-actions/he';

export const projectActionsI18n = {
  en: projectActionsEn,
  de: projectActionsDe,
  fr: projectActionsFr,
  nl: projectActionsNl,
  es: projectActionsEs,
  ja: projectActionsJa,
  'pt-BR': projectActionsPtBR,
  uk: projectActionsUk,
  ko: projectActionsKo,
  pl: projectActionsPl,
  'zh-CN': projectActionsZhCN,
  'zh-TW': projectActionsZhTW,
  tr: projectActionsTr,
  ar: projectActionsAr,
  he: projectActionsHe,
} as const;
