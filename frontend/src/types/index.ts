// Domain models shared across the RAT frontend.
// These mirror the backend API responses (see backend/src/model.ts).

export type RepoSource = 'zip' | 'url'

/** Repository as returned by GET /api/repos. */
export interface Repository {
  id: string
  name: string
  source: RepoSource
  origin: string
  ref: string
  addedAt: string
  commitCount: number
  authorCount: number
  error?: string
}

/** A raw git identity (a single name/email pair seen on a commit). */
export interface RawIdentity {
  name: string
  email: string
}

/** A logical author after applying mailmap + manual merges. */
export interface AuthorView {
  id: string
  displayName: string
  email: string
  sources: RawIdentity[]
  fromMailmap: boolean
  fromManualMerge: boolean
  commitCount: number
}

/** Persisted manual merge (backend AuthorMerge). */
export interface AuthorMerge {
  canonicalEmail: string
  displayName: string
  sources: RawIdentity[]
}

/** A commit for the manual commit picker. */
export interface CommitView {
  hash: string
  shortHash: string
  committerDate: number
  authorId: string
  authorName: string
  message: string
  filesChanged: number
}

/** A node in the repository file tree. */
export interface TreeNode {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

/** The four filter dimensions the dashboard supports. */
export type CommitMode = 'all' | 'range' | 'manual'

export interface FilterState {
  repoId: string | null
  authorId: string | null
  nodePath: string | null
  commitMode: CommitMode
  /** Date-input values (yyyy-mm-dd), converted to epoch seconds for requests. */
  rangeStart: string | null
  rangeEnd: string | null
  selectedCommits: string[]
}

// ---- Analysis (matches backend AnalysisResult) ---------------------------

export interface ObjectMetrics {
  path: string
  type: 'file' | 'directory'
  added: number
  deleted: number
  growth: number
  churn: number
  modifications: number
  modificationFrequency: number
  churnRate: number
}

export interface AuthorChurn {
  authorId: string
  displayName: string
  churn: number
  modifications: number
  ownership: number
}

export interface AnalysisResult {
  scope: string
  commitSetSize: number
  repository: ObjectMetrics
  files: ObjectMetrics[]
  directories: ObjectMetrics[]
  authors: AuthorChurn[]
  activity: { bucket: string; added: number; deleted: number; commits: number }[]
}

/** Metric categories requested in the spec. */
export type MetricCategory = 'file' | 'directory' | 'repository' | 'commitSet'
