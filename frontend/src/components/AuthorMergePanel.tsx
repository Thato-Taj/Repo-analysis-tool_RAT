import { useState } from 'react'
import { GitMerge, Mail, Split, Upload, Users } from 'lucide-react'
import type { AuthorView } from '../types'

interface AuthorMergePanelProps {
  authors: AuthorView[]
  onMerge: (keepId: string, dropId: string) => void
  onUnmerge: (authorId: string) => void
  onImportMailmap: (content: string) => void | Promise<void>
}

export default function AuthorMergePanel({
  authors,
  onMerge,
  onUnmerge,
  onImportMailmap,
}: AuthorMergePanelProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [target, setTarget] = useState<string>('')
  const [importing, setImporting] = useState(false)

  const startMerge = (keepId: string) => {
    setPending(keepId)
    const firstOther = authors.find((a) => a.id !== keepId)
    setTarget(firstOther?.id ?? '')
  }

  const confirmMerge = () => {
    if (pending && target && pending !== target) {
      onMerge(pending, target)
    }
    setPending(null)
    setTarget('')
  }

  const handleMailmap = async (file: File) => {
    setImporting(true)
    try {
      await onImportMailmap(await file.text())
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <div className="panel">
        <div className="panel__head">
          <h3>
            <Mail size={16} /> Mailmap
          </h3>
          <label className="btn btn--sm">
            <Upload size={14} /> {importing ? 'Importing…' : 'Import .mailmap'}
            <input
              type="file"
              accept=".mailmap,.map,text/plain"
              style={{ display: 'none' }}
              disabled={importing}
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) await handleMailmap(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <div className="callout">
          <Mail size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            A <span className="mono">.mailmap</span> folds several git identities
            (name + email) belonging to one person into a single author. Import the
            file shipped with the repo, or merge the leftovers manually below.
          </span>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3>
            <Users size={16} /> Authors ({authors.length})
          </h3>
        </div>

        {authors.length === 0 ? (
          <div className="empty empty--sm">
            <Users size={26} />
            <p>No authors indexed yet.</p>
          </div>
        ) : (
          <div className="author-list">
            {authors.map((a, i) => (
              <div className="author-row" key={a.id}>
                <div className="author-row__id">
                  <div className={`avatar avatar--a${i % 4}`}>{initials(a.displayName)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="author-row__name">
                      {a.displayName}
                      {a.fromMailmap && (
                        <span className="badge badge--mailmap">
                          <Mail size={10} /> mailmap
                        </span>
                      )}
                      {a.fromManualMerge && (
                        <span className="badge badge--merge">
                          <GitMerge size={10} /> merged
                        </span>
                      )}
                      <span className="badge badge--count">{a.commitCount} commits</span>
                    </div>
                    <div className="identity-list">
                      {a.sources.map((s) => (
                        <span className="identity" key={`${s.name}<${s.email}>`}>
                          <b>{s.name}</b>
                          <span>{s.email}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {a.fromManualMerge ? (
                    <button
                      className="btn btn--sm"
                      onClick={() => onUnmerge(a.id)}
                      title="Split back into raw identities"
                    >
                      <Split size={13} /> Split
                    </button>
                  ) : (
                    <button
                      className="btn btn--sm"
                      onClick={() => startMerge(a.id)}
                      title="Merge this author into another"
                      disabled={authors.length < 2}
                    >
                      <GitMerge size={13} /> Merge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pending && (
        <div className="overlay" onClick={() => setPending(null)}>
          <div
            className="modal"
            style={{ width: 'min(420px, 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2>Merge authors</h2>
            </div>
            <div className="modal__body">
              <p style={{ marginBottom: 'var(--sp-4)', color: 'var(--text-muted)' }}>
                Combine{' '}
                <b style={{ color: 'var(--text)' }}>
                  {authors.find((a) => a.id === pending)?.displayName}
                </b>{' '}
                with another author. All commits from both identities will be
                attributed to the surviving author.
              </p>
              <div className="form-row">
                <label>Merge into</label>
                <select
                  className="field__select"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {authors
                    .filter((a) => a.id !== pending)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal__foot">
              <button className="btn" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className="btn btn--primary" onClick={confirmMerge}>
                <GitMerge size={15} /> Confirm merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
