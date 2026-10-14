#!/usr/bin/env node
// Splits the monolithic feature message tables (messages/<name>.i18n.ts, one
// object with every locale) into per-locale modules (messages/<name>/<locale>.ts)
// and rewrites the locale dictionaries (messages/<locale>.ts, <locale>.settings.ts)
// to import those, so the English startup bundle does not carry the
// other translations. The <name>.i18n.ts file keeps exporting the full map
// (built from the per-locale modules) for its key-parity test, and is removed
// when it has none.
//
// Idempotent. Run it after taking upstream's version of messages/ on a rebase:
//   node packages/ui/scripts/split-i18n-tables.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const messagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/i18n/messages');

const LOCALE_SUFFIX = {
  en: 'En', nl: 'Nl', de: 'De', es: 'Es', fr: 'Fr', ja: 'Ja', ko: 'Ko', pl: 'Pl',
  'pt-BR': 'PtBR', tr: 'Tr', uk: 'Uk', 'zh-CN': 'ZhCN', 'zh-TW': 'ZhTW', ar: 'Ar', he: 'He',
};

const header = (lines) => {
  const out = [];
  for (const line of lines) {
    if (line.startsWith('/**') || line.startsWith('//') || line.startsWith(' *') || line.trim() === '') out.push(line);
    else break;
  }
  return out.filter((line) => line.trim() !== '').join('\n');
};

const splitTable = (file) => {
  const name = path.basename(file, '.i18n.ts');
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const exportLine = lines.findIndex((line) => /^export const [A-Za-z]+I18n = \{$/.test(line));
  if (exportLine === -1) return null; // not a table
  if (!/\{$/.test(lines[exportLine + 1] ?? '')) return null; // already split: the entries are imports
  const constName = lines[exportLine].match(/^export const ([A-Za-z]+)I18n/)[1];
  const doc = header(lines.slice(0, exportLine));
  const locales = [];
  let i = exportLine + 1;
  while (i < lines.length && lines[i] !== '} as const;') {
    const open = lines[i].match(/^  '?([A-Za-z-]+)'?: \{$/);
    if (!open) throw new Error(`${file}:${i + 1}: unexpected line ${JSON.stringify(lines[i])}`);
    const locale = open[1];
    const body = [];
    i += 1;
    while (!/^  \},?$/.test(lines[i])) {
      body.push(lines[i].startsWith('  ') ? lines[i].slice(2) : lines[i]);
      i += 1;
    }
    locales.push({ locale, body });
    i += 1;
  }
  if (!LOCALE_SUFFIX[locales[0]?.locale]) throw new Error(`${file}: no locales found`);

  const dir = path.join(messagesDir, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const { locale, body } of locales) {
    const suffix = LOCALE_SUFFIX[locale];
    if (!suffix) throw new Error(`${file}: unknown locale ${locale}`);
    const text = `${doc ? `${doc}\n` : ''}export const ${constName}${suffix} = {\n${body.join('\n')}\n} as const;\n`;
    fs.writeFileSync(path.join(dir, `${locale}.ts`), text);
  }
  // The full map only serves the key-parity test; a table without one would
  // be an unused file (knip), so its index goes and the dictionaries alone
  // import the per-locale modules.
  if (!fs.existsSync(path.join(messagesDir, `${name}.i18n.test.ts`))) {
    fs.rmSync(file);
    return { name, constName };
  }
  const imports = locales.map(({ locale }) => `import { ${constName}${LOCALE_SUFFIX[locale]} } from './${name}/${locale}';`);
  const entries = locales.map(({ locale }) => `  ${/-/.test(locale) ? `'${locale}'` : locale}: ${constName}${LOCALE_SUFFIX[locale]},`);
  const index = [
    ...(doc ? [doc] : []),
    '// Every locale in one object, for the key-parity tests. Runtime code imports the',
    `// per-locale modules under ./${name}/ so the English startup bundle does not`,
    '// carry the other translations.',
    ...imports,
    '',
    `export const ${constName}I18n = {`,
    ...entries,
    '} as const;',
    '',
  ].join('\n');
  fs.writeFileSync(file, index);
  return { name, constName };
};

const rewriteDictionary = (file, tables) => {
  const locale = path.basename(file, '.ts').replace(/\.settings$/, '');
  const suffix = LOCALE_SUFFIX[locale];
  if (!suffix) return;
  let text = fs.readFileSync(file, 'utf8');
  for (const { name, constName } of tables) {
    const importRe = new RegExp(`^import \\{ ${constName}I18n \\} from '\\./${name.replace(/\./g, '\\.')}\\.i18n';$`, 'm');
    text = text.replace(importRe, `import { ${constName}${suffix} } from './${name}/${locale}';`);
    const spreadRe = new RegExp(`^(\\s*)\\.\\.\\.${constName}I18n(?:\\.${locale}|\\['${locale}'\\]),$`, 'gm');
    text = text.replace(spreadRe, `$1...${constName}${suffix},`);
  }
  fs.writeFileSync(file, text);
};

const tableFiles = fs.readdirSync(messagesDir).filter((f) => f.endsWith('.i18n.ts')).sort();
const tables = [];
for (const f of tableFiles) {
  const full = path.join(messagesDir, f);
  const split = splitTable(full);
  if (split) tables.push(split);
  else {
    const name = path.basename(f, '.i18n.ts');
    const m = fs.readFileSync(full, 'utf8').match(/^export const ([A-Za-z]+)I18n = \{$/m);
    if (m) tables.push({ name, constName: m[1] });
    if (m && !fs.existsSync(path.join(messagesDir, `${name}.i18n.test.ts`))) fs.rmSync(full);
  }
}
for (const f of fs.readdirSync(messagesDir)) {
  if (/^[a-z]{2}(-[A-Z]{2})?(\.settings)?\.ts$/.test(f)) rewriteDictionary(path.join(messagesDir, f), tables);
}
const leftovers = [];
for (const f of fs.readdirSync(messagesDir)) {
  if (!/^[a-z]{2}(-[A-Z]{2})?(\.settings)?\.ts$/.test(f)) continue;
  const text = fs.readFileSync(path.join(messagesDir, f), 'utf8');
  const hits = text.match(/[A-Za-z]+I18n(\.[a-z]|\[)/g);
  if (hits) leftovers.push(`${f}: ${[...new Set(hits)].join(' ')}`);
}
if (leftovers.length > 0) {
  console.error(`unsplit references remain:\n  ${leftovers.join('\n  ')}`);
  process.exit(1);
}
console.log(`split ${tables.length} tables into per-locale modules`);
