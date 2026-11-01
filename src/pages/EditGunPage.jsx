import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader,
  Save,
  CheckCircle,
  AlertCircle,
  Images,
  Star,
} from 'lucide-react'
import gunService from '../services/gunService'
import uploadService from '../services/uploadService'
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import ConfirmModal from '../components/modals/ConfirmModal'

/**
 * EditGunPage — Edit an existing hardware record with Multi-Image support (Challenge #9),
 * draft persistence, specs, and assembly steps.
 */
export default function EditGunPage({ gun, gunId, onBack, onSuccess, initialDraftData }) {
  const targetId = gunId || gun?.id

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan',
    difficulty: 'mudah',
    price: 599,
    description: '',
    servings: 1,
    is_featured: false,
  })

  // Multi-image list (Challenge #9)
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)

  // Specs & Steps
  const [specs, setSpecs] = useState([{ name: '', quantity: '' }])
  const [steps, setSteps] = useState([''])

  // Draft modal
  const [showDraftModal, setShowDraftModal] = useState(() => (!initialDraftData && targetId ? hasDraft(targetId) : false))
  const [draftTimestamp, setDraftTimestamp] = useState(() => (targetId ? getDraftTimestamp(targetId) : null))

  // Fetch initial data
  useEffect(() => {
    const fetchGun = async () => {
      try {
        setLoading(true)
        setError('')

        // If navigated directly from profile draft with initialDraftData
        if (initialDraftData) {
          if (initialDraftData.formData) setFormData(initialDraftData.formData)
          if (initialDraftData.specs) setSpecs(initialDraftData.specs)
          if (initialDraftData.steps) setSteps(initialDraftData.steps)
          if (initialDraftData.images) setImages(initialDraftData.images)
          setLoading(false)
          return
        }

        let data = gun
        if (!data || !data.ingredients || !data.steps) {
          if (targetId && !String(targetId).startsWith('local-')) {
            const res = await gunService.getGunById(targetId)
            if (res.success && res.data) {
              data = res.data
            }
          }
        }

        if (data) {
          setFormData({
            name: data.name || '',
            type: data.type || (data.category === 'makanan' ? 'Pistol' : 'Rifle'),
            caliber: data.caliber || '9mm',
            category: data.category || 'makanan',
            difficulty: data.difficulty || 'mudah',
            price: data.price ?? data.cook_time ?? 599,
            description: data.description || '',
            servings: data.servings || 1,
            is_featured: Boolean(data.is_featured),
          })

          const resolvedImages =
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : [data.image_url || data.image || '/guns/pistol.svg']
          setImages(resolvedImages)

          if (data.ingredients && data.ingredients.length > 0) {
            setSpecs(
              data.ingredients.map((ing) => ({
                name: ing.name || '',
                quantity: ing.quantity || '',
              })),
            )
          } else {
            setSpecs([
              { name: 'Platform', quantity: data.type || 'Pistol' },
              { name: 'Caliber', quantity: data.caliber || '9mm' },
            ])
          }

          if (data.steps && data.steps.length > 0) {
            setSteps(data.steps.map((st) => (typeof st === 'string' ? st : st.instruction || '')))
          } else {
            setSteps(['Standard manufacturer maintenance and cleaning protocol.'])
          }
        } else {
          setError('Hardware record could not be loaded.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load hardware record.')
      } finally {
        setLoading(false)
      }
    }

    if (targetId || initialDraftData) {
      fetchGun()
    }
  }, [targetId, gun, initialDraftData])

  // Draft operations
  const handleLoadDraft = () => {
    const draft = loadDraft(targetId)
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (draft.images && draft.images.length > 0) {
        setImages(draft.images)
      }
      setShowDraftModal(false)
      setSuccessMsg('Saved draft restored.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft(targetId)
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  const handleManualSaveDraft = () => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
    }
    const saved = saveDraft(draftData, targetId)
    if (saved) {
      const ts = getDraftTimestamp(targetId)
      setDraftTimestamp(ts)
      setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  // Handle multi-image upload (Challenge #9)
  const handleMultipleFiles = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setUploading(true)
    setError('')

    const newUrls = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} melebihi batas 5MB.`)
        continue
      }
      try {
        const res = await uploadService.uploadImage(file)
        const url = res.data?.url || res.url
        if (url) newUrls.push(url)
      } catch {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
        newUrls.push(dataUrl)
      }
    }

    setImages((prev) => [...prev, ...newUrls])
    setUploading(false)
  }

  const handleAddPreset = (url) => {
    setImages((prev) => (prev.includes(url) ? prev : [...prev, url]))
  }

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSetPrimaryImage = (index) => {
    if (index === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [selected] = copy.splice(index, 1)
      copy.unshift(selected)
      return copy
    })
  }

  // Specs & Steps
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Product name must be at least 3 characters.')
      return
    }

    const cleanSpecs = specs
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        quantity: s.quantity.trim() || 'Standard',
      }))

    if (cleanSpecs.length === 0) {
      setError('Please provide at least one specification.')
      return
    }

    const cleanSteps = steps.filter((s) => s.trim()).map((s) => s.trim())
    if (cleanSteps.length === 0) {
      setError('Please provide at least one assembly step.')
      return
    }

    const finalImages = images.length > 0 ? images : ['/guns/pistol.svg']

    const payload = {
      name: formData.name.trim(),
      type: formData.type || 'Pistol',
      caliber: formData.caliber || '9mm',
      category: formData.category || 'makanan',
      description: formData.description.trim(),
      image_url: finalImages[0],
      images: finalImages, // Multi-image support (Challenge #9)
      cook_time: Number(formData.price) || 500,
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setUpdating(true)
      const res = await gunService.updateGun(targetId, payload)
      if (res.success || res.data) {
        deleteDraft(targetId)
        if (onSuccess) {
          onSuccess(res.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(res.message || 'Failed to update product.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while updating product.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="state-box">
        <Loader size={32} className="spin" />
        <p>Loading record from armory…</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>
        <div className="form-head-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={handleManualSaveDraft}
            title="Save draft"
          >
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      <div className="form-title-group">
        <h1 className="display">Edit Hardware Record</h1>
        <p className="lede">
          Modifikasi spesifikasi, kaliber, harga, dan foto unit {formData.name || 'Hardware'}.
        </p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Multi-Image Management (Challenge #9) */}
      <div className="card-box" style={{ marginBottom: '24px' }}>
        <h2 className="card-box-title">
          <Images size={18} /> Unit Imagery &amp; Photos ({images.length})
        </h2>
        <p className="card-box-desc">
          Kelola galeri foto senjata ini. Foto pertama adalah foto sampul utama di katalog.
        </p>

        {images.length > 0 && (
          <div className="multi-thumb-grid" style={{ marginBottom: '16px' }}>
            {images.map((imgUrl, idx) => (
              <div key={idx} className={`multi-thumb-card ${idx === 0 ? 'multi-thumb-card--primary' : ''}`}>
                <img src={imgUrl} alt={`Foto ${idx + 1}`} className="multi-thumb-img" />
                {idx === 0 && (
                  <span className="primary-pill">
                    <Star size={11} fill="currentColor" /> Sampul Utama
                  </span>
                )}
                <div className="thumb-card-actions">
                  {idx !== 0 && (
                    <button
                      type="button"
                      className="btn-tiny"
                      onClick={() => handleSetPrimaryImage(idx)}
                      title="Jadikan sampul utama"
                    >
                      Utama
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-tiny btn-tiny--danger"
                    onClick={() => handleRemoveImage(idx)}
                    title="Hapus foto"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="upload-dropzone upload-dropzone--compact">
          <input
            id="edit-multi-image-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleMultipleFiles}
            className="hidden-file-input"
          />
          <label htmlFor="edit-multi-image-input" className="upload-label">
            <Upload size={24} className="upload-icon" />
            <span className="upload-main-text">
              {uploading ? 'Mengunggah gambar…' : '+ Tambah Foto Unit Lagi'}
            </span>
          </label>
          <div className="preset-selector">
            <span className="preset-title">Tambah preset vektor:</span>
            <div className="preset-pills">
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/pistol.svg')}>+ Pistol</button>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/rifle.svg')}>+ Rifle</button>
              <button type="button" className="pill" onClick={() => handleAddPreset('/guns/shotgun.svg')}>+ Shotgun</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Edit Form */}
      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">
              Model Designation <span className="req">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-type" className="form-label">
              Platform / Category <span className="req">*</span>
            </label>
            <select
              id="edit-type"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value,
                  category: e.target.value === 'Pistol' ? 'makanan' : 'minuman',
                })
              }
              className="form-select"
            >
              <option value="Pistol">Pistol (Sidearm)</option>
              <option value="Rifle">Rifle (Long Gun)</option>
              <option value="Shotgun">Shotgun (Smoothbore)</option>
              <option value="Submachine Gun">Submachine Gun</option>
            </select>
          </div>
        </div>

        <div className="form-grid form-grid--3">
          <div className="form-group">
            <label htmlFor="edit-caliber" className="form-label">
              Caliber / Chambering <span className="req">*</span>
            </label>
            <input
              id="edit-caliber"
              type="text"
              value={formData.caliber}
              onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-price" className="form-label">
              Price (USD) <span className="req">*</span>
            </label>
            <input
              id="edit-price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-diff" className="form-label">
              Grade Quality
            </label>
            <select
              id="edit-diff"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="form-select"
            >
              <option value="mudah">Standard / Service Grade</option>
              <option value="sedang">Tactical / Enhanced</option>
              <option value="sulit">Match / Precision Grade</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-desc" className="form-label">
            Description
          </label>
          <textarea
            id="edit-desc"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="form-textarea"
          />
        </div>

        {/* Specifications */}
        <div className="form-section-box">
          <div className="form-section-head">
            <h3>Technical Specifications ({specs.length})</h3>
            <button type="button" className="btn btn--outline btn--sm" onClick={addSpec}>
              <Plus size={14} /> Add Spec
            </button>
          </div>

          <div className="specs-list">
            {specs.map((spec, i) => (
              <div key={i} className="spec-row">
                <input
                  type="text"
                  value={spec.name}
                  onChange={(e) => handleSpecChange(i, 'name', e.target.value)}
                  placeholder="Component"
                  className="form-input"
                />
                <input
                  type="text"
                  value={spec.quantity}
                  onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                  placeholder="Value / Spec"
                  className="form-input"
                />
                {specs.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn-danger"
                    onClick={() => removeSpec(i)}
                    title="Remove specification"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assembly Steps */}
        <div className="form-section-box">
          <div className="form-section-head">
            <h3>Assembly &amp; Maintenance Protocol ({steps.length})</h3>
            <button type="button" className="btn btn--outline btn--sm" onClick={addStep}>
              <Plus size={14} /> Add Step
            </button>
          </div>

          <div className="steps-list">
            {steps.map((step, i) => (
              <div key={i} className="step-row">
                <span className="step-num">{i + 1}</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => handleStepChange(i, e.target.value)}
                  placeholder="Describe step..."
                  className="form-input"
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn-danger"
                    onClick={() => removeStep(i)}
                    title="Remove step"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="form-bottom-actions">
          <button type="submit" className="btn btn--primary" disabled={updating}>
            {updating ? (
              <>
                <Loader size={18} className="spin" /> Updating Record…
              </>
            ) : (
              'Save Hardware Changes'
            )}
          </button>
          <button type="button" className="btn btn--outline" onClick={handleManualSaveDraft}>
            Save Offline Draft
          </button>
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
        </div>
      </form>

      {/* Draft modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Resume Saved Draft?"
        message={`Ditemukan draft tersimpan untuk unit ini (${formatDraftTime(draftTimestamp)}). Pulihkan perubahan yang belum disimpan?`}
        confirmLabel="Pulihkan Draft"
        cancelLabel="Abaikan"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
