// ---------------------------------------------------------------------------
// queryCache.js — Lightweight Stale-While-Revalidate (SWR) Query Caching
// Caches queries in memory and localStorage with customizable TTL.
// Ensures instant UI rendering (0ms), offline tolerance, and auto-revalidation.
// ---------------------------------------------------------------------------

const MEMORY_CACHE = new Map()
const CACHE_PREFIX = 'bb_cache_'
const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Retrieve cached entry from memory or localStorage.
 * @param {string} key
 * @returns {{ data: any, isStale: boolean } | null}
 */
export const getCached = (key) => {
  const fullKey = `${CACHE_PREFIX}${key}`
  const now = Date.now()

  // 1. Check memory cache first (fastest)
  if (MEMORY_CACHE.has(fullKey)) {
    const entry = MEMORY_CACHE.get(fullKey)
    const isStale = now > entry.expiry
    return { data: entry.data, isStale }
  }

  // 2. Check localStorage fallback
  try {
    const raw = localStorage.getItem(fullKey)
    if (!raw) return null
    const entry = JSON.parse(raw)
    const isStale = now > entry.expiry
    // Promote back to memory cache
    MEMORY_CACHE.set(fullKey, entry)
    return { data: entry.data, isStale }
  } catch {
    return null
  }
}

/**
 * Store data into cache with a TTL.
 * @param {string} key
 * @param {any} data
 * @param {number} [ttlMs=DEFAULT_TTL_MS]
 */
export const setCached = (key, data, ttlMs = DEFAULT_TTL_MS) => {
  const fullKey = `${CACHE_PREFIX}${key}`
  const now = Date.now()
  const entry = {
    data,
    timestamp: now,
    expiry: now + ttlMs,
  }

  // Save to memory
  MEMORY_CACHE.set(fullKey, entry)

  // Save to localStorage
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry))
  } catch (err) {
    console.warn('[queryCache] LocalStorage quota reached, cached only in memory', err)
  }
}

/**
 * Invalidate a specific key or keys starting with a prefix.
 * @param {string} keyPrefix
 */
export const invalidateCache = (keyPrefix = '') => {
  const fullPrefix = `${CACHE_PREFIX}${keyPrefix}`

  // Memory
  for (const k of Array.from(MEMORY_CACHE.keys())) {
    if (k.startsWith(fullPrefix)) {
      MEMORY_CACHE.delete(k)
    }
  }

  // LocalStorage
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(fullPrefix)) {
        localStorage.removeItem(k)
      }
    }
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Execute a query with Stale-While-Revalidate caching.
 * @param {string} key - Unique cache key
 * @param {Function} fetcher - Async function returning data
 * @param {Object} [options]
 * @param {number} [options.ttlMs]
 * @param {Function} [options.onSuccess] - Callback when fresh data arrives
 * @returns {Promise<{ data: any, fromCache: boolean }>}
 */
export const swrQuery = async (key, fetcher, options = {}) => {
  const { ttlMs = DEFAULT_TTL_MS, onSuccess } = options
  const cached = getCached(key)

  if (cached) {
    // If cache is fresh, still return it. If stale, fetch in background.
    if (cached.isStale) {
      // Background revalidation
      fetcher()
        .then((fresh) => {
          if (fresh) {
            setCached(key, fresh, ttlMs)
            if (onSuccess) onSuccess(fresh)
          }
        })
        .catch((err) => {
          console.warn(`[queryCache] Background refresh failed for ${key}:`, err)
        })
    }
    return { data: cached.data, fromCache: true }
  }

  // Not in cache, fetch immediately
  const fresh = await fetcher()
  setCached(key, fresh, ttlMs)
  if (onSuccess) onSuccess(fresh)
  return { data: fresh, fromCache: false }
}
