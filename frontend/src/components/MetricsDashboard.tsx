import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  Code,
  FileType,
  FolderTree,
  GitBranch,
  Layers,
  LoaderCircle,
  Table as TableIcon,
  TrendingUp,
  Users,
} from 'lucide-react'
import { api } from '../lib/api'
import { fmtDecimal, fmtInt, fmtPct, fmtSigned } from '../lib/format'
import type {
  AnalysisResult,
  AuthorView,
  CommitView,
  FilterState,
  MetricCategory,
  ObjectMetrics,
  Repository,
} from '../types'
import InfoHint from './InfoHint'
import MetricCard from './MetricCard'

interface MetricsDashboardProps {
  repo: Repository | null
  filters: FilterState
  authors: AuthorView[]
  commits: CommitView[]
  loading?: boolean
}

const TABS: { id: MetricCategory; label: string; icon: typeof Code }[] = [
  { id: 'repository', label: 'Repository', icon: Layers },
  { id: 'file', label: 'Files', icon: FileType },
  { id: 'directory', label: 'Directories', icon: FolderTree },
  { id: 'commitSet', label: 'Commit Set', icon: GitBranch },
]

const CHART_COLORS = ['#4f8cff', '#3ddc97', '#a97bff', '#f5b544', '#ff6b6b', '#38bdf8']

export default function MetricsDashboard({
  repo,
  filters,
  authors,
  commits,
  loading,
}: MetricsDashboardProps) {
  const [tab, setTab] = useState<MetricCategory>('repository')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recompute whenever the repository or any filter dimension changes.
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])
  useEffect(() => {
    if (!repo) {
      setResult(null)
      return
    }
    let cancelled = false
    setAnalyzing(true)
    setError(null)
    api
      .analyse(repo.id, filters)
      .then((r) => {
        if (!cancelled) setResult(r)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setAnalyzing(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo?.id, filterKey])

  if (!repo) {
    return (
      <div className="empty">
        <Activity size={34} />
        <h3>No repository selected</h3>
        <p>Add a repository or pick one from the sidebar to compute metrics.</p>
      </div>
    )
  }

  const scopeLabel =
    result?.scope ??
    (filters.nodePath
      ? filters.nodePath
      : filters.authorId
        ? authors.find((a) => a.id === filters.authorId)?.displayName ?? 'Author'
        : 'Whole repository')

  const setLabel =
    filters.commitMode === 'all'
      ? 'all history'
      : filters.commitMode === 'manual'
        ? `${filters.selectedCommits.length} selected commits`
        : `${filters.rangeStart ?? 'start'} → ${filters.rangeEnd ?? 'now'}`

  return (
    <div>
      <div className="content__section-head">
        <div>
          <h2>Metrics</h2>
          <p>
            Scope:{' '}
            <b style={{ color: 'var(--text)' }} className="mono">
              {scopeLabel}
            </b>{' '}
            · Commit set: <b style={{ color: 'var(--text)' }}>{setLabel}</b> ·{' '}
            <InfoHint defId="commitSet" />
            {result && (
              <>
                {' '}
                · <b style={{ color: 'var(--text)' }}>{fmtInt(result.commitSetSize)}</b> non-merge
                commits measured
              </>
            )}
          </p>
        </div>
        <div className="content__section-status">
          {analyzing || loading ? (
            <span className="status-pill">
              <LoaderCircle size={13} className="spin" /> Computing…
            </span>
          ) : (
            <span className="status-pill status-pill--ok">
              <Activity size={13} /> {result ? fmtInt(result.commitSetSize) : 0} commits
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="callout callout--error">
          <Activity size={15} />
          <span>{error}</span>
        </div>
      )}

      <div className="tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`tabs__btn${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {!result ? (
        <div className="empty">
          <LoaderCircle size={28} className="spin" />
          <h3>Computing metrics…</h3>
          <p>Aggregating commit history for the selected scope.</p>
        </div>
      ) : tab === 'repository' ? (
        <RepositoryTab result={result} authors={authors} />
      ) : tab === 'file' ? (
        <ObjectTab
          title="Per-file metrics"
          icon={<FileType size={15} />}
          rows={result.files}
          empty="No file changes in this commit set."
        />
      ) : tab === 'directory' ? (
        <ObjectTab
          title="Per-directory metrics"
          icon={<FolderTree size={15} />}
          rows={result.directories}
          empty="No directory changes in this commit set."
        />
      ) : (
        <CommitSetTab result={result} commits={commits} filters={filters} authors={authors} />
      )}
    </div>
  )
}

