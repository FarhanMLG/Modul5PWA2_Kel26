import { useState, useEffect, lazy, Suspense } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import { Loader } from 'lucide-react'
import './App.css'

// Lazy Load Pages & Components (Challenge #3)
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // If user opened with direct ?gun= share link, bypass splash screen
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      return !p.get('gun')
    }
    return true
  })

  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail' | 'edit-profile'
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [draftPayload, setDraftPayload] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Direct Share Link Handler on Mount & URL changes (Challenge #2)
  useEffect(() => {
    const handleUrlQuery = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const gunId = params.get('gun')
        if (!gunId) return

        // 1. Check local catalog first
        const localMatch = GUNS_LOCAL.find(
          (g, idx) => g.id === gunId || `local-${idx}` === gunId || g.name === gunId,
        )
        if (localMatch) {
          setSelectedGun(localMatch)
          setMode('detail')
          setShowSplash(false)
          return
        }

        // 2. Fetch from backend API
        const res = await gunService.getGunById(gunId)
        if (res && (res.data || res.name)) {
          setSelectedGun(res.data || res)
          setMode('detail')
          setShowSplash(false)
        }
      } catch (err) {
        console.warn('[App] Direct link weapon not found:', err)
      }
    }

    handleUrlQuery()

    const onPopState = () => handleUrlQuery()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setDraftPayload(null)
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setDraftPayload(null)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'EditProfile') {
      setMode('edit-profile')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Draft') {
      // Resume draft from Profile page (Challenge #5)
      setDraftPayload(payload?.data || null)
      if (payload?.type === 'edit') {
        setEditingGun({ id: payload.id })
        setMode('edit')
      } else {
        setMode('create')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      // Update browser URL query for shareability (Challenge #2)
      if (window.history.pushState && payload?.id) {
        const url = new URL(window.location)
        url.searchParams.set('gun', payload.id)
        window.history.pushState({}, '', url)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change (Catalog / Favorites / Profile)
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      setDraftPayload(null)

      // Clean query parameter when navigating tabs
      if (window.history.pushState) {
        const url = new URL(window.location)
        url.searchParams.delete('gun')
        window.history.pushState({}, '', url.pathname)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
    setDraftPayload(null)

    // Remove ?gun= parameter when returning to list
    if (window.history.pushState) {
      const url = new URL(window.location)
      url.searchParams.delete('gun')
      window.history.pushState({}, '', url.pathname)
    }
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        {/* Suspense boundary for lazy-loaded pages (Challenge #3) */}
        <Suspense
          fallback={
            <div className="page-suspense-box">
              <Loader size={36} className="spin" stroke="var(--brass)" />
              <p>Loading operational components…</p>
            </div>
          }
        >
          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage
              initialDraftData={draftPayload}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              initialDraftData={draftPayload}
              onBack={handleBackToList}
              onSuccess={() => {
                handleBackToList()
                setTab('Catalog')
              }}
            />
          )}

          {mode === 'edit-profile' && (
            <EditProfilePage
              onBack={() => {
                setMode('list')
                setTab('Profile')
              }}
              onSaved={() => {
                setMode('list')
                setTab('Profile')
              }}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setDeleteTarget(g)}
              onArchive={async (g) => {
                await gunService.archiveGun(g.id)
                handleBackToList()
              }}
              onRestore={async (g) => {
                await gunService.restoreGun(g.id)
                handleBackToList()
              }}
            />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && (
            <>
              {tab === 'Catalog' && (
                <Catalog
                  onNavigate={(destination, payload) => handleNavigate(destination, payload)}
                />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => setTab('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage
                  onNavigateEditProfile={() => handleNavigate('EditProfile')}
                  onNavigateDraft={(draft) => handleNavigate('Draft', draft)}
                  onReplaySplash={() => setShowSplash(true)}
                />
              )}
            </>
          )}
        </Suspense>
      </main>

      {/* Global Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Hardware Record"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            setDeleting(true)
            await gunService.deleteGun(deleteTarget.id)
            setDeleteTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            alert(err.message || 'Failed to delete record.')
          } finally {
            setDeleting(false)
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
