import type { RawIdentity } from './model.js'

/**
 * A parsed `.mailmap` line.
 *  - `fromEmail` / `fromName` describe the identity to match (email always
 *    lower-cased; a missing field means "match any").
 *  - `canonName` (null → keep the commit's own name) and `canonEmail` are the
 *    canonical identity the matched commits collapse onto.
 */
export interface MailmapEntry {
  fromEmail: string | null
  fromName: string | null
  canonName: string | null
  canonEmail: string
}

const EMAIL_RE = /<([^>]*)>/g

/**
 * Parse `.mailmap` content into entries. Supported git forms:
 *   Pretty <p@x> Legacy <l@x>
 *   Pretty <p@x> <l@x>
 *   Pretty <p@x> LegacyName
 *   Pretty <p@x>                     (canonical-only; keyed on its own email)
 */
export function parseMailmap(content: string): MailmapEntry[] {
  const entries: MailmapEntry[] = []
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    // Collect emails with their span so we can slice out the names between.
    const found: { email: string; start: number; end: number }[] = []
    let m: RegExpExecArray | null
    EMAIL_RE.lastIndex = 0
    while ((m = EMAIL_RE.exec(line)) !== null) {
      found.push({ email: m[1]!.trim(), start: m.index, end: m.index + m[0].length })
    }
    if (found.length === 0) continue

    const canonEmail = found[0]!.email
    const canonName = line.slice(0, found[0]!.start).trim() || null

    if (found.length >= 2) {
      const between = line.slice(found[0]!.end, found[1]!.start).trim()
      entries.push({
        fromEmail: found[1]!.email.toLowerCase(),
        fromName: between || null,
        canonName,
        canonEmail,
      })
    } else {
      const trailing = line.slice(found[0]!.end).trim()
      entries.push({
        fromEmail: canonEmail.toLowerCase(),
        fromName: trailing || null,
        canonName,
        canonEmail,
      })
    }
  }
  return entries
}

/**
 * Resolve a raw identity through the mailmap. Later entries take precedence
 * (matching git) and results are re-mapped to follow chains, guarded against
 * cycles. Returns the raw identity unchanged when nothing matches.
 */
export function canonicalize(
  entries: MailmapEntry[],
  identity: RawIdentity,
): { identity: RawIdentity; mapped: boolean } {
  if (entries.length === 0) return { identity, mapped: false }

  let name = identity.name
  let email = identity.email
  let mapped = false
  const seen = new Set<string>()

  for (let depth = 0; depth < 10; depth++) {
    const key = `${name}\u0000${email}`.toLowerCase()
    if (seen.has(key)) break
    seen.add(key)

    // Iterate from the end so the last matching entry wins.
    let hit: MailmapEntry | undefined
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i]!
      const emailOk = e.fromEmail === null || e.fromEmail === email.toLowerCase()
      const nameOk = e.fromName === null || e.fromName === name
      if (emailOk && nameOk && !(e.canonEmail === email && e.canonName === name)) {
        hit = e
        break
      }
    }
    if (!hit) break

    name = hit.canonName ?? name
    email = hit.canonEmail
    mapped = true
  }

  return { identity: { name, email }, mapped }
}
