import { canonicalize, type MailmapEntry } from './mailmap.js'
import type { AuthorMerge, AuthorView, CommitRecord, RawIdentity } from './model.js'

const lower = (s: string) => s.toLowerCase()

/** Effective author a commit collapses onto after mailmap + manual merges. */
export interface ResolvedAuthor {
  id: string
  displayName: string
  email: string
  fromMailmap: boolean
  fromManualMerge: boolean
}

function findMerge(
  merges: AuthorMerge[],
  raw: RawIdentity,
  effectiveEmail: string,
): AuthorMerge | undefined {
  return merges.find((m) => {
    if (m.canonicalEmail && lower(m.canonicalEmail) === lower(effectiveEmail)) return true
    return m.sources.some(
      (s) => lower(s.email) === lower(raw.email) && (s.name === raw.name || !s.name),
    )
  })
}

export function resolveAuthor(
  raw: RawIdentity,
  entries: MailmapEntry[],
  merges: AuthorMerge[],
): ResolvedAuthor {
  const canon = canonicalize(entries, raw)
  let id = canon.identity.email || canon.identity.name || 'unknown'
  let displayName = canon.identity.name || canon.identity.email || 'Unknown'
  const fromMailmap = canon.mapped
  let fromManualMerge = false

  const merge = findMerge(merges, raw, id)
  if (merge) {
    id = merge.canonicalEmail || merge.displayName
    displayName = merge.displayName
    fromManualMerge = true
  }

  return { id, displayName, email: id, fromMailmap, fromManualMerge }
}

/** Collapse all commits into the merged author view used by the UI. */
export function aggregateAuthors(
  commits: CommitRecord[],
  entries: MailmapEntry[],
  merges: AuthorMerge[],
): AuthorView[] {
  const byId = new Map<string, AuthorView>()

  for (const c of commits) {
    const r = resolveAuthor(c.author, entries, merges)
    let view = byId.get(r.id)
    if (!view) {
      view = {
        id: r.id,
        displayName: r.displayName,
        email: r.email,
        sources: [],
        fromMailmap: r.fromMailmap,
        fromManualMerge: r.fromManualMerge,
        commitCount: 0,
      }
      byId.set(r.id, view)
    }
    view.commitCount++
    view.fromMailmap = view.fromMailmap || r.fromMailmap
    view.fromManualMerge = view.fromManualMerge || r.fromManualMerge
    // Track the distinct raw identities folded into this author.
    if (!view.sources.some((s) => s.name === c.author.name && s.email === c.author.email)) {
      view.sources.push({ ...c.author })
    }
  }

  return [...byId.values()].sort(
    (a, b) => b.commitCount - a.commitCount || a.displayName.localeCompare(b.displayName),
  )
}
