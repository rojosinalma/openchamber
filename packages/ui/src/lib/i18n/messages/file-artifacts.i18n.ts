/** File viewer artifact strings (media, fonts, tables, images, binaries) — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./file-artifacts/ so the English startup bundle does not
// carry the other translations.
import { fileArtifactsEn } from './file-artifacts/en';
import { fileArtifactsNl } from './file-artifacts/nl';
import { fileArtifactsDe } from './file-artifacts/de';
import { fileArtifactsEs } from './file-artifacts/es';
import { fileArtifactsFr } from './file-artifacts/fr';
import { fileArtifactsJa } from './file-artifacts/ja';
import { fileArtifactsKo } from './file-artifacts/ko';
import { fileArtifactsPl } from './file-artifacts/pl';
import { fileArtifactsPtBR } from './file-artifacts/pt-BR';
import { fileArtifactsTr } from './file-artifacts/tr';
import { fileArtifactsUk } from './file-artifacts/uk';
import { fileArtifactsZhCN } from './file-artifacts/zh-CN';
import { fileArtifactsZhTW } from './file-artifacts/zh-TW';
import { fileArtifactsAr } from './file-artifacts/ar';
import { fileArtifactsHe } from './file-artifacts/he';

export const fileArtifactsI18n = {
  en: fileArtifactsEn,
  nl: fileArtifactsNl,
  de: fileArtifactsDe,
  es: fileArtifactsEs,
  fr: fileArtifactsFr,
  ja: fileArtifactsJa,
  ko: fileArtifactsKo,
  pl: fileArtifactsPl,
  'pt-BR': fileArtifactsPtBR,
  tr: fileArtifactsTr,
  uk: fileArtifactsUk,
  'zh-CN': fileArtifactsZhCN,
  'zh-TW': fileArtifactsZhTW,
  ar: fileArtifactsAr,
  he: fileArtifactsHe,
} as const;
