import { useState, useEffect, useCallback } from 'react'
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
 * CreateGunPage — Create a new weapon with Multi-Image support (Challenge #9),
 * draft auto-save, specs, and assembly steps.
 */
export default function CreateGunPage({ onBack, onSuccess, initialDraftData }) {
  const [currentStep, setCurrentStep] = useState('upload')

  const [formData, setFormData] = useState({
    name: '',
    type: 'Pistol',
    caliber: '9mm',
    category: 'makanan', // API validation expects 'makanan' or 'minuman'
    difficulty: 'mudah',  // 'mudah' (Standard) | 'sedang' (Service) | 'sulit' (Match)
    price: 599,
    description: '',
    servings: 1,
    is_featured: false,
  })

  // Multi-image list (Challenge #9)
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)

  // Specifications
  const [specs, setSpecs] = useState([
    { name: 'Frame', quantity: 'Polymer' },
    { name: 'Action', quantity: 'Striker-Fired' },
    { name: 'Capacity', quantity: '17 rounds' },
  ])

  // Maintenance / Assembly Steps
  const [steps, setSteps] = useState([
    'Verify firearm is completely unloaded and point in safe direction.',
    'Disassemble slide assembly from receiver frame for routine maintenance.',
  ])

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Draft management
  const [showDraftModal, setShowDraftModal] = useState(() => !initialDraftData && hasDraft('create'))
  const [draftTimestamp, setDraftTimestamp] = useState(() => getDraftTimestamp('create'))

  // Load initial draft if navigated directly from profile drafts section
  useEffect(() => {
    if (initialDraftData) {
      if (initialDraftData.formData) setFormData(initialDraftData.formData)
      if (initialDraftData.specs) setSpecs(initialDraftData.specs)
      if (initialDraftData.steps) setSteps(initialDraftData.steps)
      if (initialDraftData.images && initialDraftData.images.length > 0) {
        setImages(initialDraftData.images)
        setCurrentStep('form')
      } else if (initialDraftData.uploadedImageUrl) {
        setImages([initialDraftData.uploadedImageUrl])
        setCurrentStep('form')
      }
    }
  }, [initialDraftData])

  const handleSaveDraft = useCallback((notify = true) => {
    const draftData = {
      formData,
      specs,
      steps,
      images,
      uploadedImageUrl: images[0] || '',
    }
    const saved = saveDraft(draftData, 'create')
    if (saved) {
      const ts = getDraftTimestamp('create')
      setDraftTimestamp(ts)
      if (notify) {
        setSuccessMsg(`Draft saved (${formatDraftTime(ts)})`)
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    }
  }, [formData, specs, steps, images])

  // Auto-save draft every 30 seconds while in form step
  useEffect(() => {
    if (currentStep !== 'form') return

    const interval = setInterval(() => {
      handleSaveDraft(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [handleSaveDraft, currentStep])

  const handleLoadDraft = () => {
    const draft = loadDraft('create')
    if (draft) {
      if (draft.formData) setFormData(draft.formData)
      if (draft.specs) setSpecs(draft.specs)
      if (draft.steps) setSteps(draft.steps)
      if (draft.images && draft.images.length > 0) {
        setImages(draft.images)
        setCurrentStep('form')
      } else if (draft.uploadedImageUrl) {
        setImages([draft.uploadedImageUrl])
        setCurrentStep('form')
      }
      setShowDraftModal(false)
      setSuccessMsg('Draft successfully loaded.')
      setTimeout(() => setSuccessMsg(''), 4000)
    }
  }

  const handleDiscardDraft = () => {
    deleteDraft('create')
    setShowDraftModal(false)
    setDraftTimestamp(null)
  }

  // Handle multi-image file selection (Challenge #9)
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
        // Fallback to Base64
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
    setError('')
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

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Specs handlers
  const handleSpecChange = (index, field, value) => {
    setSpecs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const addSpec = () => {
    setSpecs((prev) => [...prev, { name: '', quantity: '' }])
  }

  const removeSpec = (index) => {
    if (specs.length <= 1) return
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  // Steps handlers
  const handleStepChange = (index, value) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const addStep = () => {
    setSteps((prev) => [...prev, ''])
  }

  const removeStep = (index) => {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit create product
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

    const cleanSteps = steps
      .filter((s) => s.trim())
      .map((s) => s.trim())

    if (cleanSteps.length === 0) {
      setError('Please provide at least one maintenance / assembly step.')
      return
    }

    const finalImages = images.length > 0 ? images : ['/guns/pistol.svg']

    const payload = {
      name: formData.name.trim(),
      type: formData.type || 'Pistol',
      caliber: formData.caliber || '9mm',
      category: formData.category || 'makanan',
      description: formData.description.trim() || `${formData.type} caliber ${formData.caliber}.`,
      image_url: finalImages[0],
      images: finalImages, // Multi-image support (Challenge #9)
      prep_time: 15,
      cook_time: Number(formData.price) || 500,
      servings: Number(formData.servings) || 1,
      difficulty: formData.difficulty || 'mudah',
      is_featured: Boolean(formData.is_featured),
      ingredients: cleanSpecs,
      steps: cleanSteps,
    }

    try {
      setCreating(true)
      const response = await gunService.createGun(payload)
      if (response.success || response.data) {
        deleteDraft('create')
        if (onSuccess) {
          onSuccess(response.data)
        } else if (onBack) {
          onBack()
        }
      } else {
        throw new Error(response.message || 'Failed to create product.')
      }
    } catch (err) {
      setError(err.message || 'Error occurred while saving product.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="form-page">
      {/* Header */}
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Catalog
        </button>
        <div className="form-head-actions">
          {currentStep === 'form' && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => handleSaveDraft(true)}
              title="Save draft"
            >
              <Save size={14} /> Save Draft
            </button>
          )}
        </div>
      </div>

      <div className="form-title-group">
        <h1 className="display">Register New Hardware</h1>
        <p className="lede">
          Tambahkan unit senjata atau aksesoris baru. Mendukung multiple foto unit armory.
        </p>
      </div>

      {/* Notifications */}
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

      {/* Step Indicators */}
      <div className="form-steps-nav">
        <div className={`step-badge ${currentStep === 'upload' ? 'step-badge--active' : 'step-badge--done'}`}>
          1. Unit Photos ({images.length} added)
        </div>
        <div className="step-badge-connector" />
        <div className={`step-badge ${currentStep === 'form' ? 'step-badge--active' : ''}`}>
          2. Specifications &amp; Details
        </div>
      </div>

      {/* STEP 1: Multi-Image Manager (Challenge #9) */}
      {currentStep === 'upload' && (
        <div className="card-box">
          <div className="card-box-header">
            <div>
              <h2 className="card-box-title">Hardware Imagery (Multiple Photos)</h2>
              <p className="card-box-desc">
                Unggah 1 atau lebih foto / blueprint unit (JPG, PNG, WebP maks 5MB), atau gunakan preset armory.
              </p>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="upload-dropzone">
            <input
              id="gun-multi-image-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleMultipleFiles}
              className="hidden-file-input"
            />
            <label htmlFor="gun-multi-image-input" className="upload-label">
              <Upload size={34} className="upload-icon" />
              <span className="upload-main-text">
                {uploading ? 'Memproses gambar…' : 'Pilih satu atau lebih file foto'}
              </span>
              <span className="upload-sub-text">Bisa pilih multiple file sekaligus</span>
            </label>

            <div className="preset-selector">
              <span className="preset-title">Atau tambahkan preset vektor:</span>
              <div className="preset-pills">
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleAddPreset('/guns/pistol.svg')}
                >
                  + Pistol Vector
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleAddPreset('/guns/rifle.svg')}
                >
                  + Rifle Vector
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => handleAddPreset('/guns/shotgun.svg')}
                >
                  + Shotgun Vector
                </button>
              </div>
            </div>
          </div>

          {/* Uploaded Images Gallery Preview */}
          {images.length > 0 && (
            <div className="multi-preview-section">
              <h3 className="section-title">
                <Images size={16} /> Foto Terpilih ({images.length})
              </h3>
              <p className="subtext">Foto pertama adalah foto sampul utama (cover) di katalog.</p>

              <div className="multi-thumb-grid">
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
                          title="Jadikan foto sampul utama"
                        >
                          Utama
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-tiny btn-tiny--danger"
                        onClick={() => handleRemoveImage(idx)}
                        title="Hapus foto ini"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="preview-actions" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (images.length === 0) {
                  setImages(['/guns/pistol.svg'])
                }
                setCurrentStep('form')
              }}
              disabled={uploading}
            >
              Lanjutkan ke Spesifikasi &amp; Detail →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Product Form */}
      {currentStep === 'form' && (
        <form onSubmit={handleSubmit} className="entry-form">
          {/* Active Image Thumbnails Summary */}
          <div className="selected-thumb-bar">
            <div className="thumb-bar-gallery">
              {images.map((img, i) => (
                <img key={i} src={img} alt={`Thumb ${i + 1}`} className="thumb-small" />
              ))}
            </div>
            <div className="thumb-info">
              <span className="thumb-title">{images.length} Foto Siap Digunakan</span>
              <span className="thumb-sub">Foto pertama adalah cover</span>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setCurrentStep('upload')}
            >
              Kelola Foto
            </button>
          </div>

          {/* Core Info */}
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Model Designation <span className="req">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="e.g. Glock 19 Gen 5, Colt M4A1..."
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Platform / Category <span className="req">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={(e) => {
                  handleFormChange(e)
                  setFormData((prev) => ({
                    ...prev,
                    category: e.target.value === 'Pistol' ? 'makanan' : 'minuman',
                  }))
                }}
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
              <label htmlFor="caliber" className="form-label">
                Caliber / Chambering <span className="req">*</span>
              </label>
              <input
                id="caliber"
                type="text"
                name="caliber"
                value={formData.caliber}
                onChange={handleFormChange}
                placeholder="e.g. 9mm, 5.56mm, 12 Gauge"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price" className="form-label">
                Price (USD) <span className="req">*</span>
              </label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleFormChange}
                placeholder="599"
                min="0"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="difficulty" className="form-label">
                Grade / Build Quality <span className="req">*</span>
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleFormChange}
                className="form-select"
              >
                <option value="mudah">Standard / Service Grade</option>
                <option value="sedang">Tactical / Enhanced</option>
                <option value="sulit">Match / Precision Grade</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Armory Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              placeholder="Detailed operating mechanism, recoil characteristics, and operational history..."
              rows={3}
              className="form-textarea"
            />
          </div>

          {/* Specifications */}
          <div className="form-section-box">
            <div className="form-section-head">
              <h3>Technical Specifications ({specs.length})</h3>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={addSpec}
              >
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
                    placeholder="Component (e.g. Barrel Length)"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={spec.quantity}
                    onChange={(e) => handleSpecChange(i, 'quantity', e.target.value)}
                    placeholder="Value (e.g. 4.5 in / 114 mm)"
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

          {/* Maintenance Steps */}
          <div className="form-section-box">
            <div className="form-section-head">
              <h3>Assembly &amp; Maintenance Protocol ({steps.length})</h3>
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={addStep}
              >
                <Plus size={14} /> Add Protocol Step
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
                    placeholder="Describe maintenance or assembly procedure..."
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

          {/* Submit Actions */}
          <div className="form-bottom-actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader size={18} className="spin" /> Registering to Armory…
                </>
              ) : (
                'Register Hardware'
              )}
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => handleSaveDraft(true)}
            >
              Save Offline Draft
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={onBack}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Restore Draft Modal */}
      <ConfirmModal
        open={showDraftModal}
        title="Resume Saved Draft?"
        message={`Ditemukan draft tersimpan (${formatDraftTime(draftTimestamp)}). Apakah Anda ingin memulihkan isian formulir sebelumnya?`}
        confirmLabel="Pulihkan Draft"
        cancelLabel="Mulai Baru"
        onConfirm={handleLoadDraft}
        onCancel={handleDiscardDraft}
      />
    </div>
  )
}
