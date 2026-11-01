import { useState } from 'react'
import { Share2, Check, MessageCircle, Archive, RotateCcw, Trash2, Images } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import LazyImage from '../common/LazyImage'
import { formatPrice, truncate, generateShareUrl, getWhatsAppUrl } from '../../utils/helpers'

/**
 * Product card used in the catalog grid.
 *
 * @param {Object}   props
 * @param {Object}   props.gun
 * @param {Function} props.onSelect
 * @param {Function} [props.onEdit]
 * @param {Function} [props.onDelete]
 * @param {Function} [props.onArchive]
 * @param {Function} [props.onRestore]
 * @param {boolean}  [props.isArchivedView=false]
 */
export default function GunCard({
  gun,
  onSelect,
  onEdit,
  onDelete,
  onArchive,
  onRestore,
  isArchivedView = false,
}) {
  const [copied, setCopied] = useState(false)
  const imgSrc = (gun.images && gun.images[0]) || gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0
  const imageCount = gun.images?.length || 1

  const handleShare = async (e) => {
    e.stopPropagation()
    const shareUrl = generateShareUrl(gun.id || gun.name)

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bore & Barrel — ${gun.name}`,
          text: `Check out ${gun.name} (${category}, ${caliber}) on Bore & Barrel`,
          url: shareUrl,
        })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      alert(`Link: ${shareUrl}`)
    }
  }

  const handleWhatsApp = (e) => {
    e.stopPropagation()
    const waUrl = getWhatsAppUrl(gun)
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <li className={`card ${isArchivedView ? 'card--archived' : ''}`}>
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <div className="card-img-wrap" style={{ position: 'relative' }}>
          <LazyImage
            className="card-img"
            src={imgSrc}
            alt={gun.name}
            width={240}
            height={180}
          />
          {imageCount > 1 && (
            <span
              className="badge-multi-photo"
              title={`${imageCount} photos available`}
            >
              <Images size={12} /> {imageCount}
            </span>
          )}
          {isArchivedView && (
            <span className="badge-archived-tag">
              <Archive size={11} /> Diarsipkan
            </span>
          )}
        </div>

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <div className="card-foot-row">
          <span className="price">{formatPrice(price)}</span>

          {/* Quick WhatsApp contact action */}
          <button
            type="button"
            className="btn-wa-compact"
            onClick={handleWhatsApp}
            title="Hubungi penjual via WhatsApp"
            aria-label={`Chat WhatsApp for ${gun.name}`}
          >
            <MessageCircle size={14} />
            <span>WA</span>
          </button>
        </div>
      </button>

      {/* Floating actions row */}
      <div className="card-actions">
        {/* Share Button (Challenge #2) */}
        <button
          type="button"
          className={`card-act-btn ${copied ? 'card-act-btn--success' : ''}`}
          onClick={handleShare}
          title={copied ? 'Tautan disalin ke clipboard!' : 'Bagikan tautan unit'}
          aria-label="Share hardware link"
        >
          {copied ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
        </button>

        {!isArchivedView && <FavoriteButton gunId={gun.id || gun.name} />}

        {!isArchivedView && onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(gun)
            }}
            aria-label={`Edit ${gun.name}`}
            title="Edit hardware"
          >
            ✏️
          </button>
        )}

        {/* Soft Delete / Archive Action (Challenge #6) */}
        {!isArchivedView && onArchive && (
          <button
            type="button"
            className="card-act-btn card-act-btn--archive"
            onClick={(e) => {
              e.stopPropagation()
              onArchive(gun)
            }}
            aria-label={`Arsipkan ${gun.name}`}
            title="Arsipkan / Soft Delete"
          >
            <Archive size={14} />
          </button>
        )}

        {/* Restore Action in Archive View (Challenge #6) */}
        {isArchivedView && onRestore && (
          <button
            type="button"
            className="card-act-btn card-act-btn--restore"
            onClick={(e) => {
              e.stopPropagation()
              onRestore(gun)
            }}
            aria-label={`Pulihkan ${gun.name}`}
            title="Pulihkan ke Katalog"
          >
            <RotateCcw size={14} />
          </button>
        )}

        {/* Permanent Delete Action (Challenge #6) */}
        {onDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(gun)
            }}
            aria-label={`Hapus permanen ${gun.name}`}
            title={isArchivedView ? 'Hapus Permanen' : 'Hapus'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {copied && <div className="card-toast">Link tersalin!</div>}
    </li>
  )
}
