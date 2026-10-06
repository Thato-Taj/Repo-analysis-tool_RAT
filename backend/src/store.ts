import fs from 'node:fs'
import { DB_PATH, ensureDirs } from './config.js'
import type { AuthorMerge, Database, RepoMeta } from './model.js'

const EMPTY: Database = { repos: [], merges: {} }

let db: Database = structuredClone(EMPTY)
let loaded = false

function persist(): void {
  ensureDirs()
  const tmp = `${DB_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8')
  fs.renameSync(tmp, DB_PATH)
}

export function loadDb(): Database {
  if (loaded) return db
  ensureDirs()
  try {
    if (fs.existsSync(DB_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Partial<Database>
      db = {
        repos: parsed.repos ?? [],
        merges: parsed.merges ?? {},
      }
    }
  } catch {
    db = structuredClone(EMPTY)
  }
  loaded = true
  return db
}

export function listRepos(): RepoMeta[] {
  return loadDb().repos.slice()
}

export function getRepo(id: string): RepoMeta | undefined {
  return loadDb().repos.find((r) => r.id === id)
}

export function addRepo(meta: RepoMeta): RepoMeta {
  loadDb().repos.unshift(meta)
  persist()
  return meta
}

export function updateRepo(id: string, patch: Partial<RepoMeta>): RepoMeta | undefined {
  const repo = getRepo(id)
  if (!repo) return undefined
  Object.assign(repo, patch)
  persist()
  return repo
}

export function removeRepo(id: string): boolean {
  const data = loadDb()
  const idx = data.repos.findIndex((r) => r.id === id)
  if (idx === -1) return false
  data.repos.splice(idx, 1)
  delete data.merges[id]
  persist()
  return true
}

export function getMerges(repoId: string): AuthorMerge[] {
  return loadDb().merges[repoId] ?? []
}

export function setMerges(repoId: string, merges: AuthorMerge[]): AuthorMerge[] {
  loadDb().merges[repoId] = merges
  persist()
  return merges
}
