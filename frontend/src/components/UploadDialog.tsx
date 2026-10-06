import { useState } from 'react'
import { CloudUpload, FileArchive, Info, Link2, X, LoaderCircle } from 'lucide-react'
import type { RepoSource } from '../types'

interface UploadDialogProps {
  open: boolean
  busy?: boolean
  onClose: () => void
  onSubmit: (payload: {
    mode: RepoSource
    name: string
    file?: File
    url?: string
  }) => void
}

export default function UploadDialog({ open, busy, onClose, onSubmit }: UploadDialogProps) {
  const [mode, setMode] = useState<RepoSource>('zip')
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [drag, setDrag] = useState(false)

  if (!open) return null

  const canSubmit =
    !busy &&
    name.trim().length > 0 &&
    (mode === 'zip' ? !!file : /^https?:\/\/.+/.test(url.trim()))

  const reset = () => {
    setMode('zip')
    setName('')
    setFile(null)
    setUrl('')
    setDrag(false)
  }

  const handleClose = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = () => {
    if (!canSubmit) return
    onSubmit({
      mode,
      name: name.trim(),
      file: file ?? undefined,
      url: mode === 'url' ? url.trim() : undefined,
    })
  }

  return (
    <div className="overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Add Repository</h2>
          <button className="btn btn--ghost btn--sm" onClick={handleClose} disabled={busy}>
            <X size={16} />
          </button>
        </div>

        <div className="modal__body">
          <div className="segmented" style={{ marginBottom: 'var(--sp-5)' }}>
            <button
              className={`segmented__btn${mode === 'zip' ? ' is-active' : ''}`}
              onClick={() => setMode('zip')}
            >
              <FileArchive size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Upload ZIP
            </button>
            <button
              className={`segmented__btn${mode === 'url' ? ' is-active' : ''}`}
              onClick={() => setMode('url')}
            >
              <Link2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Clone URL
            </button>
          </div>

          <div className="form-row">
            <label htmlFor="repo-name">Display name</label>
            <input
              id="repo-name"
              type="text"
              placeholder="e.g. atlas-core"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {mode === 'zip' ? (
            <div className="form-row">
              <label>Repository archive</label>
              <div
                className={`dropzone${drag ? ' is-drag' : ''}`}
                role="button"
                tabIndex={0}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDrag(true)
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDrag(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) setFile(f)
                }}
                onClick={() => openFilePicker()}
                onKeyDown={(e) => e.key === 'Enter' && openFilePicker()}
              >
                <CloudUpload size={28} className="dropzone__icon" />
                <strong style={{ fontSize: '0.9rem' }}>
                  Drop the repo ZIP here or click to browse
                </strong>
                <span className="hint-text">
                  Must include the <span className="mono">.git</span> directory so
                  commit history is preserved
                </span>
                <input
                  id="zip-input"
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <span className="dropzone__file">
                    <FileArchive size={12} style={{ verticalAlign: -2, marginRight: 5 }} />
                    {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="form-row">
              <label htmlFor="clone-url">Remote repository URL</label>
              <input
                id="clone-url"
                type="url"
                placeholder="https://github.com/org/repo.git"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <span className="hint-text">
                RAT performs a deep clone (full history) so every commit can be
                attributed.
              </span>
            </div>
          )}

          <div className="callout">
            <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              After import, any <span className="mono">.mailmap</span> is applied
              automatically. Remaining duplicate identities can be merged manually
              under <b>Author Merging</b>.
            </span>
          </div>
        </div>

        <div className="modal__foot">
          <button className="btn" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!canSubmit} onClick={submit}>
            {busy ? (
              <>
                <LoaderCircle size={15} className="spin" /> Analysing…
              </>
            ) : (
              <>
                <CloudUpload size={15} /> Import Repository
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Trigger the hidden file input for the ZIP dropzone. */
function openFilePicker() {
  const el = document.getElementById('zip-input') as HTMLInputElement | null
  el?.click()
}
