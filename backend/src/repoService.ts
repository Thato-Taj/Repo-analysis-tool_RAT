import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { REPOS_DIR } from './config.js'
import {
  cloneBare,
  discoverGitDir,
  indexCommits,
  listPaths,
  resolveRef,
  runGit,
  showBlob,
  unpackZip,
} from './git.js'
import { parseMailmap, type MailmapEntry } from './mailmap.js'
import { aggregateAuthors, resolveAuthor } from './authors.js'
import { computeAnalysis } from './metrics.js'
import { addRepo, getMerges, getRepo, updateRepo } from './store.js'
import type {
  AnalysisRequest,
  AnalysisResult,
  AuthorView,
  CommitRecord,
  RepoMeta,
  RepoSource,
  TreeNode,
} from './model.js'

// ---- index cache ---------------------------------------------------------

interface Index {
  commits: CommitRecord[]
  entries: MailmapEntry[]
}

const indexCache = new Map<string, Index>()

export function invalidateIndex(repoId: string): void {
  indexCache.delete(repoId)
}

/** Ensure the (expensive) commit index is built and cached for a repo. */
export async function ensureIndex(repo: RepoMeta): Promise<Index> {
  const cached = indexCache.get(repo.id)
  if (cached) return cached

  const mailmapRaw = await showBlob(repo.gitDir, repo.ref, '.mailmap')
  const entries = mailmapRaw ? parseMailmap(mailmapRaw) : []
  const commits = await indexCommits(repo.gitDir, repo.ref)
  const index: Index = { commits, entries }
  indexCache.set(repo.id, index)
  return index
}

// ---- intake --------------------------------------------------------------

function newId(): string {
  return crypto.randomBytes(6).toString('hex')
}

async function quickCounts(gitDir: string, ref: string) {
  let commitCount = 0
  let authorCount = 0
  try {
    const c = await runGit(gitDir, ['rev-list', '--count', ref])
    commitCount = Number(c.trim()) || 0
  } catch {
    /* empty repo */
  }
  try {
    const a = await runGit(gitDir, ['--no-pager', 'log', '--no-merges', '--format=%ae'])
    authorCount = new Set(a.split('\n').map((s) => s.trim().toLowerCase()).filter(Boolean)).size
  } catch {
    authorCount = 0
  }
  return { commitCount, authorCount }
}

export async function addRepository(opts: {
  name: string
  source: RepoSource
  url?: string
  zipPath?: string
}): Promise<RepoMeta> {
  const id = newId()
  const dir = path.join(REPOS_DIR, id)
  fs.mkdirSync(dir, { recursive: true })

  let location
  let origin: string
  if (opts.source === 'url') {
    if (!opts.url) throw new Error('A clone URL is required')
    origin = opts.url
    location = await cloneBare(opts.url, path.join(dir, 'repo.git'))
  } else {
    if (!opts.zipPath) throw new Error('An uploaded ZIP is required')
    origin = path.basename(opts.zipPath)
    const unpacked = path.join(dir, 'worktree')
    await unpackZip(opts.zipPath, unpacked)
    const found = discoverGitDir(unpacked)
    if (!found) {
      throw new Error(
        'No .git directory (or bare repo) was found in the archive. Include the .git folder so commit history is preserved.',
      )
    }
    location = found
  }

  const ref = await resolveRef(location.gitDir)
  const meta = addRepo({
    id,
    name: opts.name,
    source: opts.source,
    origin,
    gitDir: location.gitDir,
    workTree: location.workTree,
    ref,
    addedAt: new Date().toISOString(),
  })

  // Warm the index so subsequent author/analysis calls are instant.
  try {
    await ensureIndex(meta)
    invalidateIndex(meta.id) // drop, rebuilt lazily with fresh cache
    await ensureIndex(meta)
  } catch (err) {
    updateRepo(id, { error: err instanceof Error ? err.message : String(err) })
  }
  return getRepo(id) ?? meta
}

// ---- views ---------------------------------------------------------------

export async function repoSummaries(): Promise<
  (RepoMeta & { commitCount: number; authorCount: number })[]
> {
  const { listRepos } = await import('./store.js')
  const out = []
  for (const repo of listRepos()) {
    let commitCount = 0
    let authorCount = 0
    try {
      const index = await ensureIndex(repo)
      commitCount = index.commits.length
      authorCount = aggregateAuthors(index.commits, index.entries, getMerges(repo.id)).length
    } catch {
      const counts = await quickCounts(repo.gitDir, repo.ref).catch(() => ({
        commitCount: 0,
        authorCount: 0,
      }))
      commitCount = counts.commitCount
      authorCount = counts.authorCount
    }
    out.push({ ...repo, commitCount, authorCount })
  }
  return out
}

export async function getAuthors(repoId: string): Promise<AuthorView[]> {
  const repo = mustRepo(repoId)
  const index = await ensureIndex(repo)
  return aggregateAuthors(index.commits, index.entries, getMerges(repoId))
}

export interface CommitView {
  hash: string
  shortHash: string
  committerDate: number
  authorId: string
  authorName: string
  message: string
  filesChanged: number
}

export async function getCommits(repoId: string): Promise<CommitView[]> {
  const repo = mustRepo(repoId)
  const index = await ensureIndex(repo)
  const merges = getMerges(repoId)
  return index.commits
    .slice()
    .sort((a, b) => b.committerDate - a.committerDate)
    .map((c) => {
      const r = resolveAuthor(c.author, index.entries, merges)
      return {
        hash: c.hash,
        shortHash: c.hash.slice(0, 9),
        committerDate: c.committerDate,
        authorId: r.id,
        authorName: r.displayName,
        message: c.subject,
        filesChanged: c.files.filter((f) => !f.binary).length,
      }
    })
}

export async function getTree(repoId: string): Promise<TreeNode[]> {
  const repo = mustRepo(repoId)
  const paths = await listPaths(repo.gitDir, repo.ref)
  return buildTree(paths)
}

export async function analyse(repoId: string, req: AnalysisRequest): Promise<AnalysisResult> {
  const repo = mustRepo(repoId)
  const index = await ensureIndex(repo)
  return computeAnalysis(index.commits, index.entries, getMerges(repoId), req)
}

// ---- helpers -------------------------------------------------------------

function mustRepo(repoId: string): RepoMeta {
  const repo = getRepo(repoId)
  if (!repo) throw new NotFoundError(`Repository ${repoId} not found`)
  return repo
}

export class NotFoundError extends Error {}

/** Build a nested tree from a flat list of file paths. */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { id: 'root', name: '', path: '', type: 'directory', children: [] }
  const dirIndex = new Map<string, TreeNode>()
  dirIndex.set('', root)

  const ensureDir = (dirPath: string): TreeNode => {
    const existing = dirIndex.get(dirPath)
    if (existing) return existing
    const parts = dirPath.split('/')
    const parent = ensureDir(parts.slice(0, -1).join('/'))
    const node: TreeNode = {
      id: dirPath,
      name: parts[parts.length - 1] ?? dirPath,
      path: dirPath,
      type: 'directory',
      children: [],
    }
    parent.children!.push(node)
    dirIndex.set(dirPath, node)
    return node
  }

  for (const p of paths) {
    const parts = p.split('/')
    const fileName = parts[parts.length - 1]!
    const parent = ensureDir(parts.slice(0, -1).join('/'))
    parent.children!.push({ id: p, name: fileName, path: p, type: 'file' })
  }

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) if (n.children) sortRec(n.children)
  }
  sortRec(root.children!)
  return root.children!
}
