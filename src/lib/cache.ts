/**
 * In-process memory/cache layer. Wrap an expensive, deterministic call (Orange
 * Slice scrape / audience / contacts) so identical inputs are reused within the
 * TTL instead of re-billing credits.
 *
 * Deliberately NOT backed by a public Convex table: the cached values include
 * prospect PII (work emails), and any public/queryable store would be readable
 * and poisonable by anyone with the (public) Convex URL. A process-scoped map
 * has no external attack surface. Scope is per server instance; that's fine for
 * credit-saving within a session.
 */
type Entry = { value: unknown; exp: number };
const store = new Map<string, Entry>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) {
    return hit.value as T;
  }
  const value = await producer();
  store.set(key, { value, exp: Date.now() + ttlMs });
  // light cap so a long-running server can't grow the map unbounded
  if (store.size > 500) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  return value;
}

/** Stable cache key from a prefix + arbitrary input (order-independent). */
export function cacheKey(prefix: string, input: Record<string, unknown>): string {
  const norm = JSON.stringify(input, Object.keys(input).sort());
  return `${prefix}:${norm}`;
}
