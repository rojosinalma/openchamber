#!/usr/bin/env node
// Writes a `.br` (brotli, max quality) and a `.gz` (gzip, level 9) sibling next
// to every compressible hashed asset in dist/assets. The server prefers these
// over compressing on the fly: the on-the-fly path costs 100-200 ms of server
// time per 5 MB chunk on a cold cache and brotli q4 is ~20 % larger than q11.
// node:zlib only, no dependency; safe to rerun (stale siblings are rewritten,
// siblings of removed assets are deleted).
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

export const PRECOMPRESS_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.svg', '.json', '.wasm', '.map', '.txt', '.html', '.xml']);
export const PRECOMPRESS_MIN_BYTES = 1024;

const isCompressibleName = (name) => {
  const extension = path.extname(name).toLowerCase();
  return extension.length > 0 && PRECOMPRESS_EXTENSIONS.has(extension);
};

// zlib's async calls run on the libuv threadpool, so several files compress at
// once; UV_THREADPOOL_SIZE (default 4) is the real ceiling.
const DEFAULT_CONCURRENCY = Math.max(2, Math.min(8, os.availableParallelism?.() ?? os.cpus().length));

const runBounded = async (items, limit, work) => {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) await work(queue.shift());
  });
  await Promise.all(workers);
};

export async function precompressDirectory(assetsDir, { minBytes = PRECOMPRESS_MIN_BYTES, concurrency = DEFAULT_CONCURRENCY, log = () => {} } = {}) {
  let entries;
  try {
    entries = await fs.readdir(assetsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return { written: 0, skipped: 0, removed: 0, inputBytes: 0, brotliBytes: 0, gzipBytes: 0 };
    throw error;
  }
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const originals = new Set(files.filter((name) => !name.endsWith('.br') && !name.endsWith('.gz')));
  const summary = { written: 0, skipped: 0, removed: 0, inputBytes: 0, brotliBytes: 0, gzipBytes: 0 };

  // Siblings whose original is gone (or shrank below the threshold) would
  // otherwise be served stale forever under an immutable cache header.
  for (const name of files) {
    if (!name.endsWith('.br') && !name.endsWith('.gz')) continue;
    const original = name.slice(0, -3);
    if (originals.has(original) && isCompressibleName(original)) continue;
    await fs.rm(path.join(assetsDir, name), { force: true });
    summary.removed += 1;
  }

  await runBounded([...originals], concurrency, async (name) => {
    const filePath = path.join(assetsDir, name);
    if (!isCompressibleName(name)) {
      summary.skipped += 1;
      return;
    }
    const source = await fs.readFile(filePath);
    if (source.byteLength < minBytes) {
      await Promise.all([fs.rm(`${filePath}.br`, { force: true }), fs.rm(`${filePath}.gz`, { force: true })]);
      summary.skipped += 1;
      return;
    }
    const [br, gz] = await Promise.all([
      brotli(source, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: source.byteLength,
        },
      }),
      gzip(source, { level: zlib.constants.Z_BEST_COMPRESSION }),
    ]);
    await Promise.all([fs.writeFile(`${filePath}.br`, br), fs.writeFile(`${filePath}.gz`, gz)]);
    summary.written += 1;
    summary.inputBytes += source.byteLength;
    summary.brotliBytes += br.byteLength;
    summary.gzipBytes += gz.byteLength;
    log(`${name}: ${source.byteLength} -> br ${br.byteLength}, gz ${gz.byteLength}`);
  });
  return summary;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const distDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(webRoot, 'dist');
  const startedAt = Date.now();
  const summary = await precompressDirectory(path.join(distDir, 'assets'));
  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  console.log(
    `[precompress] ${summary.written} asset(s) compressed (${mb(summary.inputBytes)} MB -> br ${mb(summary.brotliBytes)} MB, gz ${mb(summary.gzipBytes)} MB), `
    + `${summary.skipped} skipped, ${summary.removed} stale sibling(s) removed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
  );
}
