import { useState } from 'react'
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
  File as FileIcon,
  FileType,
  FolderTree,
  GitBranch,
  Layers,
  Table as TableIcon,
} from 'lucide-react'
import type { Commit, FilterState, MergedAuthor, MetricCategory, Repository } from '../types'
import MetricCard from './MetricCard'

interface MetricsDashboardProps {
  repo: Repository | null
  filters: FilterState
  authors: MergedAuthor[]
  commits: Commit[]
}

const TABS: { id: MetricCategory; label: string; icon: typeof Code }[] = [
  { id: 'repository', label: 'Repository Metrics', icon: Layers },
  { id: 'file', label: 'File Metrics', icon: FileType },
  { id: 'directory', label: 'Directory Metrics', icon: FolderTree },
  { id: 'commitSet', label: 'Commit Set Metrics', icon: GitBranch },
]

const CHART_COLORS = ['#4f8cff', '#3ddc97', '#a97bff', '#f5b544', '#ff6b6b']

// Placeholder chart/table data — replaced by backend responses later.
const activitySeries = [
  { week: 'W1', commits: 34, additions: 1820, deletions: 640 },
  { week: 'W2', commits: 51, additions: 2410, deletions: 980 },
  { week: 'W3', commits: 28, additions: 1290, deletions: 1440 },
  { week: 'W4', commits: 66, additions: 3980, deletions: 1210 },
  { week: 'W5', commits: 44, additions: 2205, deletions: 760 },
  { week: 'W6', commits: 73, additions: 4510, deletions: 1680 },
  { week: 'W7', commits: 39, additions: 1730, deletions: 900 },
  { week: 'W8', commits: 58, additions: 3120, deletions: 1120 },
]

const topFiles = [
  { path: 'src/auth/token.ts', churn: 2140, loc: 340 },
  { path: 'src/payments/ledger.ts', churn: 1870, loc: 512 },
  { path: 'src/index.ts', churn: 1320, loc: 88 },
  { path: 'src/payments/refund.ts', churn: 980, loc: 210 },
  { path: 'README.md', churn: 540, loc: 120 },
]

const topDirs = [
  { path: 'src/auth', files: 12, churn: 3400 },
  { path: 'src/payments', files: 9, churn: 2900 },
  { path: 'tests', files: 6, churn: 1100 },
  { path: '.', files: 3, churn: 640 },
]

