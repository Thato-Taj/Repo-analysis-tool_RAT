import type {
  AnalysisResult,
  AuthorMerge,
  AuthorView,
  CommitMode,
  CommitView,
  FilterState,
  Repository,
  TreeNode,
} from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) msg = body.error
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const toRequest = (filters: FilterState) => ({
  authorId: filters.authorId,
  objectPath: filters.nodePath,
  commitMode: filters.commitMode as CommitMode,
  rangeStart: filters.rangeStart ? Math.floor(Date.parse(filters.rangeStart) / 1000) : null,
  // Make the end date inclusive of the whole selected day.
  rangeEnd: filters.rangeEnd
    ? Math.floor(Date.parse(filters.rangeEnd) / 1000) + 24 * 3600
    : null,
  selectedCommits: filters.selectedCommits,
})

export const api = {
  health: () => request<{ status: string }>('/health'),

  listRepos: () => request<Repository[]>('/repos'),

  addByUrl: (name: string, url: string) =>
    request<Repository>('/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, source: 'url', url }),
    }),

  addByZip: (name: string, file: File) => {
    const form = new FormData()
    form.append('name', name)
    form.append('source', 'zip')
    form.append('file', file)
    return request<Repository>('/repos', { method: 'POST', body: form })
  },

  removeRepo: (id: string) => request<void>(`/repos/${id}`, { method: 'DELETE' }),

  reindexRepo: (id: string) =>
    request<Repository[]>(`/repos/${id}/reindex`, { method: 'POST' }),

  getAuthors: (id: string) => request<AuthorView[]>(`/repos/${id}/authors`),

  setMerges: (id: string, merges: AuthorMerge[]) =>
    request<AuthorView[]>(`/repos/${id}/merges`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merges }),
    }),

  importMailmap: (id: string, content: string) =>
    request<AuthorView[]>(`/repos/${id}/mailmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),

  getCommits: (id: string) => request<CommitView[]>(`/repos/${id}/commits`),

  getTree: (id: string) => request<TreeNode[]>(`/repos/${id}/tree`),

  analyse: (id: string, filters: FilterState) =>
    request<AnalysisResult>(`/repos/${id}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequest(filters)),
    }),
}
