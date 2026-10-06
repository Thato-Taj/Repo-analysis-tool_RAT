import { useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import UploadDialog from './components/UploadDialog'
import DashboardPage from './pages/Dashboard'
import AuthorsPage from './pages/Authors'
import {
  mockAuthors,
  mockCommits,
  mockRepositories,
  mockTree,
} from './data/mockData'
import type { FilterState, MergedAuthor, Repository } from './types'
import './App.css'

const DEFAULT_FILTERS: FilterState = {
  repoId: mockRepositories[0]?.id ?? null,
  authorId: null,
  nodePath: null,
  commitMode: 'all',
  rangeStart: null,
  rangeEnd: null,
  selectedCommits: [],
}

export default function App() {
  const [repos, setRepos] = useState<Repository[]>(mockRepositories)
  const [authors, setAuthors] = useState<MergedAuthor[]>(mockAuthors)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [uploadOpen, setUploadOpen] = useState(false)

  const activeRepo = useMemo(
    () => repos.find((r) => r.id === filters.repoId) ?? null,
    [repos, filters.repoId],
  )

  const patchFilters = (patch: Partial<FilterState>) =>
    setFilters((f) => ({ ...f, ...patch }))

  const clearFilters = () =>
    setFilters((f) => ({
      ...DEFAULT_FILTERS,
      repoId: f.repoId,
    }))

  const selectRepo = (id: string) => setFilters({ ...DEFAULT_FILTERS, repoId: id })

  // Repo intake: prepend a new repository so the UI reflects the addition.
  const handleUpload = (payload: {
    mode: 'zip' | 'url'
    name: string
    file?: File
    url?: string
    includeGitHistory: boolean
  }) => {
    const repo: Repository = {
      id: `repo-${Date.now()}`,
      name: payload.name,
      source: payload.mode,
      origin: payload.mode === 'url' ? (payload.url ?? '') : (payload.file?.name ?? ''),
      commitCount: 0,
      authorCount: 0,
      addedAt: new Date().toISOString(),
    }
    setRepos((prev) => [repo, ...prev])
    setFilters({ ...DEFAULT_FILTERS, repoId: repo.id })
    setUploadOpen(false)
  }

  // Manual author merge: fold dropId's identities into keepId.
  const handleMerge = (keepId: string, dropId: string) => {
    setAuthors((prev) => {
      const keep = prev.find((a) => a.id === keepId)
      const drop = prev.find((a) => a.id === dropId)
      if (!keep || !drop) return prev
      return prev
        .filter((a) => a.id !== dropId)
        .map((a) =>
          a.id === keepId
            ? { ...a, sources: [...a.sources, ...drop.sources], fromMailmap: false }
            : a,
        )
    })
  }

  // Split a merged author back into its raw identities (one per resulting author).
  const handleUnmerge = (authorId: string) => {
    setAuthors((prev) => {
      const target = prev.find((a) => a.id === authorId)
      if (!target || target.sources.length <= 1) return prev
      const rest = prev.filter((a) => a.id !== authorId)
      const split = target.sources.map((s, i) => ({
        id: `${target.id}-${i}`,
        displayName: s.name,
        fromMailmap: false,
        sources: [s],
      }))
      return [...rest, ...split]
    })
  }

  // Placeholder: real parsing of a .mailmap happens on the backend.
  const handleImportMailmap = (content: string) => {
    const lines = content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'))
    if (lines.length > 0 && authors.length > 1) {
      handleMerge(authors[0].id, authors[authors.length - 1].id)
    }
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar
          repos={repos}
          activeRepoId={filters.repoId}
          onSelectRepo={selectRepo}
          onOpenUpload={() => setUploadOpen(true)}
        />

        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                repo={activeRepo}
                repos={repos}
                authors={authors}
                commits={mockCommits}
                tree={mockTree}
                filters={filters}
                onFilterChange={patchFilters}
                onFilterClear={clearFilters}
                onOpenUpload={() => setUploadOpen(true)}
                onRefresh={() => undefined}
              />
            }
          />
          <Route
            path="/authors"
            element={
              <AuthorsPage
                repo={activeRepo}
                authors={authors}
                onMerge={handleMerge}
                onUnmerge={handleUnmerge}
                onImportMailmap={handleImportMailmap}
              />
            }
          />
        </Routes>
      </div>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
      />
    </BrowserRouter>
  )
}
