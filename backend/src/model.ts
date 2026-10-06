// Domain model for the RAT analysis engine.
// These types describe the intermediate data produced by the git indexer and
// the shapes exchanged with the frontend.

/** A raw git identity exactly as stored in a commit object. */
export interface RawIdentity {
  name: string
  email: string
}

/** A change to a single file introduced by one commit (rename → new path). */
export interface FileStat {
  /** Path of the object *after* the commit (new path for renames). */
  path: string
  /** Previous path when the object was renamed/copied; otherwise null. */
  fromPath: string | null
  added: number
  deleted: number
  /** True when git flagged the file as binary (excluded from metrics). */
  binary: boolean
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | 'U'
}

/** One non-merge commit with its per-file statistics. */
export interface CommitRecord {
  hash: string
  /** First parent hash; null for the initial commit (h[p] = ∅). */
  parent: string | null
  /** Committer date as a UNIX timestamp (seconds) — h[committer-date]. */
  committerDate: number
  author: RawIdentity
  /** Commit subject (first line of the message). */
  subject: string
  files: FileStat[]
}

/** How a repository entered the tool. */
export type RepoSource = 'zip' | 'url'

/** Persisted repository registration. */
export interface RepoMeta {
  id: string
  name: string
  source: RepoSource
  origin: string
  /** Directory used as `--git-dir` for all git commands. */
  gitDir: string
  /** Working tree path (null for bare repos). */
  workTree: string | null
  /** Reference we measure reachability from (usually HEAD). */
  ref: string
  addedAt: string
  /** Set when a reindex fails or is pending. */
  error?: string
}

/**
 * Manual author merge persisted per repo: every raw identity in `sources` is
 * folded into one logical author keyed by `canonicalEmail`.
 */
export interface AuthorMerge {
  canonicalEmail: string
  displayName: string
  sources: RawIdentity[]
}

export interface Database {
  repos: RepoMeta[]
  /** Manual merges keyed by repo id. */
  merges: Record<string, AuthorMerge[]>
}

/** A node in the repository file tree (file or directory). */
export interface TreeNode {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

// ---- Authors -------------------------------------------------------------

/** A single author as surfaced to the UI after mailmap + manual merges. */
export interface AuthorView {
  /** Stable id used by filters (canonical email). */
  id: string
  displayName: string
  email: string
  /** All raw identities collapsed into this author. */
  sources: RawIdentity[]
  fromMailmap: boolean
  fromManualMerge: boolean
  commitCount: number
}

// ---- Analysis request / response -----------------------------------------

export type CommitSelectionMode = 'all' | 'range' | 'manual'

export interface AnalysisRequest {
  authorId?: string | null
  /** File or directory path to scope to; null/absent = whole repository. */
  objectPath?: string | null
  commitMode?: CommitSelectionMode
  rangeStart?: number | null
  rangeEnd?: number | null
  selectedCommits?: string[]
}

export interface ObjectMetrics {
  path: string
  type: 'file' | 'directory'
  /** l+ over the commit set. */
  added: number
  /** l− over the commit set. */
  deleted: number
  /** δ = added − deleted. */
  growth: number
  /** λ = added + deleted. */
  churn: number
  /** n = commits with λ > 0 on this object. */
  modifications: number
  /** η = n / |H|. */
  modificationFrequency: number
  /** ρ = λ / |H|. */
  churnRate: number
}

export interface AuthorChurn {
  authorId: string
  displayName: string
  /** λ attributed to this author on the scoped object(s). */
  churn: number
  /** n attributed to this author. */
  modifications: number
  /** ω = authorChurn / totalChurn. */
  ownership: number
}

export interface AnalysisResult {
  scope: string
  commitSetSize: number
  /** Repository-level (root directory) aggregate metrics. */
  repository: ObjectMetrics
  /** File metrics (top N by churn). */
  files: ObjectMetrics[]
  /** Directory metrics (all directories in scope). */
  directories: ObjectMetrics[]
  /** Author metrics for the whole commit set. */
  authors: AuthorChurn[]
  /** Commit activity buckets (for the dashboard chart). */
  activity: { bucket: string; added: number; deleted: number; commits: number }[]
}
