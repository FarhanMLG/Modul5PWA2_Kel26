import { useState } from 'react'
import { ArrowLeft, Save, Camera, Check, Shield } from 'lucide-react'
import userService from '../services/userService'

/**
 * EditProfilePage — Dedicated page for editing operator credentials & station bio.
 * (Challenge #5)
 */
export default function EditProfilePage({ onBack, onSaved }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Ukuran avatar harus di bawah 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setAvatar(base64)
      setFeedback('Avatar berhasil dipilih.')
      setTimeout(() => setFeedback(''), 2500)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)

    const updated = {
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    }

    const result = userService.saveUserProfile(updated)
    setSaving(false)

    if (result.success) {
      setFeedback('Profil operator berhasil diperbarui.')
      setTimeout(() => {
        if (onSaved) onSaved(result.data)
        else if (onBack) onBack()
      }, 700)
    } else {
      setFeedback('Gagal menyimpan profil.')
    }
  }

  return (
    <div className="page edit-profile-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Kembali ke Profil
        </button>
      </div>

      <section className="masthead">
        <h1 className="display">Edit Operator Credentials</h1>
        <p className="lede">
          Perbarui callsign, bio operasional armory, dan avatar operator Anda.
        </p>
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={16} /> {feedback}
        </div>
      )}

      <form onSubmit={handleSave} className="profile-form card-style">
        {/* Avatar Upload Area */}
        <div className="edit-avatar-section">
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt={username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={42} stroke="var(--brass)" />
              </div>
            )}
            <label htmlFor="avatar-edit-input" className="avatar-upload-btn" title="Ubah foto avatar">
              <Camera size={16} />
              <input
                id="avatar-edit-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>
          <span className="avatar-hint">Format JPG, PNG, atau WebP (Maks 2MB)</span>
        </div>

        <div className="form-group">
          <label htmlFor="prof-username" className="form-label">
            Callsign / Operator Alias
          </label>
          <input
            id="prof-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Contoh: Operator Alpha, Armorer Ngawi"
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-bio" className="form-label">
            Station Bio / Catatan Operator
          </label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Spesialisasi kaliber, lisensi unit, catatan unit dinas..."
            rows={4}
            className="form-textarea"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan Perubahan Profil'}
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
