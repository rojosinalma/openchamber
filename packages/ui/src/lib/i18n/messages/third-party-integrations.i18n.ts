/** Third-party integration settings strings — merged into each locale's settings dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./third-party-integrations/ so the English startup bundle does not
// carry the other translations.
import { thirdPartyIntegrationEn } from './third-party-integrations/en';
import { thirdPartyIntegrationNl } from './third-party-integrations/nl';
import { thirdPartyIntegrationDe } from './third-party-integrations/de';
import { thirdPartyIntegrationFr } from './third-party-integrations/fr';
import { thirdPartyIntegrationEs } from './third-party-integrations/es';
import { thirdPartyIntegrationJa } from './third-party-integrations/ja';
import { thirdPartyIntegrationKo } from './third-party-integrations/ko';
import { thirdPartyIntegrationPl } from './third-party-integrations/pl';
import { thirdPartyIntegrationPtBR } from './third-party-integrations/pt-BR';
import { thirdPartyIntegrationUk } from './third-party-integrations/uk';
import { thirdPartyIntegrationZhCN } from './third-party-integrations/zh-CN';
import { thirdPartyIntegrationZhTW } from './third-party-integrations/zh-TW';
import { thirdPartyIntegrationTr } from './third-party-integrations/tr';
import { thirdPartyIntegrationAr } from './third-party-integrations/ar';
import { thirdPartyIntegrationHe } from './third-party-integrations/he';

export const thirdPartyIntegrationI18n = {
  en: thirdPartyIntegrationEn,
  nl: thirdPartyIntegrationNl,
  de: thirdPartyIntegrationDe,
  fr: thirdPartyIntegrationFr,
  es: thirdPartyIntegrationEs,
  ja: thirdPartyIntegrationJa,
  ko: thirdPartyIntegrationKo,
  pl: thirdPartyIntegrationPl,
  'pt-BR': thirdPartyIntegrationPtBR,
  uk: thirdPartyIntegrationUk,
  'zh-CN': thirdPartyIntegrationZhCN,
  'zh-TW': thirdPartyIntegrationZhTW,
  tr: thirdPartyIntegrationTr,
  ar: thirdPartyIntegrationAr,
  he: thirdPartyIntegrationHe,
} as const;
