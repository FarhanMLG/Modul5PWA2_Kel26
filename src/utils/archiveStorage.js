// ---------------------------------------------------------------------------
// archiveStorage.js — Soft delete / archive persistence utility
// Stores archived item IDs in localStorage to ensure soft delete works
// even when backend does not have an explicit is_archived column.
// ---------------------------------------------------------------------------

const ARCHIVE_KEY = 'bore_barrel_archived_ids'

export const getArchivedIds = () => {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const isItemArchived = (id) => {
  if (!id) return false
  const ids = getArchivedIds()
  return ids.includes(String(id))
}

export const archiveItem = (id) => {
  if (!id) return false
  try {
    const ids = getArchivedIds()
    const strId = String(id)
    if (!ids.includes(strId)) {
      ids.push(strId)
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(ids))
    }
    return true
  } catch {
    return false
  }
}

export const restoreItem = (id) => {
  if (!id) return false
  try {
    const ids = getArchivedIds()
    const strId = String(id)
    const filtered = ids.filter((item) => item !== strId)
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(filtered))
    return true
  } catch {
    return false
  }
}

export const removePermanentArchiveId = (id) => {
  return restoreItem(id)
}
