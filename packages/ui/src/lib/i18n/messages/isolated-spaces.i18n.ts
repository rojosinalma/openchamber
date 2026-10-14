/** Isolated spaces: the create dialog, the group status line, the draft picker entry and the switch. Merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./isolated-spaces/ so the English startup bundle does not
// carry the other translations.
import { isolatedSpacesEn } from './isolated-spaces/en';
import { isolatedSpacesNl } from './isolated-spaces/nl';
import { isolatedSpacesDe } from './isolated-spaces/de';
import { isolatedSpacesFr } from './isolated-spaces/fr';
import { isolatedSpacesEs } from './isolated-spaces/es';
import { isolatedSpacesJa } from './isolated-spaces/ja';
import { isolatedSpacesPtBR } from './isolated-spaces/pt-BR';
import { isolatedSpacesUk } from './isolated-spaces/uk';
import { isolatedSpacesKo } from './isolated-spaces/ko';
import { isolatedSpacesPl } from './isolated-spaces/pl';
import { isolatedSpacesZhCN } from './isolated-spaces/zh-CN';
import { isolatedSpacesZhTW } from './isolated-spaces/zh-TW';
import { isolatedSpacesTr } from './isolated-spaces/tr';
import { isolatedSpacesAr } from './isolated-spaces/ar';
import { isolatedSpacesHe } from './isolated-spaces/he';

export const isolatedSpacesI18n = {
  en: isolatedSpacesEn,
  nl: isolatedSpacesNl,
  de: isolatedSpacesDe,
  fr: isolatedSpacesFr,
  es: isolatedSpacesEs,
  ja: isolatedSpacesJa,
  'pt-BR': isolatedSpacesPtBR,
  uk: isolatedSpacesUk,
  ko: isolatedSpacesKo,
  pl: isolatedSpacesPl,
  'zh-CN': isolatedSpacesZhCN,
  'zh-TW': isolatedSpacesZhTW,
  tr: isolatedSpacesTr,
  ar: isolatedSpacesAr,
  he: isolatedSpacesHe,
} as const;
