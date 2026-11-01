import { apiClient, IS_SUPABASE } from '../config/api'
import { swrQuery, invalidateCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Local fallback review storage & thumbs up/down voting
// ---------------------------------------------------------------------------
const LOCAL_REVIEWS_KEY = 'bore_barrel_local_reviews'
const LOCAL_VOTES_KEY = 'bore_barrel_review_votes'

const getLocalReviews = () => {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveLocalReviews = (data) => {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

const getLocalVotes = () => {
  try {
    const raw = localStorage.getItem(LOCAL_VOTES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveLocalVotes = (votes) => {
  try {
    localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(votes))
  } catch {
    /* ignore */
  }
}

/**
 * Normalise review object with vote counters and user vote state.
 */
const normaliseReview = (r, userIdentifier) => {
  const votes = getLocalVotes()
  const reviewVotes = votes[r.id] || { up: 0, down: 0, userVotes: {} }
  const currentUserVote = userIdentifier ? reviewVotes.userVotes[userIdentifier] || null : null

  return {
    id: r.id,
    product_id: r.product_id,
    user_id: r.user_id || r.user_identifier,
    user_identifier:
      r.user_name ||
      (r.user_id
        ? String(r.user_id).startsWith('anon_') || String(r.user_id).length < 15
          ? `Operator ${r.user_id}`
          : `Operator ${String(r.user_id).substring(0, 8)}`
        : r.user_identifier || 'Operator'),
    rating: Number(r.rating) || 5,
    comment: r.comment || '',
    created_at: r.created_at || new Date().toISOString(),
    thumbs_up: (r.thumbs_up || 0) + (reviewVotes.up || 0),
    thumbs_down: (r.thumbs_down || 0) + (reviewVotes.down || 0),
    user_vote: currentUserVote,
  }
}

class ReviewService {
  /**
   * Fetch all reviews for a given product (with query caching & vote enrichment).
   */
  async getReviews(gunId, userIdentifier) {
    const cacheKey = `reviews_${gunId}`

    const fetcher = async () => {
      let serverReviews = []

      try {
        if (IS_SUPABASE) {
          const data = await apiClient.get(
            `/rest/v1/reviews?product_id=eq.${gunId}&select=*&order=created_at.desc`,
          )
          if (Array.isArray(data)) serverReviews = data
        } else {
          const res = await apiClient.get(`/api/v1/recipes/${gunId}/reviews`)
          if (res?.data && Array.isArray(res.data)) {
            serverReviews = res.data
          }
        }
      } catch (err) {
        console.warn('[ReviewService] Server fetch failed, using local reviews store:', err)
      }

      // Merge with local offline reviews
      const allLocal = getLocalReviews()
      const gunLocal = allLocal[gunId] || []

      const combined = [...serverReviews]
      gunLocal.forEach((loc) => {
        if (!combined.some((s) => String(s.id) === String(loc.id))) {
          combined.unshift(loc)
        }
      })

      const list = combined.map((r) => normaliseReview(r, userIdentifier))
      return { success: true, data: list }
    }

    try {
      const { data } = await swrQuery(cacheKey, fetcher, { ttlMs: 60 * 1000 })
      return data
    } catch {
      return fetcher()
    }
  }

  /**
   * Submit a new review (CREATE).
   */
  async createReview(gunId, reviewData) {
    invalidateCache(`reviews_${gunId}`)

    const newLocalReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: gunId,
      user_id: reviewData.user_id || reviewData.user_identifier,
      user_identifier: reviewData.username || reviewData.user_identifier,
      rating: Number(reviewData.rating),
      comment: reviewData.comment || '',
      created_at: new Date().toISOString(),
    }

    try {
      if (IS_SUPABASE) {
        const payload = {
          product_id: Number(gunId) || gunId,
          user_id: reviewData.user_id || reviewData.user_identifier,
          rating: Number(reviewData.rating),
          comment: reviewData.comment || '',
        }

        const res = await apiClient.post('/rest/v1/reviews', payload, {
          headers: { Prefer: 'return=representation' },
        })
        const created = Array.isArray(res) ? res[0] : res
        return { success: true, data: created || newLocalReview }
      }

      const res = await apiClient.post(`/api/v1/recipes/${gunId}/reviews`, reviewData)
      return res || { success: true, data: newLocalReview }
    } catch (err) {
      console.warn('[ReviewService] Server error, falling back to local review store:', err)
      // Save locally
      const all = getLocalReviews()
      if (!all[gunId]) all[gunId] = []
      all[gunId].unshift(newLocalReview)
      saveLocalReviews(all)
      return { success: true, data: newLocalReview }
    }
  }

  /**
   * Edit an existing review (UPDATE).
   */
  async updateReview(gunId, reviewId, reviewData) {
    invalidateCache(`reviews_${gunId}`)

    try {
      if (IS_SUPABASE) {
        const res = await apiClient.patch(
          `/rest/v1/reviews?id=eq.${reviewId}`,
          {
            rating: Number(reviewData.rating),
            comment: reviewData.comment,
          },
          { headers: { Prefer: 'return=representation' } },
        )
        return { success: true, data: Array.isArray(res) ? res[0] : res }
      }

      return apiClient.put(`/api/v1/reviews/${reviewId}`, reviewData)
    } catch (err) {
      console.warn('[ReviewService] Fallback to local update:', err)
      // Update in local storage
      const all = getLocalReviews()
      if (all[gunId]) {
        all[gunId] = all[gunId].map((r) =>
          String(r.id) === String(reviewId)
            ? { ...r, rating: Number(reviewData.rating), comment: reviewData.comment }
            : r,
        )
        saveLocalReviews(all)
      }
      return { success: true }
    }
  }

  /**
   * Delete a review (DELETE).
   */
  async deleteReview(gunId, reviewId) {
    invalidateCache(`reviews_${gunId}`)

    try {
      if (IS_SUPABASE) {
        await apiClient.delete(`/rest/v1/reviews?id=eq.${reviewId}`)
      } else {
        await apiClient.delete(`/api/v1/reviews/${reviewId}`)
      }
    } catch (err) {
      console.warn('[ReviewService] Fallback to local delete:', err)
    }

    // Always ensure removed from local storage
    const all = getLocalReviews()
    if (all[gunId]) {
      all[gunId] = all[gunId].filter((r) => String(r.id) !== String(reviewId))
      saveLocalReviews(all)
    }

    return { success: true }
  }

  /**
   * Cast a vote: thumbs up or thumbs down.
   * Allows toggling vote on/off or switching between up and down.
   */
  voteReview(reviewId, voteType, userIdentifier) {
    if (!reviewId || !userIdentifier) return null

    const allVotes = getLocalVotes()
    if (!allVotes[reviewId]) {
      allVotes[reviewId] = { up: 0, down: 0, userVotes: {} }
    }

    const item = allVotes[reviewId]
    const previousVote = item.userVotes[userIdentifier]

    if (previousVote === voteType) {
      // Toggle off / remove vote
      if (voteType === 'up') item.up = Math.max(0, item.up - 1)
      if (voteType === 'down') item.down = Math.max(0, item.down - 1)
      delete item.userVotes[userIdentifier]
    } else {
      // Decrement old vote if existed
      if (previousVote === 'up') item.up = Math.max(0, item.up - 1)
      if (previousVote === 'down') item.down = Math.max(0, item.down - 1)

      // Add new vote
      if (voteType === 'up') item.up++
      if (voteType === 'down') item.down++
      item.userVotes[userIdentifier] = voteType
    }

    saveLocalVotes(allVotes)
    invalidateCache('reviews_')

    return {
      thumbs_up: item.up,
      thumbs_down: item.down,
      user_vote: item.userVotes[userIdentifier] || null,
    }
  }
}

export default new ReviewService()
