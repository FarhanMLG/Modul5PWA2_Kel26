import { useState, useMemo, useEffect } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import { isItemArchived } from '../utils/archiveStorage'
import { mergeAllGuns } from '../utils/localGunStorage'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

/**
 * Catalog page with Pagination, Soft Delete / Archive tabs,
 * and Share / WhatsApp integration.
 */
export default function Catalog({ onNavigate }) {
  // ---- API data ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 100 })
  const [useLocal, setUseLocal] = useState(false)

  // View mode: 'active' | 'archived' (Challenge #6)
  const [viewMode, setViewMode] = useState('active')
  const [actionNotice, setActionNotice] = useState('')

  const showNotice = (msg) => {
    setActionNotice(msg)
    setTimeout(() => setActionNotice(''), 3000)
  }

  // Decide data source with archive status resolution and local persistence
  const rawGuns = useMemo(() => {
    let source = apiGuns
    if (useLocal || (error && apiGuns.length === 0)) {
      source = GUNS_LOCAL.map((g, i) => {
        const id = g.id || `local-${i}`
        return {
          ...g,
          id,
          images: [g.image || '/guns/pistol.svg'],
          is_archived: isItemArchived(id),
        }
      })
    }
    const merged = mergeAllGuns(source)
    return merged.map((g) => ({
      ...g,
      is_archived: Boolean(g.is_archived || isItemArchived(g.id)),
    }))
  }, [apiGuns, error, useLocal])

  // Split into active and archived counts
  const activeCount = useMemo(() => rawGuns.filter((g) => !g.is_archived).length, [rawGuns])
  const archivedCount = useMemo(() => rawGuns.filter((g) => g.is_archived).length, [rawGuns])

  // Filter guns based on active vs archive view
  const currentScopedGuns = useMemo(() => {
    if (viewMode === 'archived') {
      return rawGuns.filter((g) => g.is_archived)
    }
    return rawGuns.filter((g) => !g.is_archived)
  }, [rawGuns, viewMode])

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // ---- Pagination state (Challenge #1) ----
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6 // 6 items per page

  // Reset to page 1 whenever filters or view mode change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, activeCategory, sortKey, sortOrder, viewMode])

  const categories = useMemo(() => extractCategories(currentScopedGuns), [currentScopedGuns])

  const filteredGuns = useMemo(() => {
    let result = currentScopedGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [currentScopedGuns, search, activeCategory, sortKey, sortOrder])

  // Calculate Paginated items (Challenge #1)
  const totalItems = filteredGuns.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedGuns = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return filteredGuns.slice(startIdx, startIdx + pageSize)
  }, [filteredGuns, currentPage, pageSize])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- modal confirmation actions ----
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState('archive') // 'archive' | 'restore' | 'delete'
  const [isProcessing, setIsProcessing] = useState(false)

  // Handle Archive / Soft Delete (Challenge #6)
  const handleArchive = async (gun) => {
    try {
      setIsProcessing(true)
      await gunService.archiveGun(gun.id)
      setConfirmTarget(null)
      refetch()
      showNotice(`"${gun.name}" dipindahkan ke Arsip.`)
    } catch {
      alert('Gagal mengarsipkan unit.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Restore from Archive (Challenge #6)
  const handleRestore = async (gun) => {
    try {
      setIsProcessing(true)
      await gunService.restoreGun(gun.id)
      setConfirmTarget(null)
      refetch()
      showNotice(`"${gun.name}" berhasil dipulihkan ke stok aktif.`)
    } catch {
      alert('Gagal memulihkan unit.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Permanent Delete (Challenge #6)
  const handlePermanentDelete = async (gun) => {
    try {
      setIsProcessing(true)
      await gunService.deleteGun(gun.id)
      setConfirmTarget(null)
      refetch()
      showNotice(`"${gun.name}" berhasil dihapus secara permanen.`)
    } catch {
      alert('Gagal menghapus unit secara permanen.')
    } finally {
      setIsProcessing(false)
    }
  }

  // If viewing a single product detail
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onArchive={async (g) => {
          await handleArchive(g)
          setSelectedGun(null)
        }}
        onRestore={async (g) => {
          await handleRestore(g)
          setSelectedGun(null)
        }}
        onDelete={(g) => {
          setConfirmAction('delete')
          setConfirmTarget(g)
        }}
      />
    )
  }

  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      {actionNotice && (
        <div className="toast toast--success" role="status">
          <CheckCircle2 size={16} /> {actionNotice}
        </div>
      )}

      <section>
        {/* View Mode Switcher: Active Stock vs Archive (Challenge #6) */}
        <div className="catalog-tabs-bar">
          <button
            type="button"
            className={`catalog-tab-btn ${viewMode === 'active' ? 'catalog-tab-btn--active' : ''}`}
            onClick={() => setViewMode('active')}
          >
            <ShieldCheck size={16} />
            <span>Stok Aktif</span>
            <span className="tab-pill">{activeCount}</span>
          </button>

          <button
            type="button"
            className={`catalog-tab-btn ${viewMode === 'archived' ? 'catalog-tab-btn--active' : ''}`}
            onClick={() => setViewMode('archived')}
          >
            <Archive size={16} />
            <span>Arsip / Sampah</span>
            <span className="tab-pill tab-pill--archived">{archivedCount}</span>
          </button>
        </div>

        <div className="list-head">
          <h2>{viewMode === 'active' ? 'Current stock' : 'Archived hardware'}</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} unit{filteredGuns.length !== 1 ? 's' : ''}
              {totalPages > 1 ? ` (Hal ${currentPage}/${totalPages})` : ''}
            </span>
            {onNavigate && viewMode === 'active' && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add Hardware
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
          }}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>
              {viewMode === 'archived'
                ? 'Tidak ada unit yang diarsipkan.'
                : 'No products match your search or filter criteria.'}
            </p>
          </div>
        )}

        {/* Product Grid (Paginated items) */}
        {paginatedGuns.length > 0 && (
          <ul className="stock">
            {paginatedGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onArchive={(g) => {
                  setConfirmAction('archive')
                  setConfirmTarget(g)
                }}
                onRestore={(g) => {
                  setConfirmAction('restore')
                  setConfirmTarget(g)
                }}
                onDelete={(g) => {
                  setConfirmAction('delete')
                  setConfirmTarget(g)
                }}
                isArchivedView={viewMode === 'archived'}
              />
            ))}
          </ul>
        )}

        {/* Pagination Controls (Challenge #1) */}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Catalog pagination">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1))
                window.scrollTo({ top: 300, behavior: 'smooth' })
              }}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`pagination-num ${pageNum === currentPage ? 'pagination-num--active' : ''}`}
                  onClick={() => {
                    setCurrentPage(pageNum)
                    window.scrollTo({ top: 300, behavior: 'smooth' })
                  }}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={pageNum === currentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1))
                window.scrollTo({ top: 300, behavior: 'smooth' })
              }}
              aria-label="Next page"
            >
              Next <ChevronRight size={16} />
            </button>
          </nav>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setUseLocal(false)
                refetch()
              }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Confirmation Modal for Archive, Restore, and Delete */}
      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={
          confirmAction === 'archive'
            ? 'Arsipkan Hardware'
            : confirmAction === 'restore'
            ? 'Pulihkan Hardware'
            : 'Hapus Permanen Hardware'
        }
        message={
          confirmAction === 'archive'
            ? `Pindahkan "${confirmTarget?.name}" ke folder Arsip? Unit tidak akan tampil di katalog aktif.`
            : confirmAction === 'restore'
            ? `Kembalikan "${confirmTarget?.name}" ke stok katalog aktif?`
            : `Hapus "${confirmTarget?.name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmLabel={
          confirmAction === 'archive'
            ? 'Arsipkan'
            : confirmAction === 'restore'
            ? 'Pulihkan'
            : 'Hapus Permanen'
        }
        danger={confirmAction === 'delete'}
        loading={isProcessing}
        onConfirm={() => {
          if (!confirmTarget) return
          if (confirmAction === 'archive') handleArchive(confirmTarget)
          else if (confirmAction === 'restore') handleRestore(confirmTarget)
          else handlePermanentDelete(confirmTarget)
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </>
  )
}
