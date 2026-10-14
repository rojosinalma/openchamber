/** Integrations page: OpenChamber extensions offered for install — merged into each locale's settings dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./extension-catalog/ so the English startup bundle does not
// carry the other translations.
import { extensionCatalogEn } from './extension-catalog/en';
import { extensionCatalogNl } from './extension-catalog/nl';
import { extensionCatalogDe } from './extension-catalog/de';
import { extensionCatalogFr } from './extension-catalog/fr';
import { extensionCatalogEs } from './extension-catalog/es';
import { extensionCatalogJa } from './extension-catalog/ja';
import { extensionCatalogPtBR } from './extension-catalog/pt-BR';
import { extensionCatalogUk } from './extension-catalog/uk';
import { extensionCatalogKo } from './extension-catalog/ko';
import { extensionCatalogPl } from './extension-catalog/pl';
import { extensionCatalogZhCN } from './extension-catalog/zh-CN';
import { extensionCatalogZhTW } from './extension-catalog/zh-TW';
import { extensionCatalogTr } from './extension-catalog/tr';
import { extensionCatalogAr } from './extension-catalog/ar';
import { extensionCatalogHe } from './extension-catalog/he';

export const extensionCatalogI18n = {
  en: extensionCatalogEn,
  nl: extensionCatalogNl,
  de: extensionCatalogDe,
  fr: extensionCatalogFr,
  es: extensionCatalogEs,
  ja: extensionCatalogJa,
  'pt-BR': extensionCatalogPtBR,
  uk: extensionCatalogUk,
  ko: extensionCatalogKo,
  pl: extensionCatalogPl,
  'zh-CN': extensionCatalogZhCN,
  'zh-TW': extensionCatalogZhTW,
  tr: extensionCatalogTr,
  ar: extensionCatalogAr,
  he: extensionCatalogHe,
} as const;
