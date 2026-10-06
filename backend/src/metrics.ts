import { resolveAuthor } from './authors.js'
import type { MailmapEntry } from './mailmap.js'
import type {
  AnalysisRequest,
  AnalysisResult,
  AuthorChurn,
  AuthorMerge,
  CommitRecord,
  ObjectMetrics,
} from './model.js'

interface Acc {
  added: number
  deleted: number
  mods: number
}

const newAcc = (): Acc => ({ added: 0, deleted: 0, mods: 0 })

/** Does `path` fall inside the requested scope? */
function inScope(path: string, objectPath: string | null | undefined): boolean {
  if (!objectPath) return true
  return path === objectPath || path.startsWith(objectPath + '/')
}

/** Ancestor directories of a path, outermost first (excludes the file itself). */
function ancestorDirs(path: string): string[] {
  const parts = path.split('/')
  const dirs: string[] = []
  let cur = ''
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur ? `${cur}/${parts[i]}` : parts[i]!
    dirs.push(cur)
  }
  return dirs
}

/** Select the commit set H according to the commit-selection mode. */
function selectCommits(commits: CommitRecord[], req: AnalysisRequest): CommitRecord[] {
  const mode = req.commitMode ?? 'all'
  if (mode === 'manual') {
    const set = new Set(req.selectedCommits ?? [])
    // Accept both full and short hashes.
    return commits.filter(
      (c) => set.has(c.hash) || set.has(c.hash.slice(0, 9)),
    )
  }
  if (mode === 'range') {
    const start = req.rangeStart ?? -Infinity
    const end = req.rangeEnd ?? Infinity
    return commits.filter((c) => c.committerDate >= start && c.committerDate < end)
  }
  return commits
}

function buildMetrics(
  path: string,
  type: 'file' | 'directory',
  acc: Acc,
  setSize: number,
): ObjectMetrics {
  const growth = acc.added - acc.deleted
  const churn = acc.added + acc.deleted
  return {
    path,
    type,
    added: acc.added,
    deleted: acc.deleted,
    growth,
    churn,
    modifications: acc.mods,
    modificationFrequency: setSize > 0 ? acc.mods / setSize : 0,
    churnRate: setSize > 0 ? churn / setSize : 0,
  }
}

export function computeAnalysis(
  allCommits: CommitRecord[],
  entries: MailmapEntry[],
  merges: AuthorMerge[],
  req: AnalysisRequest,
): AnalysisResult {
  // 1. Base commit set from the time-window / manual selection.
  const selection = selectCommits(allCommits, req)

  // 2. Effective author id per commit (mailmap + manual merges).
  const authorOf = new Map<string, { id: string; displayName: string }>()
  for (const c of selection) {
    const r = resolveAuthor(c.author, entries, merges)
    authorOf.set(c.hash, { id: r.id, displayName: r.displayName })
  }

  // 3. Author-filtered set H used for file/dir/repo/commit-set metrics.
  const H = req.authorId
    ? selection.filter((c) => authorOf.get(c.hash)?.id === req.authorId)
    : selection
  const setSize = H.length

  const objectPath = req.objectPath ?? null
  const fileAgg = new Map<string, Acc>()
  const dirAgg = new Map<string, Acc>()
  const repo = newAcc()

  let scopeAdded = 0
  let scopeDeleted = 0

  for (const c of H) {
    const touchedFiles = new Set<string>()
    const touchedDirs = new Set<string>()
    let commitScopedChurn = 0

    for (const f of c.files) {
      if (f.binary) continue // binary files are not measured
      if (!inScope(f.path, objectPath)) continue

      const churn = f.added + f.deleted
      // Leaf file accumulation.
      const fa = fileAgg.get(f.path) ?? newAcc()
      fa.added += f.added
      fa.deleted += f.deleted
      fileAgg.set(f.path, fa)

      // Directory accumulation across every ancestor (recursive roll-up).
      for (const d of ancestorDirs(f.path)) {
        const da = dirAgg.get(d) ?? newAcc()
        da.added += f.added
        da.deleted += f.deleted
        dirAgg.set(d, da)
      }

      scopeAdded += f.added
      scopeDeleted += f.deleted
      commitScopedChurn += churn
      if (churn > 0) {
        touchedFiles.add(f.path)
        for (const d of ancestorDirs(f.path)) touchedDirs.add(d)
      }
    }

    // Modifications counted once per commit per object.
    for (const p of touchedFiles) (fileAgg.get(p) ?? newAcc()).mods++
    for (const d of touchedDirs) (dirAgg.get(d) ?? newAcc()).mods++
    if (commitScopedChurn > 0) repo.mods++
  }

  repo.added = scopeAdded
  repo.deleted = scopeDeleted

  const repoType: 'file' | 'directory' = objectPath && fileAgg.has(objectPath) ? 'file' : 'directory'

  // 4. Author metrics over the selection (not author-filtered) to show shares.
  const authorChurn = new Map<string, { displayName: string; churn: number; mods: number }>()
  let totalAuthorChurn = 0
  for (const c of selection) {
    const a = authorOf.get(c.hash)
    if (!a) continue
    let churn = 0
    for (const f of c.files) {
      if (f.binary) continue
      if (!inScope(f.path, objectPath)) continue
      churn += f.added + f.deleted
    }
    const entry = authorChurn.get(a.id) ?? { displayName: a.displayName, churn: 0, mods: 0 }
    entry.churn += churn
    if (churn > 0) entry.mods++
    authorChurn.set(a.id, entry)
    totalAuthorChurn += churn
  }

  const authors: AuthorChurn[] = [...authorChurn.entries()]
    .map(([authorId, v]) => ({
      authorId,
      displayName: v.displayName,
      churn: v.churn,
      modifications: v.mods,
      ownership: totalAuthorChurn > 0 ? v.churn / totalAuthorChurn : 0,
    }))
    .sort((x, y) => y.churn - x.churn)

  // 5. Activity buckets (per UTC month) for the dashboard chart.
  const buckets = new Map<string, { added: number; deleted: number; commits: number }>()
  for (const c of H) {
    const d = new Date(c.committerDate * 1000)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const b = buckets.get(key) ?? { added: 0, deleted: 0, commits: 0 }
    for (const f of c.files) {
      if (f.binary || !inScope(f.path, objectPath)) continue
      b.added += f.added
      b.deleted += f.deleted
    }
    b.commits++
    buckets.set(key, b)
  }
  const activity = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, v]) => ({ bucket, ...v }))

  const files = [...fileAgg.entries()]
    .map(([p, acc]) => buildMetrics(p, 'file', acc, setSize))
    .sort((a, b) => b.churn - a.churn)
    .slice(0, 500)

  const directories = [...dirAgg.entries()]
    .map(([p, acc]) => buildMetrics(p, 'directory', acc, setSize))
    .sort((a, b) => b.churn - a.churn)

  return {
    scope: objectPath ?? '/',
    commitSetSize: setSize,
    repository: buildMetrics(objectPath ?? '/', repoType, repo, setSize),
    files,
    directories,
    authors,
    activity,
  }
}
