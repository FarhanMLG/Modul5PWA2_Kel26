import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with full CRUD + vote actions.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const userIdentifier = getUserIdentifier()

  const fetchReviews = useCallback(async () => {
    if (!gunId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      const response = await reviewService.getReviews(gunId, userIdentifier)

      if (response.success) {
        setReviews(response.data || [])
      } else {
        setError(response.message || 'Failed to fetch reviews.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching reviews.')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [gunId, userIdentifier])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const voteReview = (reviewId, voteType) => {
    const res = reviewService.voteReview(reviewId, voteType, userIdentifier)
    if (res) {
      setReviews((prev) =>
        prev.map((r) =>
          String(r.id) === String(reviewId)
            ? { ...r, thumbs_up: res.thumbs_up, thumbs_down: res.thumbs_down, user_vote: res.user_vote }
            : r,
        ),
      )
    }
  }

  const updateReview = async (reviewId, updateData) => {
    try {
      const res = await reviewService.updateReview(gunId, reviewId, updateData)
      if (res.success) {
        await fetchReviews()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const deleteReview = async (reviewId) => {
    try {
      const res = await reviewService.deleteReview(gunId, reviewId)
      if (res.success) {
        setReviews((prev) => prev.filter((r) => String(r.id) !== String(reviewId)))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return {
    reviews,
    loading,
    error,
    refetch: fetchReviews,
    voteReview,
    updateReview,
    deleteReview,
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review for a product.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        setSuccess(true)
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}
