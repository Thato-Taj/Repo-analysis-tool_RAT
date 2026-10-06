import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Repo root of the backend package (…/backend). */
export const BACKEND_ROOT = path.resolve(__dirname, '..')

/** Where cloned/unpacked repositories and the JSON store live. */
export const DATA_DIR = process.env.RAT_DATA_DIR
  ? path.resolve(process.env.RAT_DATA_DIR)
  : path.join(BACKEND_ROOT, 'data')

export const REPOS_DIR = path.join(DATA_DIR, 'repos')
export const DB_PATH = path.join(DATA_DIR, 'db.json')

/** Similarity threshold for git rename detection (spec: 50%). */
export const RENAME_THRESHOLD = '50%'

/** Default port for the API. */
export const PORT = Number(process.env.PORT ?? 4000)

export function ensureDirs(): void {
  fs.mkdirSync(REPOS_DIR, { recursive: true })
}
