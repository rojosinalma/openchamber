/** Built-in integration (GitHub, Linear) settings strings — merged into each locale's settings dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./linear-integration/ so the English startup bundle does not
// carry the other translations.
import { linearIntegrationEn } from './linear-integration/en';
import { linearIntegrationNl } from './linear-integration/nl';
import { linearIntegrationDe } from './linear-integration/de';
import { linearIntegrationFr } from './linear-integration/fr';
import { linearIntegrationEs } from './linear-integration/es';
import { linearIntegrationJa } from './linear-integration/ja';
import { linearIntegrationKo } from './linear-integration/ko';
import { linearIntegrationPl } from './linear-integration/pl';
import { linearIntegrationPtBR } from './linear-integration/pt-BR';
import { linearIntegrationUk } from './linear-integration/uk';
import { linearIntegrationZhCN } from './linear-integration/zh-CN';
import { linearIntegrationZhTW } from './linear-integration/zh-TW';
import { linearIntegrationTr } from './linear-integration/tr';
import { linearIntegrationAr } from './linear-integration/ar';
import { linearIntegrationHe } from './linear-integration/he';

export const linearIntegrationI18n = {
  en: linearIntegrationEn,
  nl: linearIntegrationNl,
  de: linearIntegrationDe,
  fr: linearIntegrationFr,
  es: linearIntegrationEs,
  ja: linearIntegrationJa,
  ko: linearIntegrationKo,
  pl: linearIntegrationPl,
  'pt-BR': linearIntegrationPtBR,
  uk: linearIntegrationUk,
  'zh-CN': linearIntegrationZhCN,
  'zh-TW': linearIntegrationZhTW,
  tr: linearIntegrationTr,
  ar: linearIntegrationAr,
  he: linearIntegrationHe,
} as const;
