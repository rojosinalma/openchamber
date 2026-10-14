/** Settings → Integrations cards for installed guests. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./guest-integrations/ so the English startup bundle does not
// carry the other translations.
import { guestIntegrationsEn } from './guest-integrations/en';
import { guestIntegrationsNl } from './guest-integrations/nl';
import { guestIntegrationsDe } from './guest-integrations/de';
import { guestIntegrationsFr } from './guest-integrations/fr';
import { guestIntegrationsEs } from './guest-integrations/es';
import { guestIntegrationsJa } from './guest-integrations/ja';
import { guestIntegrationsKo } from './guest-integrations/ko';
import { guestIntegrationsPl } from './guest-integrations/pl';
import { guestIntegrationsPtBR } from './guest-integrations/pt-BR';
import { guestIntegrationsUk } from './guest-integrations/uk';
import { guestIntegrationsZhCN } from './guest-integrations/zh-CN';
import { guestIntegrationsZhTW } from './guest-integrations/zh-TW';
import { guestIntegrationsTr } from './guest-integrations/tr';
import { guestIntegrationsAr } from './guest-integrations/ar';
import { guestIntegrationsHe } from './guest-integrations/he';

export const guestIntegrationsI18n = {
  en: guestIntegrationsEn,
  nl: guestIntegrationsNl,
  de: guestIntegrationsDe,
  fr: guestIntegrationsFr,
  es: guestIntegrationsEs,
  ja: guestIntegrationsJa,
  ko: guestIntegrationsKo,
  pl: guestIntegrationsPl,
  'pt-BR': guestIntegrationsPtBR,
  uk: guestIntegrationsUk,
  'zh-CN': guestIntegrationsZhCN,
  'zh-TW': guestIntegrationsZhTW,
  tr: guestIntegrationsTr,
  ar: guestIntegrationsAr,
  he: guestIntegrationsHe,
} as const;
