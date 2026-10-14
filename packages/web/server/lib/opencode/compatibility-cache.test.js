import { describe, expect, it } from 'vitest';
import { createCompatibilityCache, parseCompatibilityCacheMs } from './compatibility-cache.js';

const compatible = { state: 'compatible', version: '2.0.22', installation: 'managed', canInstall: false };
const unavailable = { state: 'unavailable', version: null, installation: 'managed', canInstall: false };

const clock = (start = 1_000_000) => {
  let current = start;
  return { now: () => current, advance: (ms) => { current += ms; } };
};

describe('compatibility cache', () => {
  it('serves a compatible result for the ttl, then recomputes', async () => {
    const time = clock();
    let calls = 0;
    const cache = createCompatibilityCache({ compute: async () => { calls += 1; return compatible; }, ttlMs: 30_000, now: time.now });

    expect(await cache.get()).toEqual(compatible);
    expect(await cache.get()).toEqual(compatible);
    time.advance(29_999);
    await cache.get();
    expect(calls).toBe(1);
    time.advance(2);
    await cache.get();
    expect(calls).toBe(2);
  });

  it('holds an unavailable or incompatible result only for the short negative ttl', async () => {
    const time = clock();
    let calls = 0;
    const cache = createCompatibilityCache({ compute: async () => { calls += 1; return unavailable; }, ttlMs: 30_000, negativeTtlMs: 2_000, now: time.now });

    await cache.get();
    time.advance(1_500);
    await cache.get();
    expect(calls).toBe(1);
    time.advance(600);
    await cache.get();
    expect(calls).toBe(2);
  });

  it('shares one computation between concurrent callers and never caches a failure', async () => {
    let calls = 0;
    let fail = true;
    const cache = createCompatibilityCache({
      compute: async () => {
        calls += 1;
        if (fail) throw new Error('spawn failed');
        return compatible;
      },
    });

    await expect(Promise.all([cache.get(), cache.get(), cache.get()])).rejects.toThrow('spawn failed');
    expect(calls).toBe(1);
    fail = false;
    expect(await cache.get()).toEqual(compatible);
    expect(calls).toBe(2);
  });

  it('invalidation drops the entry and discards a result computed before it', async () => {
    let release = () => {};
    let calls = 0;
    const cache = createCompatibilityCache({
      compute: () => new Promise((resolve) => { calls += 1; release = () => resolve(compatible); }),
    });

    const pending = cache.get();
    cache.invalidate();
    release();
    expect(await pending).toEqual(compatible);
    // The entry from before the invalidation is not reused.
    const next = cache.get();
    release();
    await next;
    expect(calls).toBe(2);
  });

  it('a zero ttl disables the cache', async () => {
    let calls = 0;
    const cache = createCompatibilityCache({ compute: async () => { calls += 1; return compatible; }, ttlMs: 0 });
    await cache.get();
    await cache.get();
    expect(calls).toBe(2);
  });

  it('parses the env override and falls back on nonsense', () => {
    expect(parseCompatibilityCacheMs(undefined)).toBe(30_000);
    expect(parseCompatibilityCacheMs('')).toBe(30_000);
    expect(parseCompatibilityCacheMs('5000')).toBe(5_000);
    expect(parseCompatibilityCacheMs('0')).toBe(0);
    expect(parseCompatibilityCacheMs('-1')).toBe(30_000);
    expect(parseCompatibilityCacheMs('soon')).toBe(30_000);
  });
});
