import { useState } from 'react'
import {
  ArrowLeft,
  Star,
  Send,
  Loader,
  Share2,
  Check,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Edit2,
  Trash2,
  X,
  Archive,
  RotateCcw,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import LazyImage from '../common/LazyImage'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import { getUserIdentifier, getUserProfile } from '../../services/userService'
import {
  formatPrice,
  averageRating,
  generateShareUrl,
  getWhatsAppUrl,
} from '../../utils/helpers'

/**
 * Full-screen product detail view with Multi-image gallery, Share link,
 * WhatsApp seller contact, and Review CRUD with Thumbs Up / Down.
 */
export default function GunDetail({
  gun,
  onBack,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
}) {
  const userProfile = getUserProfile()
  const userId = getUserIdentifier()

  // Images gallery (Challenge #9)
  const images =
    Array.isArray(gun.images) && gun.images.length > 0
      ? gun.images
      : [gun.image_url || gun.image || '/guns/pistol.svg']

  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const currentImgSrc = images[activeImageIdx] || images[0]

  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Share link state (Challenge #2)
  const [copied, setCopied] = useState(false)

  // Reviews hook with CRUD & votes (Challenge #7)
  const {
    reviews,
    loading: reviewsLoading,
    refetch: refetchReviews,
    voteReview,
    updateReview,
    deleteReview,
  } = useReviews(gun.id)

  const { createReview, loading: submitting } = useCreateReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Review editing state
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleShare = async () => {
    const shareUrl = generateShareUrl(gun.id || gun.name)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bore & Barrel — ${gun.name}`,
          text: `Check out ${gun.name} on Bore & Barrel`,
          url: shareUrl,
        })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      alert(`Link: ${shareUrl}`)
    }
  }

  const handleWhatsApp = () => {
    const waUrl = getWhatsAppUrl(gun)
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_id: userId,
      user_identifier: userProfile.username || 'Operator',
      username: userProfile.username || 'Operator',
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted successfully!')
      setComment('')
      setRating(5)
      refetchReviews()
      setTimeout(() => setReviewSuccess(''), 3000)
    } else {
      setReviewError('Could not submit review. Please try again.')
    }
  }

  const handleStartEditReview = (rev) => {
    setEditingReviewId(rev.id)
    setEditRating(rev.rating)
    setEditComment(rev.comment || '')
  }

  const handleSaveEditReview = async (reviewId) => {
    const success = await updateReview(reviewId, {
      rating: editRating,
      comment: editComment.trim(),
    })
    if (success) {
      setEditingReviewId(null)
      refetchReviews()
    } else {
      alert('Failed to update review.')
    }
  }

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return
    const success = await deleteReview(reviewId)
    if (success) {
      refetchReviews()
    } else {
      alert('Failed to delete review.')
    }
  }

  return (
    <div className="detail">
      {/* Top back navigation & quick share */}
      <div className="detail-top-bar">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>

        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleShare}
          title="Share link to this weapon"
        >
          {copied ? <Check size={15} color="#10b981" /> : <Share2 size={15} />}
          <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="detail-hero">
        {/* Multi-Image Gallery (Challenge #9) */}
        <div className="detail-gallery">
          <div className="detail-main-img-wrap">
            <LazyImage
              className="detail-img"
              src={currentImgSrc}
              alt={gun.name}
            />
          </div>

          {images.length > 1 && (
            <div className="gallery-strip" role="tablist" aria-label="Product thumbnails">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`gallery-thumb ${idx === activeImageIdx ? 'gallery-thumb--active' : ''}`}
                  onClick={() => setActiveImageIdx(idx)}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div className="detail-info">
          <div className="detail-header-row">
            <h1 className="display">{gun.name}</h1>
            {gun.is_archived && (
              <span className="badge-archived-tag">
                <Archive size={12} /> Archived
              </span>
            )}
          </div>

          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>

          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          {/* Action Row */}
          <div className="detail-actions">
            <FavoriteButton gunId={gun.id || gun.name} />

            {/* Hubungi Penjual WhatsApp Button (Challenge #8) */}
            <button
              type="button"
              className="btn btn--wa"
              onClick={handleWhatsApp}
              title="Hubungi penjual melalui WhatsApp"
            >
              <MessageCircle size={17} />
              <span>Hubungi Penjual</span>
            </button>

            {onEdit && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => onEdit(gun)}
              >
                Edit
              </button>
            )}

            {/* Soft Delete / Archive (Challenge #6) */}
            {!gun.is_archived && onArchive && (
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => onArchive(gun)}
                title="Archive item"
              >
                <Archive size={16} /> Arsipkan
              </button>
            )}

            {/* Restore from Archive (Challenge #6) */}
            {gun.is_archived && onRestore && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onRestore(gun)}
                title="Restore to active catalog"
              >
                <RotateCcw size={16} /> Pulihkan
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => onDelete(gun)}
              >
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available for this piece.'}</p>
      </section>

      {/* Specifications */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications &amp; Components</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Maintenance / Assembly Steps */}
      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly &amp; Maintenance Protocol</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section with CRUD & Thumbs Up/Down (Challenge #7) */}
      <section className="detail-section">
        <h2>Operator Reviews &amp; Field Reports</h2>

        {/* Create Review Form */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <h3>Post Field Review</h3>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write field feedback, accuracy notes, or service experience…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
        </form>

        {/* Existing Reviews List */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading operator reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const isEditing = editingReviewId === rev.id
              const isAuthor =
                String(rev.user_id) === String(userId) ||
                rev.user_identifier === userProfile.username

              return (
                <li key={rev.id} className="review-item">
                  {isEditing ? (
                    /* Inline Review Edit Form */
                    <div className="review-edit-box">
                      <h4>Edit Your Review</h4>
                      <div className="review-stars">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            className="star-btn"
                            onClick={() => setEditRating(n)}
                          >
                            <Star
                              size={18}
                              fill={n <= editRating ? 'var(--brass)' : 'none'}
                              stroke={n <= editRating ? 'var(--brass)' : 'var(--steel)'}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="review-input"
                        rows="2"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        placeholder="Updated comment..."
                      />
                      <div className="review-edit-actions">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => handleSaveEditReview(rev.id)}
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setEditingReviewId(null)}
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal Review Display */
                    <>
                      <div className="review-head">
                        <div className="review-user-block">
                          <span className="review-user">{rev.user_identifier || 'Operator'}</span>
                          <span className="review-date">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="review-head-right">
                          <span className="review-stars-display">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={i < rev.rating ? 'var(--brass)' : 'none'}
                                stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                              />
                            ))}
                          </span>

                          {/* Author Actions (Edit & Delete) */}
                          {isAuthor && (
                            <div className="review-author-actions">
                              <button
                                type="button"
                                className="icon-btn-subtle"
                                onClick={() => handleStartEditReview(rev)}
                                title="Edit review"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn-subtle icon-btn-subtle--danger"
                                onClick={() => handleDeleteReview(rev.id)}
                                title="Delete review"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {rev.comment && <p className="review-comment">{rev.comment}</p>}

                      {/* Thumbs Up / Thumbs Down Voting (Challenge #7) */}
                      <div className="review-vote-row">
                        <button
                          type="button"
                          className={`vote-btn ${rev.user_vote === 'up' ? 'vote-btn--active' : ''}`}
                          onClick={() => voteReview(rev.id, 'up')}
                          title="Thumbs Up"
                        >
                          <ThumbsUp size={13} />
                          <span>{rev.thumbs_up || 0}</span>
                        </button>

                        <button
                          type="button"
                          className={`vote-btn ${rev.user_vote === 'down' ? 'vote-btn--active' : ''}`}
                          onClick={() => voteReview(rev.id, 'down')}
                          title="Thumbs Down"
                        >
                          <ThumbsDown size={13} />
                          <span>{rev.thumbs_down || 0}</span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">No field reviews recorded yet. Be the first operator to report!</p>
        )}
      </section>
    </div>
  )
}
