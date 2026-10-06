import { useLocation, useNavigate } from 'react-router-dom'
import {
  GitBranch,
  LayoutDashboard,
  Plus,
  Users,
  Database,
  FileArchive,
  Trash,
} from 'lucide-react'
import type { Repository } from '../types'
import '../App.css'

interface SidebarProps {
  repos: Repository[]
  activeRepoId: string | null
  loading: boolean
  onSelectRepo: (id: string) => void
  onOpenUpload: () => void
  onRemoveRepo: (id: string) => void
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/authors', label: 'Author Merging', icon: Users },
  { to: 'upload', label: 'Add Repository', icon: Plus },
] as const

export default function Sidebar({
  repos,
  activeRepoId,
  loading,
  onSelectRepo,
  onOpenUpload,
  onRemoveRepo,
}: SidebarProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <GitBranch size={20} />
        </div>
        <div>
          <div className="sidebar__title">RAT</div>
          <div className="sidebar__subtitle">Repo Analysis</div>
        </div>
      </div>

      <nav className="nav">
        {NAV.map(({ to, label, icon: Icon }) => {
          const isUpload = to === 'upload'
          const active = !isUpload && (to === '/' ? pathname === '/' : pathname === to)
          return (
            <button
              key={to}
              className={`nav__item${active ? ' is-active' : ''}`}
              onClick={() => (isUpload ? onOpenUpload() : navigate(to))}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="sidebar__section-label">
        <span>Repositories</span>
        <button className="btn btn--ghost btn--sm" onClick={onOpenUpload}>
          <Plus size={13} /> Add
        </button>
      </div>

      <div className="repo-list">
        {loading && repos.length === 0 && (
          <p className="sidebar__placeholder">Loading repositories…</p>
        )}
        {!loading && repos.length === 0 && (
          <p className="sidebar__placeholder">
            No repositories yet. Add one via ZIP or clone URL.
          </p>
        )}
        {repos.map((repo) => (
          <div
            key={repo.id}
            className={`repo-card${repo.id === activeRepoId ? ' is-active' : ''}`}
            onClick={() => {
              onSelectRepo(repo.id)
              navigate('/')
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectRepo(repo.id)}
          >
            <div className="repo-card__top">
              <span className={`badge badge--${repo.source}`}>
                {repo.source === 'zip' ? (
                  <FileArchive size={11} />
                ) : (
                  <Database size={11} />
                )}
                {repo.source.toUpperCase()}
              </span>
              <span className="repo-card__name">{repo.name}</span>
              <button
                className="repo-card__remove"
                title="Remove repository"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveRepo(repo.id)
                }}
              >
                <Trash size={13} />
              </button>
            </div>
            <div className="repo-card__meta">
              <span>
                <GitBranch size={12} /> {repo.commitCount.toLocaleString()} commits
              </span>
              <span>
                <Users size={12} /> {repo.authorCount} authors
              </span>
            </div>
            {repo.error && <div className="repo-card__error">Index error: {repo.error}</div>}
          </div>
        ))}
      </div>

      <div className="sidebar__footer">Deep history · rename detect 50% · mailmap aware</div>
    </aside>
  )
}
