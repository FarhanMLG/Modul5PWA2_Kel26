import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import { getCached } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API with SWR caching.
//
// Returns { guns, loading, error, pagination, refetch, fromCache }.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const paramKey = JSON.stringify(params)
  const cacheKey = `guns_${paramKey}`

  // Initialize immediately from QueryCache if available (0ms instant render)
  const initialCache = getCached(cacheKey)

  const [guns, setGuns] = useState(() => initialCache?.data?.data || [])
  const [loading, setLoading] = useState(() => !initialCache)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(() => initialCache?.data?.pagination || null)
  const [fromCache, setFromCache] = useState(() => Boolean(initialCache))

  const fetchGuns = useCallback(async () => {
    try {
      const cached = getCached(cacheKey)
      if (!cached) {
        setLoading(true)
      }
      setError(null)

      const response = await gunService.getGuns(params)

      if (response && response.success) {
        setGuns(response.data || [])
        setPagination(response.pagination || null)
        setFromCache(true)
      } else {
        setError(response?.message || 'Failed to fetch products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      // Keep cached guns if available on error
      if (!initialCache) setGuns([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey])

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return { guns, loading, error, pagination, refetch: fetchGuns, fromCache }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID with SWR caching.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const cacheKey = `gun_${id}`
  const initialCache = id ? getCached(cacheKey) : null

  const [gun, setGun] = useState(() => initialCache?.data?.data || null)
  const [loading, setLoading] = useState(() => !initialCache && Boolean(id))
  const [error, setError] = useState(null)

  const fetchGun = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    try {
      const cached = getCached(cacheKey)
      if (!cached) setLoading(true)
      setError(null)

      const response = await gunService.getGunById(id)

      if (response && response.success) {
        setGun(response.data)
      } else {
        setError(response?.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      if (!initialCache) setGun(null)
    } finally {
      setLoading(false)
    }
  }, [id, cacheKey, initialCache])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: fetchGun }
}
