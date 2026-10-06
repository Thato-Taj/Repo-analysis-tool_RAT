// Domain models shared across the RAT frontend.
// These mirror the concepts described in the requirements: repos, authors,
// files/directories, commits and the four metric categories.

/** How a repository was brought into the tool. */
export type RepoSource = 'zip' | 'url'

/** A repository that has been added to the dashboard. */
export interface Repository {
  id: string
  name: string
  source: RepoSource
  /** Clone URL when source is 'url'; original filename when source is 'zip'. */
  origin: string
  /** Total commits discovered after the deep clone / zip import. */
  commitCount: number
  /** Distinct (pre-merge) authors discovered. */
  authorCount: number
  addedAt: string
}

/**
 * A raw git identity. The same human can appear multiple times under different
 * name/email combinations — which is why author merging / mailmap exists.
 */
export interface RawAuthor {
  id: string
  name: string
  email: string
}

/** A logical author after applying mailmap / manual merges. */
export interface MergedAuthor {
  id: string
  /** Canonical display name chosen for the merged identity. */
  displayName: string
  /** All raw identities folded into this author. */
  sources: RawAuthor[]
  /** True if a .mailmap entry produced this merge. */
  fromMailmap: boolean
}

/** A commit, as surfaced for the commit-set filter. */
export interface Commit {
  hash: string
  shortHash: string
  /** Canonical (merged) author id. */
  authorId: string
  authoredAt: string
  message: string
  filesChanged: number
}

/** A node in the repository file tree (file or directory). */
export interface TreeNode {
  id: string
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

/** The four filter dimensions the dashboard must support. */
export interface FilterState {
  repoId: string | null
  authorId: string | null
  /** Selected file or directory path, if any. */
  nodePath: string | null
  /** 'all' | 'range' | 'manual' commit selection mode. */
  commitMode: CommitMode
  rangeStart: string | null
  rangeEnd: string | null
  /** Commit hashes selected manually when commitMode === 'manual'. */
  selectedCommits: string[]
}

export type CommitMode = 'all' | 'range' | 'manual'

/** A single scalar metric rendered inside a metric card. */
export interface MetricStat {
  label: string
  value: string | number
  /** Optional secondary line, e.g. a trend or unit. */
  hint?: string
}

/** Metric categories requested in the spec. */
export type MetricCategory = 'file' | 'directory' | 'repository' | 'commitSet'
