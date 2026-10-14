/** Stats page strings (OpenCode session statistics) — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./usage-stats/ so the English startup bundle does not
// carry the other translations.
import { usageStatsEn } from './usage-stats/en';
import { usageStatsNl } from './usage-stats/nl';
import { usageStatsDe } from './usage-stats/de';
import { usageStatsEs } from './usage-stats/es';
import { usageStatsFr } from './usage-stats/fr';
import { usageStatsJa } from './usage-stats/ja';
import { usageStatsKo } from './usage-stats/ko';
import { usageStatsPl } from './usage-stats/pl';
import { usageStatsPtBR } from './usage-stats/pt-BR';
import { usageStatsTr } from './usage-stats/tr';
import { usageStatsUk } from './usage-stats/uk';
import { usageStatsZhCN } from './usage-stats/zh-CN';
import { usageStatsZhTW } from './usage-stats/zh-TW';
import { usageStatsAr } from './usage-stats/ar';
import { usageStatsHe } from './usage-stats/he';

export const usageStatsI18n = {
  en: usageStatsEn,
  nl: usageStatsNl,
  de: usageStatsDe,
  es: usageStatsEs,
  fr: usageStatsFr,
  ja: usageStatsJa,
  ko: usageStatsKo,
  pl: usageStatsPl,
  'pt-BR': usageStatsPtBR,
  tr: usageStatsTr,
  uk: usageStatsUk,
  'zh-CN': usageStatsZhCN,
  'zh-TW': usageStatsZhTW,
  ar: usageStatsAr,
  he: usageStatsHe,
} as const;
