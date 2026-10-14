/** GitHub/Linear reference picker strings — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./reference-picker/ so the English startup bundle does not
// carry the other translations.
import { referencePickerEn } from './reference-picker/en';
import { referencePickerDe } from './reference-picker/de';
import { referencePickerFr } from './reference-picker/fr';
import { referencePickerNl } from './reference-picker/nl';
import { referencePickerEs } from './reference-picker/es';
import { referencePickerJa } from './reference-picker/ja';
import { referencePickerPtBR } from './reference-picker/pt-BR';
import { referencePickerUk } from './reference-picker/uk';
import { referencePickerKo } from './reference-picker/ko';
import { referencePickerPl } from './reference-picker/pl';
import { referencePickerZhCN } from './reference-picker/zh-CN';
import { referencePickerZhTW } from './reference-picker/zh-TW';
import { referencePickerTr } from './reference-picker/tr';
import { referencePickerAr } from './reference-picker/ar';
import { referencePickerHe } from './reference-picker/he';

export const referencePickerI18n = {
  en: referencePickerEn,
  de: referencePickerDe,
  fr: referencePickerFr,
  nl: referencePickerNl,
  es: referencePickerEs,
  ja: referencePickerJa,
  'pt-BR': referencePickerPtBR,
  uk: referencePickerUk,
  ko: referencePickerKo,
  pl: referencePickerPl,
  'zh-CN': referencePickerZhCN,
  'zh-TW': referencePickerZhTW,
  tr: referencePickerTr,
  ar: referencePickerAr,
  he: referencePickerHe,
} as const;
