/** Project knowledge panel (notes, todos, plans, memory): row actions, undo and composers — merged into each locale's main dictionary. */
// Every locale in one object, for the key-parity tests. Runtime code imports the
// per-locale modules under ./project-knowledge/ so the English startup bundle does not
// carry the other translations.
import { projectKnowledgeEn } from './project-knowledge/en';
import { projectKnowledgeUk } from './project-knowledge/uk';
import { projectKnowledgeDe } from './project-knowledge/de';
import { projectKnowledgeFr } from './project-knowledge/fr';
import { projectKnowledgeEs } from './project-knowledge/es';
import { projectKnowledgePtBR } from './project-knowledge/pt-BR';
import { projectKnowledgeNl } from './project-knowledge/nl';
import { projectKnowledgePl } from './project-knowledge/pl';
import { projectKnowledgeTr } from './project-knowledge/tr';
import { projectKnowledgeJa } from './project-knowledge/ja';
import { projectKnowledgeKo } from './project-knowledge/ko';
import { projectKnowledgeZhCN } from './project-knowledge/zh-CN';
import { projectKnowledgeZhTW } from './project-knowledge/zh-TW';
import { projectKnowledgeAr } from './project-knowledge/ar';
import { projectKnowledgeHe } from './project-knowledge/he';

export const projectKnowledgeI18n = {
  en: projectKnowledgeEn,
  uk: projectKnowledgeUk,
  de: projectKnowledgeDe,
  fr: projectKnowledgeFr,
  es: projectKnowledgeEs,
  'pt-BR': projectKnowledgePtBR,
  nl: projectKnowledgeNl,
  pl: projectKnowledgePl,
  tr: projectKnowledgeTr,
  ja: projectKnowledgeJa,
  ko: projectKnowledgeKo,
  'zh-CN': projectKnowledgeZhCN,
  'zh-TW': projectKnowledgeZhTW,
  ar: projectKnowledgeAr,
  he: projectKnowledgeHe,
} as const;
