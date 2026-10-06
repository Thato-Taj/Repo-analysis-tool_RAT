import Header from '../components/Header'
import FilterBar from '../components/FilterBar'
import MetricsDashboard from '../components/MetricsDashboard'
import type {
  AuthorView,
  CommitView,
  FilterState,
  Repository,
  TreeNode,
} from '../types'

interface DashboardPageProps {
  repo: Repository | null
  repos: Repository[]
  authors: AuthorView[]
  commits: CommitView[]
  tree: TreeNode[]
  filters: FilterState
  bundleLoading: boolean
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
  bundleLoading,
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
        commits={commits}
        onChange={onFilterChange}
        onClear={onFilterClear}
      />
      <div className="content">
        <MetricsDashboard
          repo={repo}
          filters={filters}
          authors={authors}
          commits={commits}
          loading={bundleLoading}
        />
      </div>
    </div>
  )
}
