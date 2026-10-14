import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import express from 'express';
import request from 'supertest';
import { createStaticRoutesRuntime } from './static-routes-runtime.js';

const createRuntime = () => createStaticRoutesRuntime({
  fs: { existsSync: () => false },
  path: { join: (...parts) => parts.join('/'), resolve: (value) => value, sep: '/' },
  process: { env: {} },
  __dirname: '/server',
  express,
  resolveProjectDirectory: () => '',
  buildOpenCodeUrl: () => '',
  getOpenCodeAuthHeaders: () => ({}),
  readSettingsFromDiskMigrated: async () => ({}),
  normalizePwaAppName: (value) => value,
  normalizePwaOrientation: (value) => value,
});

const createServingRuntime = (distPath) => createStaticRoutesRuntime({
  fs,
  path,
  process: { env: { OPENCHAMBER_DIST_DIR: distPath } },
  __dirname: '/server',
  express,
  resolveProjectDirectory: () => '',
  buildOpenCodeUrl: () => '',
  getOpenCodeAuthHeaders: () => ({}),
  readSettingsFromDiskMigrated: async () => ({}),
  normalizePwaAppName: (value) => value,
  normalizePwaOrientation: (value) => value,
});

describe('static file caching', () => {
  let distPath;

  beforeAll(() => {
    distPath = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-static-routes-'));
    fs.mkdirSync(path.join(distPath, 'assets'));
    fs.writeFileSync(path.join(distPath, 'index.html'), '<!doctype html>');
    fs.writeFileSync(path.join(distPath, 'sw.js'), '');
    fs.writeFileSync(path.join(distPath, 'favicon.png'), '');
    fs.writeFileSync(path.join(distPath, 'assets', 'SettingsView-DkrERrCE.js'), 'export {}');
  });

  afterAll(() => {
    fs.rmSync(distPath, { recursive: true, force: true });
  });

  const serve = () => {
    const app = express();
    createServingRuntime(distPath).registerStaticRoutes(app);
    return app;
  };

  it('caches content-hashed assets as immutable', async () => {
    const response = await request(serve()).get('/assets/SettingsView-DkrERrCE.js');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('keeps unhashed files revalidated and the service worker uncached', async () => {
    const app = serve();

    const favicon = await request(app).get('/favicon.png');
    const serviceWorker = await request(app).get('/sw.js');

    expect(favicon.headers['cache-control']).toBe('public, max-age=0');
    expect(serviceWorker.headers['cache-control']).toBe('no-store');
  });
});

describe('precompressed assets', () => {
  let distPath;
  const source = 'export const text = "' + 'x'.repeat(2048) + '";';

  beforeAll(() => {
    distPath = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-static-precompressed-'));
    fs.mkdirSync(path.join(distPath, 'assets'));
    fs.writeFileSync(path.join(distPath, 'index.html'), '<!doctype html>');
    fs.writeFileSync(path.join(distPath, 'assets', 'index-abc123.js'), source);
    fs.writeFileSync(path.join(distPath, 'assets', 'index-abc123.js.br'), zlib.brotliCompressSync(source));
    fs.writeFileSync(path.join(distPath, 'assets', 'index-abc123.js.gz'), zlib.gzipSync(source));
    fs.writeFileSync(path.join(distPath, 'assets', 'style-def456.css'), 'body{}');
    fs.writeFileSync(path.join(distPath, 'assets', 'orphan.js.br'), zlib.brotliCompressSync('orphan'));
  });

  afterAll(() => {
    fs.rmSync(distPath, { recursive: true, force: true });
  });

  const serve = ({ early = false } = {}) => {
    const app = express();
    const runtime = createServingRuntime(distPath);
    if (early) {
      expect(runtime.registerHashedAssetRoutes(app)).toBe(true);
      // Anything mounted later must never see an asset request.
      app.use((req, res, next) => {
        if (req.path.startsWith('/assets/')) {
          res.status(500).send('asset request leaked past the early handler');
          return;
        }
        next();
      });
    }
    runtime.registerStaticRoutes(app);
    return app;
  };

  it('serves the brotli sibling with the original content type and cache header', async () => {
    const response = await request(serve())
      .get('/assets/index-abc123.js')
      .set('Accept-Encoding', 'gzip, deflate, br')
      .buffer(true)
      .parse((res, done) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('br');
    expect(response.headers['vary']).toBe('Accept-Encoding');
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    // superagent inflates brotli itself when it can; either way the payload is the source.
    const body = response.body.toString('utf8');
    expect(body === source ? body : zlib.brotliDecompressSync(response.body).toString('utf8')).toBe(source);
  });

  it('serves the gzip sibling when brotli is not accepted', async () => {
    const response = await request(serve()).get('/assets/index-abc123.js').set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.text).toBe(source);
  });

  it('falls back to the plain file without a matching sibling or encoding', async () => {
    const app = serve();

    const identity = await request(app).get('/assets/index-abc123.js').set('Accept-Encoding', 'identity');
    const css = await request(app).get('/assets/style-def456.css').set('Accept-Encoding', 'br');

    expect(identity.status).toBe(200);
    expect(identity.headers['content-encoding']).toBeUndefined();
    expect(identity.text).toBe(source);
    expect(css.status).toBe(200);
    expect(css.headers['content-encoding']).toBeUndefined();
    expect(css.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('never serves a sibling whose original is gone, nor a path outside assets', async () => {
    const app = serve();

    const orphan = await request(app).get('/assets/orphan.js').set('Accept-Encoding', 'br');
    const escape = await request(app).get('/assets/..%2Findex.html').set('Accept-Encoding', 'br');

    expect(orphan.status).toBe(404);
    expect(escape.headers['content-encoding']).toBeUndefined();
  });

  it('answers asset requests from the early mount and registers the handler once', async () => {
    const response = await request(serve({ early: true })).get('/assets/index-abc123.js').set('Accept-Encoding', 'br');

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('br');
  });
});

describe('static routes runtime', () => {
  it('returns API-only HTML fallback for browser UI routes', async () => {
    const app = express();
    createRuntime().registerApiOnlyFallbackRoutes(app);

    const response = await request(app).get('/sessions/abc').set('Accept', 'text/html');

    expect(response.status).toBe(200);
    expect(response.text).toContain('OpenChamber is running in headless mode');
    expect(response.text).toContain('Open it from the OpenChamber desktop or mobile app');
    expect(response.text).toContain('openchamber connect-url --help');
    expect(response.text).toContain('Copy command');
  });

  it('returns API-only info JSON for JSON clients', async () => {
    const app = express();
    createRuntime().registerApiOnlyFallbackRoutes(app);

    const response = await request(app).get('/sessions/abc').set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      mode: 'api-only',
      message: 'OpenChamber is running in API-only mode',
    });
  });

  it('does not intercept API, auth, or health routes in API-only mode', async () => {
    const app = express();
    createRuntime().registerApiOnlyFallbackRoutes(app);

    const api = await request(app).get('/api/version');
    const auth = await request(app).get('/auth/session');
    const health = await request(app).get('/health');

    expect(api.body).not.toEqual({ ok: true, mode: 'api-only', message: 'OpenChamber is running in API-only mode' });
    expect(auth.body).not.toEqual({ ok: true, mode: 'api-only', message: 'OpenChamber is running in API-only mode' });
    expect(health.body).not.toEqual({ ok: true, mode: 'api-only', message: 'OpenChamber is running in API-only mode' });
  });
});
