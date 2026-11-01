import { apiClient, IS_SUPABASE } from '../config/api'
import { isItemArchived, archiveItem, restoreItem, removePermanentArchiveId } from '../utils/archiveStorage'
import { swrQuery, invalidateCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve maintenance / assembly steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : [
          'Verify firearm is completely unloaded and point in safe direction.',
          'Inspect receiver and mechanism for maintenance.',
        ]

  // Resolve multiple images (Challenge #9)
  let imagesList = []
  if (Array.isArray(item.images) && item.images.length > 0) {
    imagesList = item.images.filter(Boolean)
  } else if (typeof item.images === 'string' && item.images.startsWith('[')) {
    try {
      imagesList = JSON.parse(item.images).filter(Boolean)
    } catch {
      imagesList = [item.images]
    }
  }

  const primaryImage =
    imagesList[0] || item.image_url || item.image || '/guns/pistol.svg'

  if (imagesList.length === 0) {
    imagesList = [primaryImage]
  }

  const isArchived = Boolean(item.is_archived || isItemArchived(item.id))

  return {
    ...item,
    id: item.id,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_url: primaryImage,
    image: primaryImage,
    images: imagesList,
    ingredients: specsList,
    steps: stepsList,
    is_archived: isArchived,
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports both Supabase PostgREST table (/rest/v1/products) and
// standard REST API (/api/v1/recipes), with Query Caching & Soft Delete.
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of products with Query Caching.
   */
  async getGuns(params = {}) {
    const cacheKey = `guns_${JSON.stringify(params)}`

    const fetcher = async () => {
      if (IS_SUPABASE) {
        const queryParts = ['select=*']

        if (params.search) {
          queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
        }

        if (params.category && params.category !== 'All') {
          queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
        }

        if (params.sort_by) {
          const order = params.order === 'desc' ? 'desc' : 'asc'
          queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
        } else {
          queryParts.push('order=created_at.desc')
        }

        if (params.limit) {
          queryParts.push(`limit=${params.limit}`)
        }

        const queryString = queryParts.join('&')
        const data = await apiClient.get(`/rest/v1/products?${queryString}`)
        const list = Array.isArray(data) ? data.map(normalizeProduct) : []

        return {
          success: true,
          data: list,
          pagination: {
            total: list.length,
            page: params.page || 1,
            limit: params.limit || 50,
          },
        }
      }

      // Fallback: university REST API
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null),
      )
      const res = await apiClient.get('/api/v1/recipes', { params: clean })
      if (res && res.data && Array.isArray(res.data)) {
        res.data = res.data.map(normalizeProduct)
      }
      return res
    }

    try {
      const { data } = await swrQuery(cacheKey, fetcher, {
        ttlMs: 3 * 60 * 1000, // 3 min cache
      })
      return data
    } catch {
      // Direct call fallback if cache fails
      return fetcher()
    }
  }

  /**
   * Fetch a single product by ID with Query Caching.
   */
  async getGunById(id) {
    const cacheKey = `gun_${id}`

    const fetcher = async () => {
      if (IS_SUPABASE) {
        const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
        if (Array.isArray(data) && data.length > 0) {
          return { success: true, data: normalizeProduct(data[0]) }
        }
        throw new Error('Hardware item not found.')
      }
      const res = await apiClient.get(`/api/v1/recipes/${id}`)
      if (res?.data) {
        res.data = normalizeProduct(res.data)
      }
      return res
    }

    const { data } = await swrQuery(cacheKey, fetcher, {
      ttlMs: 5 * 60 * 1000,
    })
    return data
  }

  /**
   * Create a new product.
   */
  async createGun(data) {
    invalidateCache('guns')

    const imagesList = Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : [data.image_url || data.image || '/guns/pistol.svg']

    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_url: imagesList[0] || null,
        images: imagesList,
      }

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(created) }
    }

    const payload = {
      ...data,
      image_url: imagesList[0] || '/guns/pistol.svg',
      images: imagesList,
    }
    return apiClient.post('/api/v1/recipes', payload)
  }

  /**
   * Update existing product.
   */
  async updateGun(id, data) {
    invalidateCache('guns')
    invalidateCache(`gun_${id}`)

    const imagesList = Array.isArray(data.images)
      ? data.images
      : data.image_url
      ? [data.image_url]
      : undefined

    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (data.image_url !== undefined) payload.image_url = data.image_url
      if (imagesList !== undefined) payload.images = imagesList

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res
      return { success: true, data: normalizeProduct(updated) }
    }

    const payload = { ...data }
    if (imagesList) {
      payload.image_url = imagesList[0]
      payload.images = imagesList
    }
    return apiClient.put(`/api/v1/recipes/${id}`, payload)
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    return this.updateGun(id, data)
  }

  /**
   * Soft Delete / Archive product (Challenge #6).
   */
  async archiveGun(id) {
    archiveItem(id)
    invalidateCache('guns')
    invalidateCache(`gun_${id}`)
    return { success: true, is_archived: true }
  }

  /**
   * Restore archived product (Challenge #6).
   */
  async restoreGun(id) {
    restoreItem(id)
    invalidateCache('guns')
    invalidateCache(`gun_${id}`)
    return { success: true, is_archived: false }
  }

  /**
   * Delete product permanently.
   */
  async deleteGun(id) {
    removePermanentArchiveId(id)
    invalidateCache('guns')
    invalidateCache(`gun_${id}`)

    if (IS_SUPABASE) {
      await apiClient.delete(`/rest/v1/products?id=eq.${id}`)
      return { success: true }
    }
    return apiClient.delete(`/api/v1/recipes/${id}`)
  }
}

export default new GunService()
