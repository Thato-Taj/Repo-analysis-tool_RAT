import { useMemo } from 'react'
import { CalendarRange, FolderTree, ListChecks, MousePointerClick, X } from 'lucide-react'
import type { AuthorView, CommitMode, FilterState, Repository, TreeNode } from '../types'

interface FilterBarProps {
  filters: FilterState
  repos: Repository[]
  authors: AuthorView[]
  tree: TreeNode[]
  commits: { shortHash: string; message: string }[]
  onChange: (patch: Partial<FilterState>) => void
  onClear: () => void
}

/** Flatten the tree into indented options for the <select>. */
function flatten(
  nodes: TreeNode[],
  depth = 0,
  out: { path: string; label: string; type: 'file' | 'directory' }[] = [],
) {
  for (const n of nodes) {
    out.push({ path: n.path, label: `${'  '.repeat(depth)}${n.name}`, type: n.type })
    if (n.children) flatten(n.children, depth + 1, out)
  }
  return out
}

const COMMIT_MODES: { value: CommitMode; label: string; icon: typeof CalendarRange }[] = [
  { value: 'all', label: 'All', icon: ListChecks },
  { value: 'range', label: 'Time period', icon: CalendarRange },
  { value: 'manual', label: 'Pick commits', icon: MousePointerClick },
]

export default function FilterBar({
  filters,
  repos,
  authors,
  tree,
  commits,
  onChange,
  onClear,
}: FilterBarProps) {
  const paths = useMemo(() => flatten(tree), [tree])

  const hasActiveFilters =
    filters.authorId !== null ||
    filters.nodePath !== null ||
    filters.commitMode !== 'all' ||
    filters.selectedCommits.length > 0

  return (
    <section className="filterbar">
      {/* Repo */}
      <div className="field">
        <span className="field__label">Repository</span>
        <select
          className="field__select"
          value={filters.repoId ?? ''}
          onChange={(e) => onChange({ repoId: e.target.value || null })}
        >
          <option value="">All repositories</option>
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Author */}
      <div className="field">
        <span className="field__label">Author</span>
        <select
          className="field__select"
          value={filters.authorId ?? ''}
          onChange={(e) => onChange({ authorId: e.target.value || null })}
        >
          <option value="">All authors (merged)</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.displayName}
              {a.sources.length > 1 ? ` · ${a.sources.length} identities` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* File or directory */}
      <div className="field">
        <span className="field__label">
          <FolderTree size={12} /> File / Directory
        </span>
        <select
          className="field__select"
          value={filters.nodePath ?? ''}
          onChange={(e) => onChange({ nodePath: e.target.value || null })}
        >
          <option value="">Whole repository</option>
          {paths.map((p) => (
            <option key={p.path} value={p.path}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Commits */}
      <div className="field">
        <span className="field__label">Commits</span>
        <div className="segmented">
          {COMMIT_MODES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`segmented__btn${filters.commitMode === value ? ' is-active' : ''}`}
              onClick={() => onChange({ commitMode: value })}
              title={label}
            >
              <Icon size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific controls */}
      {filters.commitMode === 'range' && (
        <div className="field">
          <span className="field__label">Window</span>
          <div className="field__row">
            <input
              type="date"
              className="field__control"
              value={filters.rangeStart ?? ''}
              onChange={(e) => onChange({ rangeStart: e.target.value })}
            />
            <span style={{ color: 'var(--text-faint)' }}>→</span>
            <input
              type="date"
              className="field__control"
              value={filters.rangeEnd ?? ''}
              onChange={(e) => onChange({ rangeEnd: e.target.value })}
            />
          </div>
        </div>
      )}

      {filters.commitMode === 'manual' && (
        <div className="field">
          <span className="field__label">Selected commits</span>
          <select
            className="field__select"
            value=""
            onChange={(e) => {
              const h = e.target.value
              if (h && !filters.selectedCommits.includes(h)) {
                onChange({
                  selectedCommits: [...filters.selectedCommits, h],
                })
              }
            }}
          >
            <option value="">Add a commit…</option>
            {commits
              .filter((c) => !filters.selectedCommits.includes(c.shortHash))
              .map((c) => (
                <option key={c.shortHash} value={c.shortHash}>
                  {c.shortHash} — {c.message}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Chips + clear */}
      {hasActiveFilters && (
        <div className="field" style={{ marginLeft: 'auto' }}>
          <span className="field__label">Active</span>
          <div className="field__row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {filters.authorId && (
              <Chip
                text={
                  authors.find((a) => a.id === filters.authorId)?.displayName ??
                  'author'
                }
                onRemove={() => onChange({ authorId: null })}
              />
            )}
            {filters.nodePath && (
              <Chip text={filters.nodePath} onRemove={() => onChange({ nodePath: null })} />
            )}
            {filters.commitMode === 'range' && (filters.rangeStart || filters.rangeEnd) && (
              <Chip
                text={`${filters.rangeStart ?? '…'} → ${filters.rangeEnd ?? '…'}`}
                onRemove={() => onChange({ rangeStart: null, rangeEnd: null })}
              />
            )}
            {filters.selectedCommits.map((h) => (
              <Chip
                key={h}
                text={h}
                onRemove={() =>
                  onChange({
                    selectedCommits: filters.selectedCommits.filter((x) => x !== h),
                  })
                }
              />
            ))}
            <button className="btn btn--ghost btn--sm" onClick={onClear}>
              Clear all
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="chip">
      {text}
      <button className="chip__x" onClick={onRemove} aria-label={`Remove ${text}`}>
        <X size={11} />
      </button>
    </span>
  )
}
