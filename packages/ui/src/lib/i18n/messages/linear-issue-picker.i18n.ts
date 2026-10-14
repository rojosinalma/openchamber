/** Linear issue picker / composer strings — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./linear-issue-picker/ so the English startup bundle does not
// carry the other translations.
import { linearIssuePickerEn } from './linear-issue-picker/en';
import { linearIssuePickerNl } from './linear-issue-picker/nl';
import { linearIssuePickerDe } from './linear-issue-picker/de';
import { linearIssuePickerFr } from './linear-issue-picker/fr';
import { linearIssuePickerEs } from './linear-issue-picker/es';
import { linearIssuePickerJa } from './linear-issue-picker/ja';
import { linearIssuePickerPtBR } from './linear-issue-picker/pt-BR';
import { linearIssuePickerUk } from './linear-issue-picker/uk';
import { linearIssuePickerKo } from './linear-issue-picker/ko';
import { linearIssuePickerPl } from './linear-issue-picker/pl';
import { linearIssuePickerZhCN } from './linear-issue-picker/zh-CN';
import { linearIssuePickerZhTW } from './linear-issue-picker/zh-TW';
import { linearIssuePickerTr } from './linear-issue-picker/tr';
import { linearIssuePickerAr } from './linear-issue-picker/ar';
import { linearIssuePickerHe } from './linear-issue-picker/he';

export const linearIssuePickerI18n = {
  en: linearIssuePickerEn,
  nl: linearIssuePickerNl,
  de: linearIssuePickerDe,
  fr: linearIssuePickerFr,
  es: linearIssuePickerEs,
  ja: linearIssuePickerJa,
  'pt-BR': linearIssuePickerPtBR,
  uk: linearIssuePickerUk,
  ko: linearIssuePickerKo,
  pl: linearIssuePickerPl,
  'zh-CN': linearIssuePickerZhCN,
  'zh-TW': linearIssuePickerZhTW,
  tr: linearIssuePickerTr,
  ar: linearIssuePickerAr,
  he: linearIssuePickerHe,
} as const;
