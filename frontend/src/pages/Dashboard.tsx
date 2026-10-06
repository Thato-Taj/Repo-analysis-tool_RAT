import Header from '../components/Header'
import FilterBar from '../components/FilterBar'
import MetricsDashboard from '../components/MetricsDashboard'
import type {
  Commit,
  FilterState,
  MergedAuthor,
  Repository,
  TreeNode,
} from '../types'

interface DashboardPageProps {
  repo: Repository | null
  repos: Repository[]
  authors: MergedAuthor[]
  commits: Commit[]
  tree: TreeNode[]
  filters: FilterState
  onFilterChange: (patch: Partial<FilterState>) => void
  onFilterClear: () => void
  onOpenUpload: () => void
  onRefresh: () => void
}

export default function DashboardPage({
  repo,
  repos,
  authors,
  commits,
  tree,
  filters,
  onFilterChange,
  onFilterClear,
  onOpenUpload,
  onRefresh,
}: DashboardPageProps) {
  return (
    <div className="main">
      <Header repo={repo} onOpenUpload={onOpenUpload} onRefresh={onRefresh} />
      <FilterBar
        filters={filters}
        repos={repos}
        authors={authors}
        tree={tree}
        commits={commits.map((c) => ({ shortHash: c.shortHash, message: c.message }))}
        onChange={onFilterChange}
        onClear={onFilterClear}
      />
      <div className="content">
        <MetricsDashboard repo={repo} filters={filters} authors={authors} commits={commits} />
      </div>
    </div>
  )
}
