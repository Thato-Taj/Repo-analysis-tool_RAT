// Human-readable definitions for every metric in the spec, used for the
// in-UI legend and per-metric help so the dense formulas are accessible.

export const METRIC_DEFS: Record<string, string> = {
  added: 'Lines added across the commit set (l+). Summed per commit; binary files are excluded.',
  deleted: 'Lines removed across the commit set (l−). A deleted file contributes its removed lines on its path.',
  growth: 'Net change in line count: δ = added − deleted.',
  churn: 'Total changed lines: λ = added + deleted.',
  modifications: 'Number of commits that changed the object at all (n): commits where churn > 0.',
  modificationFrequency: 'Share of the commit set that touched the object: η = n / |H|.',
  churnRate: 'Average churn per commit: ρ = λ / |H|.',
  ownership: 'Fraction of an object’s churn authored by this person: ω = author churn / total churn.',
  scope: 'A file or directory identified by its path. Rename detection (50%) attributes changes to the new path.',
  commitSet: 'The set of non-merge commits reachable from the reference, narrowed by the time-window or manual selection.',
  author: 'A merged identity: git applies the repository .mailmap, then any manual merges you define.',
}

export const fmtInt = (n: number): string =>
  Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n))

export const fmtPct = (ratio: number): string => `${(ratio * 100).toFixed(1)}%`

export const fmtDecimal = (n: number): string =>
  Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)

/** Compact signed form for growth values (e.g. +5 / −3). */
export const fmtSigned = (n: number): string =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtInt(Math.abs(n))}`

export const fmtDate = (epochSeconds: number): string =>
  new Date(epochSeconds * 1000).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
