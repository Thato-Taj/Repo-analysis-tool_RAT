import { LoaderCircle, Users } from 'lucide-react'
import AuthorMergePanel from '../components/AuthorMergePanel'
import type { AuthorView, Repository } from '../types'

interface AuthorsPageProps {
  repo: Repository | null
  authors: AuthorView[]
  loading: boolean
  onMerge: (keepId: string, dropId: string) => void
  onUnmerge: (authorId: string) => void
  onImportMailmap: (content: string) => void | Promise<void>
}

export default function AuthorsPage({
  repo,
  authors,
  loading,
  onMerge,
  onUnmerge,
  onImportMailmap,
}: AuthorsPageProps) {
  return (
    <div className="main">
      <header className="header">
        <div className="header__left">
          <h1 className="header__title">Author Merging</h1>
          <span className="header__origin">
            <Users size={13} />
            {repo
              ? `${repo.name} · ${authors.length} merged identities`
              : 'No repository selected'}
          </span>
        </div>
      </header>

      <div className="content">
        {!repo ? (
          <div className="empty">
            <Users size={34} />
            <h3>No repository selected</h3>
            <p>Pick a repository to review and merge its authors.</p>
          </div>
        ) : loading ? (
          <div className="empty">
            <LoaderCircle size={28} className="spin" />
            <h3>Loading authors…</h3>
          </div>
        ) : (
          <AuthorMergePanel
            authors={authors}
            onMerge={onMerge}
            onUnmerge={onUnmerge}
            onImportMailmap={onImportMailmap}
          />
        )}
      </div>
    </div>
  )
}
