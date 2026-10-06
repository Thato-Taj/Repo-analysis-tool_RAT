import { Link2, Plus, RefreshCw } from 'lucide-react'
import type { Repository } from '../types'

interface HeaderProps {
  repo: Repository | null
  onOpenUpload: () => void
  onRefresh: () => void
}

export default function Header({ repo, onOpenUpload, onRefresh }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">
          {repo ? repo.name : 'Repository Overview'}
        </h1>
        <span className="header__origin">
          <Link2 size={13} />
          {repo ? repo.origin : 'Select a repository from the sidebar'}
        </span>
      </div>

      <div className="header__actions">
        <button className="btn" onClick={onRefresh} disabled={!repo}>
          <RefreshCw size={15} /> Recompute
        </button>
        <button className="btn btn--primary" onClick={onOpenUpload}>
          <Plus size={15} /> Add Repository
        </button>
      </div>
    </header>
  )
}