export default function MetricsDashboard({
  repo,
  filters,
  authors,
  commits,
}: MetricsDashboardProps) {
  const [tab, setTab] = useState<MetricCategory>('repository')

  if (!repo) {
    return (
      <div className="empty">
        <Activity size={34} />
        <h3>No repository selected</h3>
        <p>Add a repository or pick one from the sidebar to compute metrics.</p>
      </div>
    )
  }

  const authorLabel = filters.authorId
    ? authors.find((a) => a.id === filters.authorId)?.displayName
    : null
  const scope =
    authorLabel ?? filters.nodePath ?? (filters.commitMode !== 'all' ? 'Selected commits' : 'Whole repository')

  const barData = authors.slice(0, 5).map((a) => ({
    name: a.displayName.split(' ')[0],
    commits: commits.filter((c) => c.authorId === a.id).length * 7 + 4,
  }))

  return (
    <div>
      <div className="content__section-head">
        <div>
          <h2>Metrics</h2>
          <p>
            Scope: <b style={{ color: 'var(--text)' }}>{scope}</b> ·{' '}
            {filters.commitMode === 'all'
              ? `${repo.commitCount.toLocaleString()} commits`
              : filters.commitMode === 'manual'
                ? `${filters.selectedCommits.length} selected commits`
                : `${filters.rangeStart ?? 'start'} → ${filters.rangeEnd ?? 'now'}`}
          </p>
        </div>
      </div>

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

      {tab === 'repository' && (
        <>
          <div className="metric-grid">
            <MetricCard label="Total commits" value={repo.commitCount.toLocaleString()} icon={GitBranch} trend="up" hint="+12% vs previous period" />
            <MetricCard label="Contributors" value={authors.length} icon={Layers} hint={`${authors.filter((a) => a.sources.length > 1).length} merged via mailmap`} />
            <MetricCard label="Files tracked" value={topFiles.length + 42} icon={FileIcon} />
            <MetricCard label="Net code size" value="24.1k" icon={Code} trend="down" hint="−3.2% churn" />
          </div>
          <ChartActivity />
          <div className="panel panel--split">
            <ChartAuthors data={barData} />
            <Table
              title="Top directories by churn"
              icon={<FolderTree size={15} />}
              head={['Directory', 'Files', 'Churn']}
              rows={topDirs.map((d) => [d.path, String(d.files), d.churn.toLocaleString()])}
            />
          </div>
        </>
      )}

      {tab === 'file' && (
        <>
          <div className="metric-grid">
            <MetricCard label="Files analysed" value={topFiles.length + 42} icon={FileType} />
            <MetricCard label="Highest-churn file" value={topFiles[0].churn.toLocaleString()} icon={Activity} hint={topFiles[0].path} />
            <MetricCard label="Avg. lines / file" value="234" icon={Code} />
            <MetricCard label="Files per author" value={(topFiles.length / authors.length).toFixed(1)} icon={Layers} />
          </div>
          <Table
            title="Per-file metrics"
            icon={<TableIcon size={15} />}
            head={['Path', 'Churn (lines changed)', 'Lines of code']}
            rows={topFiles.map((f) => [f.path, f.churn.toLocaleString(), String(f.loc)])}
            monoFirst
          />
        </>
      )}

      {tab === 'directory' && (
        <>
          <div className="metric-grid">
            <MetricCard label="Directories" value={topDirs.length} icon={FolderTree} />
            <MetricCard label="Largest scope" value={topDirs[0].churn.toLocaleString()} icon={Activity} hint={topDirs[0].path} />
            <MetricCard label="Nested depth" value={3} icon={Layers} />
            <MetricCard label="Files under scope" value={topDirs.reduce((s, d) => s + d.files, 0)} icon={FileIcon} />
          </div>
          <Table
            title="Per-directory metrics"
            icon={<TableIcon size={15} />}
            head={['Directory', 'Files', 'Total churn']}
            rows={topDirs.map((d) => [d.path, String(d.files), d.churn.toLocaleString()])}
            monoFirst
          />
        </>
      )}

      {tab === 'commitSet' && (
        <>
          <div className="metric-grid">
            <MetricCard
              label="Commits in set"
              value={
                filters.commitMode === 'manual'
                  ? filters.selectedCommits.length
                  : repo.commitCount.toLocaleString()
              }
              icon={GitBranch}
            />
            <MetricCard label="Lines added" value={activitySeries.reduce((s, a) => s + a.additions, 0).toLocaleString()} icon={Code} trend="up" />
            <MetricCard label="Lines removed" value={activitySeries.reduce((s, a) => s + a.deletions, 0).toLocaleString()} icon={Code} trend="down" />
            <MetricCard label="Avg. files / commit" value={(commits.reduce((s, c) => s + c.filesChanged, 0) / Math.max(commits.length, 1)).toFixed(1)} icon={FileIcon} />
          </div>
          <ChartActivity />
          <CommitTable commits={commits} authors={authors} />
        </>
      )}
    </div>
  )
}

/* ---- chart + table sub-components -------------------------------------- */

function ChartActivity() {
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          <Activity size={15} /> Commit activity
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={activitySeries} margin={{ left: -20, right: 8, top: 8 }}>
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
          <XAxis dataKey="week" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
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
          <Area type="monotone" dataKey="additions" stroke="#4f8cff" fill="url(#gAdd)" name="Added" />
          <Area type="monotone" dataKey="deletions" stroke="#ff6b6b" fill="url(#gDel)" name="Removed" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartAuthors({ data }: { data: { name: string; commits: number }[] }) {
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          <Layers size={15} /> Commits by author
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
          <Bar dataKey="commits" radius={[6, 6, 0, 0]} name="Commits">
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Table({
  title,
  icon,
  head,
  rows,
  monoFirst,
}: {
  title: string
  icon: React.ReactNode
  head: string[]
  rows: string[][]
  monoFirst?: boolean
}) {
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          {icon} {title}
        </h3>
      </div>
      <table className="table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h} style={i > 0 ? { textAlign: 'right' } : undefined}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={
                    ci === 0 && monoFirst
                      ? 'table__path'
                      : ci > 0
                        ? 'is-num'
                        : undefined
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CommitTable({ commits, authors }: { commits: Commit[]; authors: MergedAuthor[] }) {
  const nameOf = (id: string) => authors.find((a) => a.id === id)?.displayName ?? '—'
  return (
    <Table
      title="Commits in range"
      icon={<GitBranch size={15} />}
      head={['Hash', 'Author', 'Date', 'Files', 'Message']}
      rows={commits.map((c) => [
        c.shortHash,
        nameOf(c.authorId),
        new Date(c.authoredAt).toLocaleDateString(),
        String(c.filesChanged),
        c.message,
      ])}
      monoFirst
    />
  )
}
