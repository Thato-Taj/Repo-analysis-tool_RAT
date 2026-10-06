import { Router, type Request, type Response, type NextFunction } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { REPOS_DIR } from './config.js'
import {
  addRepository,
  analyse,
  getAuthors,
  getCommits,
  getTree,
  invalidateIndex,
  repoSummaries,
} from './repoService.js'
import { NotFoundError } from './repoService.js'
import { getMerges, removeRepo, setMerges, updateRepo } from './store.js'
import { parseMailmap } from './mailmap.js'
import type { AnalysisRequest, AuthorMerge, RepoSource } from './model.js'

const router = Router()

// Uploads land on disk under data/repos/_uploads.
const uploadRoot = path.join(REPOS_DIR, '_uploads')
fs.mkdirSync(uploadRoot, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 512 * 1024 * 1024 },
})

function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rat-backend', time: new Date().toISOString() })
})

// ---- repositories --------------------------------------------------------

router.get(
  '/repos',
  asyncRoute(async (_req, res) => {
    res.json(await repoSummaries())
  }),
)

router.post(
  '/repos',
  upload.single('file'),
  asyncRoute(async (req, res) => {
    const name = (req.body?.name as string | undefined)?.trim()
    const source = (req.body?.source as RepoSource | undefined) ?? (req.file ? 'zip' : 'url')
    const url = req.body?.url as string | undefined

    if (!name) throw new HttpError(400, 'A repository display name is required')

    let meta
    try {
      meta = await addRepository({
        name,
        source,
        url,
        zipPath: req.file?.path,
      })
    } finally {
      if (req.file?.path) fs.rm(req.file.path, { force: true }, () => undefined)
    }
    const authors = await getAuthors(meta.id)
    res.status(201).json({ ...meta, commitCount: undefined, authorCount: authors.length })
  }),
)

router.delete(
  '/repos/:id',
  asyncRoute(async (req, res) => {
    const id = req.params.id!
    const dir = path.join(REPOS_DIR, id)
    removeRepo(id)
    invalidateIndex(id)
    fs.rm(dir, { recursive: true, force: true }, () => undefined)
    res.status(204).end()
  }),
)

router.post(
  '/repos/:id/reindex',
  asyncRoute(async (req, res) => {
    const id = req.params.id!
    invalidateIndex(id)
    updateRepo(id, { error: undefined })
    res.json(await repoSummaries())
  }),
)

// ---- authors -------------------------------------------------------------

router.get(
  '/repos/:id/authors',
  asyncRoute(async (req, res) => {
    res.json(await getAuthors(req.params.id!))
  }),
)

// Replace the manual merge set, then return the recomputed authors.
router.put(
  '/repos/:id/merges',
  asyncRoute(async (req, res) => {
    const id = req.params.id!
    const merges = (req.body?.merges as AuthorMerge[]) ?? []
    setMerges(id, merges)
    res.json(await getAuthors(id))
  }),
)

// Import a .mailmap: fold it into the manual merge set.
router.post(
  '/repos/:id/mailmap',
  asyncRoute(async (req, res) => {
    const id = req.params.id!
    const content = (req.body?.content as string | undefined) ?? ''
    const entries = parseMailmap(content)
    const byCanon = new Map<string, AuthorMerge>()
    for (const e of entries) {
      if (!e.fromEmail) continue
      const existing = byCanon.get(e.canonEmail)
      const source = { name: e.fromName ?? '', email: e.fromEmail }
      if (existing) existing.sources.push(source)
      else
        byCanon.set(e.canonEmail, {
          canonicalEmail: e.canonEmail,
          displayName: e.canonName ?? e.canonEmail,
          sources: [{ name: e.canonName ?? '', email: e.canonEmail }, source],
        })
    }
    const merged = [...getMerges(id)]
    for (const m of byCanon.values()) {
      const idx = merged.findIndex((x) => x.canonicalEmail === m.canonicalEmail)
      if (idx >= 0) merged[idx] = m
      else merged.push(m)
    }
    setMerges(id, merged)
    res.json(await getAuthors(id))
  }),
)

// ---- commits & tree ------------------------------------------------------

router.get(
  '/repos/:id/commits',
  asyncRoute(async (req, res) => {
    res.json(await getCommits(req.params.id!))
  }),
)

router.get(
  '/repos/:id/tree',
  asyncRoute(async (req, res) => {
    res.json(await getTree(req.params.id!))
  }),
)

// ---- analysis ------------------------------------------------------------

router.post(
  '/repos/:id/analysis',
  asyncRoute(async (req, res) => {
    const body = (req.body ?? {}) as AnalysisRequest
    res.json(await analyse(req.params.id!, body))
  }),
)

// ---- error handling ------------------------------------------------------

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message })
    return
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  const message = err instanceof Error ? err.message : String(err)
  console.error('[rat] request failed:', message)
  res.status(500).json({ error: message })
}

export default router
