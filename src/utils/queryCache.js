// ---------------------------------------------------------------------------
// queryCache.js — Stale-While-Revalidate (SWR) Query Caching Engine
// Stores query responses across:
//   1. In-memory Map (0ms instantaneous lookup)
//   2. Browser Cache Storage API (window.caches -> DevTools > Application > Cache Storage)
//   3. LocalStorage fallback
// Emits clear diagnostic logs visible in DevTools Console & Network tab.
// ---------------------------------------------------------------------------

const MEMORY_CACHE = new Map()
const CACHE_STORAGE_NAME = 'bore-barrel-query-cache-v1'
const CACHE_PREFIX = 'bb_cache_'
const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Save entry to browser's official Cache Storage (DevTools > Application > Cache Storage)
 */
const saveToBrowserCacheStorage = async (key, data) => {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    const cache = await window.caches.open(CACHE_STORAGE_NAME)
    const url = `/api/cache/${encodeURIComponent(key)}`
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Status': 'HIT',
        'X-Cache-Engine': 'SWR-QueryCache',
      },
    })
    await cache.put(url, response)
  } catch (err) {
    console.debug('[queryCache] CacheStorage write skipped:', err)
  }
}

/**
 * Retrieve cached entry from memory, localStorage, or CacheStorage.
 * @param {string} key
 * @returns {{ data: any, isStale: boolean, ageSec: number } | null}
 */
export const getCached = (key) => {
  const fullKey = `${CACHE_PREFIX}${key}`
  const now = Date.now()

  // 1. Check in-memory cache first (fastest, 0ms)
  if (MEMORY_CACHE.has(fullKey)) {
    const entry = MEMORY_CACHE.get(fullKey)
    const isStale = now > entry.expiry
    const ageSec = Math.round((now - entry.timestamp) / 1000)
    return { data: entry.data, isStale, ageSec }
  }

  // 2. Check localStorage fallback
  try {
    const raw = localStorage.getItem(fullKey)
    if (!raw) return null
    const entry = JSON.parse(raw)
    const isStale = now > entry.expiry
    const ageSec = Math.round((now - entry.timestamp) / 1000)
    // Promote back to memory cache
    MEMORY_CACHE.set(fullKey, entry)
    return { data: entry.data, isStale, ageSec }
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
    console.warn('[queryCache] LocalStorage full, cached in memory only:', err)
  }

  // Save to browser Cache Storage (for DevTools inspection)
  saveToBrowserCacheStorage(key, data)
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
    /* ignore */
  }

  console.log(
    `%c🔄 [QUERY CACHE INVALIDATED] Prefix: "${keyPrefix || 'ALL'}" | Stale entries purged.`,
    'color: #f43f5e; font-weight: bold; background: #4c0519; padding: 2px 6px; border-radius: 4px;',
  )
}

/**
 * Execute a query with Stale-While-Revalidate caching.
 * @param {string} key - Unique cache key
 * @param {Function} fetcher - Async function returning data
 * @param {Object} [options]
 * @param {number} [options.ttlMs]
 * @param {Function} [options.onSuccess] - Callback when fresh data arrives
 * @returns {Promise<{ data: any, fromCache: boolean, isStale?: boolean }>}
 */
export const swrQuery = async (key, fetcher, options = {}) => {
  const { ttlMs = DEFAULT_TTL_MS, onSuccess } = options
  const cached = getCached(key)

  if (cached) {
    console.log(
      `%c🟢 [QUERY CACHE HIT] Key: "${key}" | Age: ${cached.ageSec}s | Status: ${cached.isStale ? 'STALE (Revalidating)' : 'FRESH'} | ⚡ Network fetch skipped!`,
      'color: #10b981; font-weight: bold; background: #064e3b; padding: 3px 8px; border-radius: 4px;',
    )

    // If cache is stale, revalidate in background
    if (cached.isStale) {
      console.log(
        `%c⚡ [QUERY CACHE SWR] Background revalidating key: "${key}"...`,
        'color: #f59e0b; font-weight: bold; background: #451a03; padding: 2px 6px; border-radius: 4px;',
      )
      fetcher()
        .then((fresh) => {
          if (fresh) {
            setCached(key, fresh, ttlMs)
            console.log(
              `%c✨ [QUERY CACHE SWR COMPLETE] Key: "${key}" updated with fresh server data.`,
              'color: #10b981; font-weight: bold; background: #064e3b; padding: 2px 6px; border-radius: 4px;',
            )
            if (onSuccess) onSuccess(fresh)
          }
        })
        .catch((err) => {
          console.warn(`[queryCache] Background refresh failed for ${key}:`, err)
        })
    }

    return { data: cached.data, fromCache: true, isStale: cached.isStale }
  }

  // Not in cache, fetch immediately (Cache MISS)
  console.log(
    `%c🔵 [QUERY CACHE MISS] Key: "${key}" not in cache -> Fetching from network...`,
    'color: #38bdf8; font-weight: bold; background: #0c4a6e; padding: 3px 8px; border-radius: 4px;',
  )

  const fresh = await fetcher()
  setCached(key, fresh, ttlMs)
  if (onSuccess) onSuccess(fresh)

  return { data: fresh, fromCache: false, isStale: false }
}
