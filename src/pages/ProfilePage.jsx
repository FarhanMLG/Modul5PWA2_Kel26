import { useState, useEffect } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Play,
  Edit3,
  Trash2,
  ExternalLink,
  MapPin,
  Clock,
  Phone,
  Info,
  Archive,
  MessageCircle,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import { getAllDrafts, deleteDraft } from '../utils/draftStorage'
import { getArchivedIds } from '../utils/archiveStorage'

/**
 * ProfilePage — Operator profile hub with:
 * - Edit profile button (navigates to EditProfilePage)
 * - Saved drafts management section (Challenge #5)
 * - Integrated About armory section (Challenge #5)
 * - Integrated Contact armory section (Challenge #5)
 */
export default function ProfilePage({
  onNavigateEditProfile,
  onNavigateDraft,
  onReplaySplash,
}) {
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [drafts, setDrafts] = useState(() => getAllDrafts())
  const { favorites } = useFavorites()
  const [archivedCount, setArchivedCount] = useState(() => getArchivedIds().length)

  // Reload profile and drafts on mount or tab focus
  useEffect(() => {
    setProfile(userService.getUserProfile())
    setDrafts(getAllDrafts())
    setArchivedCount(getArchivedIds().length)
  }, [])

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Hapus draft ini dari penyimpanan lokal?')) {
      deleteDraft(draftId)
      setDrafts(getAllDrafts())
    }
  }

  return (
    <div className="profile-page">
      {/* Top Masthead */}
      <section className="masthead profile-masthead">
        <div>
          <h1 className="display">Operator Profile &amp; Armory Station</h1>
          <p className="lede">
            Kredensial operator, pusat draf offline, serta informasi operasional Bore &amp; Barrel.
          </p>
        </div>

        <div className="profile-header-actions">
          {onNavigateEditProfile && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onNavigateEditProfile}
              title="Buka halaman edit profil"
            >
              <Edit3 size={15} /> Edit Profil
            </button>
          )}

          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Putar ulang animasi intro Bore & Barrel"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {/* Operator Card Overview */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
          </div>

          <div className="profile-identity">
            <div className="profile-name-row">
              <h2 className="display">{profile.username || 'Shooter'}</h2>
              {onNavigateEditProfile && (
                <button
                  type="button"
                  className="link-edit-btn"
                  onClick={onNavigateEditProfile}
                  title="Edit profil operator"
                >
                  <Edit3 size={13} /> Ubah
                </button>
              )}
            </div>

            <p className="profile-bio-text">
              {profile.bio || 'Belum ada catatan stasiun armory. Klik Edit Profil untuk menambahkan.'}
            </p>

            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Salin ID Operator"
                aria-label="Salin ID Operator"
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites ? favorites.length : 0}</div>
            <div className="stat-label">Favorit Disimpan</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Draf Offline Tersedia</div>
          </div>
          <div className="stat-item">
            <Archive size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{archivedCount}</div>
            <div className="stat-label">Hardware Diarsipkan</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: Draft Management (Challenge #5)
         ========================================================================= */}
      <section className="profile-section-block">
        <div className="section-head-row">
          <div className="section-head-left">
            <FileText size={20} stroke="var(--brass)" />
            <h2>Draf Katalog Tersimpan</h2>
          </div>
          <span className="count-pill">{drafts.length} draf</span>
        </div>

        {drafts.length > 0 ? (
          <div className="draft-list-grid">
            {drafts.map((draft) => (
              <div key={draft.id} className="draft-card">
                <div className="draft-card-info">
                  <div className="draft-card-badge">
                    {draft.type === 'create' ? 'Draf Baru' : 'Draf Edit Unit'}
                  </div>
                  <h3 className="draft-title">{draft.name}</h3>
                  <span className="draft-time">Disimpan: {draft.formattedTime}</span>
                </div>

                <div className="draft-card-actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => onNavigateDraft && onNavigateDraft(draft)}
                  >
                    <ExternalLink size={14} /> Lanjutkan Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm btn--danger-outline"
                    onClick={() => handleDeleteDraft(draft.id)}
                    title="Hapus draf ini"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-subbox">
            <p>Tidak ada draf katalog yang sedang tersimpan.</p>
            <span className="subtext">
              Saat Anda membuat atau mengedit hardware dan menekan tombol &quot;Save Draft&quot;, formulir akan otomatis tersimpan di sini.
            </span>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 2: About Armory (Challenge #5: Moved to Profile)
         ========================================================================= */}
      <section className="profile-section-block">
        <div className="section-head-row">
          <div className="section-head-left">
            <Info size={20} stroke="var(--brass)" />
            <h2>Tentang Bore &amp; Barrel</h2>
          </div>
        </div>

        <div className="about-content-card">
          <h3 className="display">A one-room armory — Gunshop Asli Ngawi.</h3>
          <p className="lede">
            Bore &amp; Barrel menjual pilihan firearms yang solid, presisi, dan teruji di lapangan.
            Setiap unit dinilai langsung dari bench armorer — tanpa markup berlebihan, tanpa filler.
          </p>

          <div className="about-features-grid">
            <div className="about-feature-item">
              <strong>Progressive Web App (PWA)</strong>
              <p>Mendukung instalasi di perangkat mobile &amp; desktop serta bekerja offline dengan service worker.</p>
            </div>
            <div className="about-feature-item">
              <strong>Spec-Sheet Driven</strong>
              <p>Setiap hardware dilengkapi kaliber terverifikasi, spesifikasi detail, dan protokol perawatan perakitan.</p>
            </div>
            <div className="about-feature-item">
              <strong>Local Stash &amp; Cloud Sync</strong>
              <p>Dilengkapi sistem query caching, auto-draft form, dan penyimpanan favorit lokal maupun server.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: Contact Armory (Challenge #5: Moved to Profile)
         ========================================================================= */}
      <section className="profile-section-block">
        <div className="section-head-row">
          <div className="section-head-left">
            <MapPin size={20} stroke="var(--brass)" />
            <h2>Kontak &amp; Lokasi Toko</h2>
          </div>
        </div>

        <div className="contact-content-grid">
          <div className="contact-item">
            <MapPin size={22} className="contact-icon" />
            <div>
              <strong>Alamat Armory</strong>
              <p>123 Range Road, Ngawi Tactical District</p>
            </div>
          </div>

          <div className="contact-item">
            <Clock size={22} className="contact-icon" />
            <div>
              <strong>Jam Operasional</strong>
              <p>Selasa – Sabtu: 10.00 – 18.00 WIB (Minggu &amp; Senin tutup)</p>
            </div>
          </div>

          <div className="contact-item">
            <Phone size={22} className="contact-icon" />
            <div>
              <strong>Hotline Toko</strong>
              <p>(0351) 890-7771 / +62 812-3456-7890</p>
            </div>
          </div>

          <div className="contact-item contact-item--wa">
            <MessageCircle size={22} className="contact-icon" />
            <div>
              <strong>WhatsApp Armorer</strong>
              <p>Layanan konsultasi unit &amp; pemesanan cepat via WhatsApp.</p>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Bore%20%26%20Barrel%2C%20saya%20ingin%20berkonsultasi%20mengenai%20unit%20armory."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--wa btn--sm"
                style={{ marginTop: '8px', display: 'inline-flex' }}
              >
                Chat WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
