// Lightweight client-side request cache with in-flight de-duplication.
//
// Why: several CRM screens fetch the SAME lookup endpoints (lead-branches,
// client-companies, contact/project statuses, categories, …) from multiple
// components on the same page load — the server log showed the same URL hit 2–3×.
// This wrapper (a) shares a single in-flight promise when concurrent callers ask for
// the same key, and (b) caches the resolved value for a short TTL so quick remounts
// reuse it. Errors are never cached. Call `invalidateRequestCache(prefix)` after a
// create/update/delete so the next read is fresh.

type CacheEntry = { ts: number; value: unknown };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export const DEFAULT_TTL_MS = 60_000; // 1 min

export async function cachedRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) {
    return hit.value as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await fn();
      cache.set(key, { ts: Date.now(), value });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Drop cached entries. With no arg clears everything; with a prefix clears matching keys. */
export function invalidateRequestCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const k of Array.from(cache.keys())) {
    if (k.startsWith(keyPrefix)) cache.delete(k);
  }
}