/* ---- repository -------------------------------------------------------- */

function RepositoryTab({ result, authors }: { result: AnalysisResult; authors: AuthorView[] }) {
  const repo = result.repository
  const authorData = result.authors
    .slice(0, 6)
    .map((a) => ({ name: a.displayName.split(' ')[0], churn: a.churn }))
  return (
    <>
      <div className="metric-grid">
        <MetricCard
          label="Commits in set"
          value={fmtInt(result.commitSetSize)}
          icon={GitBranch}
          defId="commitSet"
        />
        <MetricCard label="Lines added" value={fmtInt(repo.added)} icon={TrendingUp} trend="up" defId="added" />
        <MetricCard label="Lines removed" value={fmtInt(repo.deleted)} icon={Code} trend="down" defId="deleted" />
        <MetricCard label="Net growth" value={fmtSigned(repo.growth)} icon={Layers} defId="growth" />
        <MetricCard label="Total churn" value={fmtInt(repo.churn)} icon={Activity} defId="churn" />
        <MetricCard label="Contributors" value={authors.length} icon={Users} defId="author" />
      </div>

      <ChartActivity data={result.activity} />

      <div className="panel panel--split">
        <ChartAuthors data={authorData} />
        <ObjectTable
          title="Top directories by churn"
          icon={<FolderTree size={15} />}
          rows={result.directories.slice(0, 8)}
          compact
        />
      </div>
    </>
  )
}

/* ---- file / directory -------------------------------------------------- */

function ObjectTab({
  title,
  icon,
  rows,
  empty,
}: {
  title: string
  icon: React.ReactNode
  rows: ObjectMetrics[]
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <div className="empty">
        <TableIcon size={28} />
        <h3>Nothing to show</h3>
        <p>{empty}</p>
      </div>
    )
  }
  return <ObjectTable title={title} icon={icon} rows={rows} />
}

const METRIC_COLS: { key: keyof ObjectMetrics; label: string; defId?: string; fmt: (m: ObjectMetrics) => string }[] = [
  { key: 'added', label: 'Added', defId: 'added', fmt: (m) => fmtInt(m.added) },
  { key: 'deleted', label: 'Removed', defId: 'deleted', fmt: (m) => fmtInt(m.deleted) },
  { key: 'growth', label: 'Growth', defId: 'growth', fmt: (m) => fmtSigned(m.growth) },
  { key: 'churn', label: 'Churn', defId: 'churn', fmt: (m) => fmtInt(m.churn) },
  { key: 'modifications', label: 'Mods', defId: 'modifications', fmt: (m) => fmtInt(m.modifications) },
  {
    key: 'modificationFrequency',
    label: 'Freq η',
    defId: 'modificationFrequency',
    fmt: (m) => fmtPct(m.modificationFrequency),
  },
  { key: 'churnRate', label: 'Rate ρ', defId: 'churnRate', fmt: (m) => fmtDecimal(m.churnRate) },
]

