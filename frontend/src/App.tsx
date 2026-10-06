import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import UploadDialog from './components/UploadDialog'
import DashboardPage from './pages/Dashboard'
import AuthorsPage from './pages/Authors'
import { api } from './lib/api'
import type {
  AuthorMerge,
  AuthorView,
  FilterState,
  Repository,
  TreeNode,
  CommitView,
} from './types'
import './App.css'

const DEFAULT_FILTERS: FilterState = {
  repoId: null,
  authorId: null,
  nodePath: null,
  commitMode: 'all',
  rangeStart: null,
  rangeEnd: null,
  selectedCommits: [],
}

interface RepoBundle {
  authors: AuthorView[]
  tree: TreeNode[]
  commits: CommitView[]
}

export default function App() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [bundle, setBundle] = useState<RepoBundle>({ authors: [], tree: [], commits: [] })
  const [reposLoading, setReposLoading] = useState(true)
  const [bundleLoading, setBundleLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const activeRepo = useMemo(
    () => repos.find((r) => r.id === filters.repoId) ?? null,
    [repos, filters.repoId],
  )

  const loadRepos = useCallback(async (selectId?: string) => {
    setReposLoading(true)
    try {
      const list = await api.listRepos()
      setRepos(list)
      setFilters((f) => {
        const target = selectId ?? f.repoId ?? list[0]?.id ?? null
        return f.repoId === target ? f : { ...DEFAULT_FILTERS, repoId: target }
      })
    } catch (err) {
      setBanner(`Could not load repositories: ${(err as Error).message}`)
    } finally {
      setReposLoading(false)
    }
  }, [])

  // Bootstrap: load repos once the backend is reachable.
  useEffect(() => {
    void loadRepos()
  }, [loadRepos])

  // Load per-repo authors / tree / commits whenever the active repo changes.
  useEffect(() => {
    if (!filters.repoId) {
      setBundle({ authors: [], tree: [], commits: [] })
      return
    }
    let cancelled = false
    setBundleLoading(true)
    Promise.all([
      api.getAuthors(filters.repoId),
      api.getTree(filters.repoId),
      api.getCommits(filters.repoId),
    ])
      .then(([authors, tree, commits]) => {
        if (!cancelled) setBundle({ authors, tree, commits })
      })
      .catch((err: Error) => {
        if (!cancelled) setBanner(err.message)
      })
      .finally(() => {
        if (!cancelled) setBundleLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters.repoId])

  const patchFilters = (patch: Partial<FilterState>) =>
    setFilters((f) => ({ ...f, ...patch }))

  const clearFilters = () => setFilters((f) => ({ ...DEFAULT_FILTERS, repoId: f.repoId }))

  const selectRepo = (id: string) => setFilters({ ...DEFAULT_FILTERS, repoId: id })

  const refreshBundle = useCallback(async (repoId: string) => {
    const [authors, tree, commits] = await Promise.all([
      api.getAuthors(repoId),
      api.getTree(repoId),
      api.getCommits(repoId),
    ])
    setBundle({ authors, tree, commits })
  }, [])

  // Derive persisted manual merges from the merged-author view.
  const currentMerges = useCallback(
    (): AuthorMerge[] =>
      bundle.authors
        .filter((a) => a.fromManualMerge)
        .map((a) => ({
          canonicalEmail: a.id,
          displayName: a.displayName,
          sources: a.sources,
        })),
    [bundle.authors],
  )

  const commitMerges = useCallback(
    async (merges: AuthorMerge[]) => {
      if (!filters.repoId) return
      try {
        const authors = await api.setMerges(filters.repoId, merges)
        setBundle((b) => ({ ...b, authors }))
        // Drop author filters that no longer resolve.
        setFilters((f) =>
          f.authorId && !authors.some((a) => a.id === f.authorId)
            ? { ...f, authorId: null }
            : f,
        )
      } catch (err) {
        setBanner((err as Error).message)
      }
    },
    [filters.repoId],
  )

  const handleMerge = useCallback(
    async (keepId: string, dropId: string) => {
      const keep = bundle.authors.find((a) => a.id === keepId)
      const drop = bundle.authors.find((a) => a.id === dropId)
      if (!keep || !drop) return
      const merges = currentMerges().filter((m) => m.canonicalEmail !== dropId)
      const sourceEmails = new Set([
        ...keep.sources.map((s) => s.email),
        ...drop.sources.map((s) => s.email),
      ])
      const sources = [...keep.sources, ...drop.sources].filter(
        (s, idx, arr) => arr.findIndex((x) => x.email === s.email && x.name === s.name) === idx,
      )
      merges.push({
        canonicalEmail: keep.email || keepId,
        displayName: keep.displayName,
        sources: sourceEmails.size ? sources : keep.sources,
      })
      await commitMerges(merges)
    },
    [bundle.authors, currentMerges, commitMerges],
  )

  const handleUnmerge = useCallback(
    async (authorId: string) => {
      const merges = currentMerges().filter((m) => m.canonicalEmail !== authorId)
      await commitMerges(merges)
    },
    [currentMerges, commitMerges],
  )

  const handleImportMailmap = useCallback(
    async (content: string) => {
      if (!filters.repoId) return
      try {
        const authors = await api.importMailmap(filters.repoId, content)
        setBundle((b) => ({ ...b, authors }))
        await loadRepos()
      } catch (err) {
        setBanner((err as Error).message)
      }
    },
    [filters.repoId, loadRepos],
  )

  const handleUpload = useCallback(
    async (payload: { mode: 'zip' | 'url'; name: string; file?: File; url?: string }) => {
      setUploading(true)
      try {
        const repo =
          payload.mode === 'url'
            ? await api.addByUrl(payload.name, payload.url ?? '')
            : await api.addByZip(payload.name, payload.file as File)
        await loadRepos(repo.id)
        await refreshBundle(repo.id)
        setUploadOpen(false)
      } catch (err) {
        setBanner((err as Error).message)
      } finally {
        setUploading(false)
      }
    },
    [loadRepos, refreshBundle],
  )

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await api.removeRepo(id)
        await loadRepos()
      } catch (err) {
        setBanner((err as Error).message)
      }
    },
    [loadRepos],
  )

  const handleRecompute = useCallback(async () => {
    if (!filters.repoId) return
    try {
      await api.reindexRepo(filters.repoId)
      await loadRepos(filters.repoId)
      await refreshBundle(filters.repoId)
    } catch (err) {
      setBanner((err as Error).message)
    }
  }, [filters.repoId, loadRepos, refreshBundle])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar
          repos={repos}
          activeRepoId={filters.repoId}
          loading={reposLoading}
          onSelectRepo={selectRepo}
          onOpenUpload={() => setUploadOpen(true)}
          onRemoveRepo={handleRemove}
        />

        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                repo={activeRepo}
                repos={repos}
                authors={bundle.authors}
                commits={bundle.commits}
                tree={bundle.tree}
                filters={filters}
                bundleLoading={bundleLoading}
                onFilterChange={patchFilters}
                onFilterClear={clearFilters}
                onOpenUpload={() => setUploadOpen(true)}
                onRefresh={handleRecompute}
              />
            }
          />
          <Route
            path="/authors"
            element={
              <AuthorsPage
                repo={activeRepo}
                authors={bundle.authors}
                loading={bundleLoading}
                onMerge={handleMerge}
                onUnmerge={handleUnmerge}
                onImportMailmap={handleImportMailmap}
              />
            }
          />
        </Routes>
      </div>

      {banner && (
        <div className="banner" role="alert">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        busy={uploading}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
      />
    </BrowserRouter>
  )
}
