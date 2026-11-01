// ---------------------------------------------------------------------------
// localGunStorage.js — Offline-First Persistent Storage for Firearms
// Ensures full CRUD (Create, Edit, Hard Delete, Archive) works 100% reliably
// even on static hosting like Vercel with NO backend database or when
// the backend returns HTTP 405 (Method Not Allowed).
// ---------------------------------------------------------------------------

const DELETED_KEY = 'bore_barrel_deleted_ids'
const CUSTOM_GUNS_KEY = 'bore_barrel_custom_guns'
const MODIFIED_GUNS_KEY = 'bore_barrel_modified_guns'

/**
 * Return array of permanently deleted gun IDs.
 */
export const getDeletedGunIds = () => {
  try {
    const raw = localStorage.getItem(DELETED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Mark a gun ID as permanently deleted.
 */
export const addDeletedGunId = (id) => {
  if (!id) return false
  try {
    const list = getDeletedGunIds()
    const strId = String(id)
    if (!list.includes(strId)) {
      list.push(strId)
      localStorage.setItem(DELETED_KEY, JSON.stringify(list))
    }
    // Also remove from custom guns if present
    removeCustomGun(id)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a gun ID has been permanently deleted.
 */
export const isGunDeleted = (id) => {
  if (!id) return false
  return getDeletedGunIds().includes(String(id))
}

/**
 * Return custom guns added locally by the user.
 */
export const getCustomGuns = () => {
  try {
    const raw = localStorage.getItem(CUSTOM_GUNS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Save a new or updated custom gun locally.
 */
export const saveCustomGun = (gun) => {
  try {
    const list = getCustomGuns()
    const idx = list.findIndex((g) => String(g.id) === String(gun.id))
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...gun }
    } else {
      list.unshift(gun)
    }
    localStorage.setItem(CUSTOM_GUNS_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/**
 * Remove a custom gun from local storage.
 */
export const removeCustomGun = (id) => {
  try {
    const list = getCustomGuns()
    const filtered = list.filter((g) => String(g.id) !== String(id))
    localStorage.setItem(CUSTOM_GUNS_KEY, JSON.stringify(filtered))
    return true
  } catch {
    return false
  }
}

/**
 * Return dictionary of modified gun attributes: { [id]: partialGunData }
 */
export const getModifiedGuns = () => {
  try {
    const raw = localStorage.getItem(MODIFIED_GUNS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Record modifications to a stock/server gun locally.
 */
export const saveModifiedGun = (id, data) => {
  try {
    const all = getModifiedGuns()
    all[String(id)] = { ...(all[String(id)] || {}), ...data }
    localStorage.setItem(MODIFIED_GUNS_KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}

/**
 * Merge raw list (from API or static GUNS_LOCAL) with local additions,
 * modifications, and filter out permanently deleted items.
 *
 * @param {Array} rawList
 * @returns {Array}
 */
export const mergeAllGuns = (rawList = []) => {
  const deletedIds = new Set(getDeletedGunIds())
  const modifiedMap = getModifiedGuns()
  const customGuns = getCustomGuns()

  // 1. Process base list: filter out deleted, apply modifications
  const processedBase = rawList
    .filter((g) => g && !deletedIds.has(String(g.id)) && !deletedIds.has(String(g.name)))
    .map((g) => {
      const overrides = modifiedMap[String(g.id)] || modifiedMap[String(g.name)] || {}
      return { ...g, ...overrides }
    })

  // 2. Process custom guns: filter out deleted
  const processedCustom = customGuns.filter(
    (g) => g && !deletedIds.has(String(g.id)) && !deletedIds.has(String(g.name)),
  )

  // 3. Merge: custom guns first, then base list (avoid duplicate IDs)
  const seenIds = new Set()
  const result = []

  for (const gun of [...processedCustom, ...processedBase]) {
    const key = String(gun.id || gun.name)
    if (!seenIds.has(key)) {
      seenIds.add(key)
      result.push(gun)
    }
  }

  return result
}