function ObjectTable({
  title,
  icon,
  rows,
  compact,
}: {
  title: string
  icon: React.ReactNode
  rows: ObjectMetrics[]
  compact?: boolean
}) {
  const cols = compact ? METRIC_COLS.filter((c) => ['churn', 'modifications'].includes(c.key)) : METRIC_COLS
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          {icon} {title}
        </h3>
        <span className="hint-text">{fmtInt(rows.length)} objects</span>
      </div>
      <div className={compact ? undefined : 'table-scroll'}>
        <table className="table">
          <thead>
            <tr>
              <th>Path</th>
              {cols.map((c) => (
                <th key={c.key} className="is-num">
                  <span className="th-inner">
                    {c.label} {c.defId && <InfoHint defId={c.defId} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.path}>
                <td className="table__path" title={m.path}>
                  {m.path}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="is-num">
                    {c.fmt(m)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---- commit set -------------------------------------------------------- */

function CommitSetTab({
  result,
  commits,
  filters,
  authors,
}: {
  result: AnalysisResult
  commits: CommitView[]
  filters: FilterState
  authors: AuthorView[]
}) {
  const repo = result.repository
  const inScope = useMemo(() => {
    if (filters.commitMode === 'manual') {
      return commits.filter((c) => filters.selectedCommits.includes(c.shortHash))
    }
    if (filters.commitMode === 'range') {
      const start = filters.rangeStart ? Date.parse(filters.rangeStart) / 1000 : -Infinity
      const end = filters.rangeEnd ? Date.parse(filters.rangeEnd) / 1000 + 86400 : Infinity
      return commits.filter((c) => c.committerDate >= start && c.committerDate < end)
    }
    return commits
  }, [commits, filters])

  const nameOf = (id: string) => authors.find((a) => a.id === id)?.displayName ?? '—'

  return (
    <>
      <div className="metric-grid">
        <MetricCard label="Commits in set" value={fmtInt(result.commitSetSize)} icon={GitBranch} defId="commitSet" />
        <MetricCard label="Added" value={fmtInt(repo.added)} icon={TrendingUp} trend="up" defId="added" />
        <MetricCard label="Removed" value={fmtInt(repo.deleted)} icon={Code} trend="down" defId="deleted" />
        <MetricCard label="Churn" value={fmtInt(repo.churn)} icon={Activity} defId="churn" />
        <MetricCard
          label="Avg churn / commit"
          value={fmtDecimal(repo.churnRate)}
          icon={Layers}
          defId="churnRate"
        />
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3>
            <Users size={15} /> Author ownership
          </h3>
          <span className="hint-text">
            share of churn · <InfoHint defId="ownership" />
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Author</th>
              <th className="is-num">Churn</th>
              <th className="is-num">Mods</th>
              <th className="is-num">Ownership ω</th>
            </tr>
          </thead>
          <tbody>
            {result.authors.map((a) => (
              <tr key={a.authorId}>
                <td>{a.displayName}</td>
                <td className="is-num">{fmtInt(a.churn)}</td>
                <td className="is-num">{fmtInt(a.modifications)}</td>
                <td className="is-num">{fmtPct(a.ownership)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3>
            <GitBranch size={15} /> Commits in range
          </h3>
          <span className="hint-text">{fmtInt(inScope.length)} shown</span>
        </div>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Hash</th>
                <th>Author</th>
                <th>Date</th>
                <th className="is-num">Files</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {inScope.slice(0, 100).map((c) => (
                <tr key={c.hash}>
                  <td className="mono">{c.shortHash}</td>
                  <td>{nameOf(c.authorId)}</td>
                  <td>{new Date(c.committerDate * 1000).toLocaleDateString('en-GB')}</td>
                  <td className="is-num">{c.filesChanged}</td>
                  <td className="table__msg">{c.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ---- charts ------------------------------------------------------------ */

function ChartActivity({ data }: { data: AnalysisResult['activity'] }) {
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          <Activity size={15} /> Commit activity
        </h3>
        <span className="hint-text">added vs removed lines per period</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="gAdd" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f8cff" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#4f8cff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6b6b" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ff6b6b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="bucket" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--text)' }}
          />
          <Area type="monotone" dataKey="added" stroke="#4f8cff" fill="url(#gAdd)" name="Added" />
          <Area type="monotone" dataKey="deleted" stroke="#ff6b6b" fill="url(#gDel)" name="Removed" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartAuthors({ data }: { data: { name: string; churn: number }[] }) {
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          <Users size={15} /> Churn by author
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'var(--surface-hover)' }}
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--text)' }}
          />
          <Bar dataKey="churn" radius={[6, 6, 0, 0]} name="Churn">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
