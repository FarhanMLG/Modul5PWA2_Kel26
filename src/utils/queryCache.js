// ---------------------------------------------------------------------------
// queryCache.js — High-performance in-memory + sessionStorage query cache
// with Stale-While-Revalidate support.
//
// Key Concepts:
//   - fresh window (staleTime, default 2 min): served directly from cache,
//     NO network requests are dispatched on page/tab navigation.
//   - stale window (between staleTime and TTL, up to 5 min): cached data is
//     returned immediately (zero UI delay), then revalidated in the background.
//   - expired (after TTL): cache entry is purged, requiring a fresh fetch.
//   - sessionStorage mirror: preserves cache across browser reloads (F5) in the
//     same session without hitting the API again.
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL
const DEFAULT_STALE_MS = 2 * 60 * 1000 // 2 minutes staleTime
const SESSION_STORAGE_KEY = 'bore_barrel_query_cache_v1'

class QueryCache {
  constructor(ttl = DEFAULT_TTL_MS, staleTime = DEFAULT_STALE_MS) {
    this._ttl = ttl
    this._staleTime = staleTime
    this._store = new Map()

    // Hydrate from sessionStorage if available
    this._hydrateFromSession()
  }

  _hydrateFromSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const now = Date.now()
      for (const [key, entry] of Object.entries(parsed)) {
        if (entry && entry.expiresAt > now) {
          this._store.set(key, entry)
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }

  _persistToSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    try {
      const serialized = {}
      const now = Date.now()
      for (const [key, entry] of this._store.entries()) {
        if (entry && entry.expiresAt > now) {
          serialized[key] = entry
        }
      }
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serialized))
    } catch {
      // Ignore quota exceeded or storage disabled
    }
  }

  /**
   * Deterministic cache key generator.
   */
  key(namespace, params = {}) {
    const sorted = Object.keys(params || {})
      .sort()
      .reduce((acc, k) => {
        acc[k] = params[k]
        return acc
      }, {})
    return `${namespace}:${JSON.stringify(sorted)}`
  }

  /**
   * Return the cached data payload if not expired.
   */
  get(cacheKey) {
    const entry = this._store.get(cacheKey)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this._store.delete(cacheKey)
      this._persistToSession()
      return undefined
    }
    return entry.data
  }

  /**
   * Check if a cache entry is fresh (within staleTime).
   * When fresh, callers should NOT dispatch any network requests.
   */
  isFresh(cacheKey) {
    const entry = this._store.get(cacheKey)
    if (!entry) return false
    const now = Date.now()
    if (now > entry.expiresAt) {
      this._store.delete(cacheKey)
      return false
    }
    const age = now - entry.cachedAt
    return age < (entry.staleTime || this._staleTime)
  }

  /**
   * Check if a cache entry exists and is still valid (fresh OR stale, but not expired).
   */
  has(cacheKey) {
    return this.get(cacheKey) !== undefined
  }

  /**
   * Store data in cache with TTL and staleTime.
   */
  set(cacheKey, data, options = {}) {
    const ttl = options.ttl || this._ttl
    const staleTime = options.staleTime || this._staleTime
    const now = Date.now()

    this._store.set(cacheKey, {
      data,
      cachedAt: now,
      expiresAt: now + ttl,
      staleTime,
    })

    this._persistToSession()
    console.log(`%c💾 [QueryCache STORE]`, 'color: #3498db; font-weight: bold;', `Data disimpan ke cache: ${cacheKey}`)
  }

  /**
   * Invalidate entries by prefix (e.g. 'guns', 'gun') or all entries if omitted.
   */
  invalidate(prefix = '') {
    if (!prefix) {
      this._store.clear()
    } else {
      for (const key of Array.from(this._store.keys())) {
        if (key.startsWith(prefix)) {
          this._store.delete(key)
        }
      }
    }
    this._persistToSession()
    console.log(`%c🗑️ [QueryCache INVALIDATE]`, 'color: #e74c3c; font-weight: bold;', `Cache dibersihkan: ${prefix || 'SEMUA'}`)
  }

  /**
   * Total number of valid cached entries.
   */
  get size() {
    let count = 0
    const now = Date.now()
    for (const entry of this._store.values()) {
      if (now <= entry.expiresAt) count++
    }
    return count
  }
}

// Global singleton
export const queryCache = new QueryCache()