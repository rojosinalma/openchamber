/**
 * Caches the answer to `GET /api/opencode/compatibility`. Computing it spawns
 * `opencode --version` (managed) or asks the external server's `/api/info`,
 * and every page load asks before the UI mounts, so the result is held for a
 * short, configurable time. A failure or an unavailable/incompatible result is
 * never held for more than a couple of seconds: a user fixing the install
 * should see the fix at the next click. Concurrent calls share one
 * computation. `invalidate()` drops the entry; the server calls it when the
 * OpenCode process, port or binary changes.
 */
const DEFAULT_COMPATIBILITY_CACHE_MS = 30_000;
const DEFAULT_COMPATIBILITY_NEGATIVE_CACHE_MS = 2_000;

/** `value` is the environment variable's text, or undefined when it is unset. */
export const parseCompatibilityCacheMs = (value, fallback = DEFAULT_COMPATIBILITY_CACHE_MS) => {
  if (!value || value.trim().length === 0) return fallback;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
};

export const createCompatibilityCache = ({
  compute,
  ttlMs = DEFAULT_COMPATIBILITY_CACHE_MS,
  negativeTtlMs = DEFAULT_COMPATIBILITY_NEGATIVE_CACHE_MS,
  now = Date.now,
}) => {
  let entry = null;
  let inFlight = null;
  let generation = 0;

  const ttlFor = (result) => (result?.state === 'compatible' ? ttlMs : Math.min(ttlMs, negativeTtlMs));

  const get = async () => {
    if (ttlMs <= 0) return compute();
    if (entry && now() < entry.expiresAt) return entry.value;
    if (inFlight) return inFlight;
    const startedGeneration = generation;
    inFlight = (async () => {
      try {
        const value = await compute();
        if (generation === startedGeneration) {
          entry = { value, expiresAt: now() + ttlFor(value) };
        }
        return value;
      } catch (error) {
        // A thrown check is the route's 503; the next call tries again.
        entry = null;
        throw error;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  };

  const invalidate = () => {
    entry = null;
    generation += 1;
  };

  return { get, invalidate };
};
