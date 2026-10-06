import type {
  Commit,
  MergedAuthor,
  Repository,
  TreeNode,
} from '../types'

// ---------------------------------------------------------------------------
// Placeholder data so the UI has something to render before the backend is
// wired up. Everything here is replaced by real API responses later.
// ---------------------------------------------------------------------------

export const mockRepositories: Repository[] = [
  {
    id: 'repo-1',
    name: 'atlas-core',
    source: 'url',
    origin: 'https://github.com/acme/atlas-core.git',
    commitCount: 1284,
    authorCount: 9,
    addedAt: '2026-09-14T09:12:00Z',
  },
  {
    id: 'repo-2',
    name: 'payments-service',
    source: 'zip',
    origin: 'payments-service.zip',
    commitCount: 542,
    authorCount: 5,
    addedAt: '2026-09-28T15:40:00Z',
  },
  {
    id: 'repo-3',
    name: 'design-system',
    source: 'url',
    origin: 'https://gitlab.com/acme/design-system.git',
    commitCount: 318,
    authorCount: 4,
    addedAt: '2026-10-01T11:05:00Z',
  },
]

export const mockAuthors: MergedAuthor[] = [
  {
    id: 'author-1',
    displayName: 'Maria Chen',
    fromMailmap: true,
    sources: [
      { id: 'r1', name: 'Maria Chen', email: 'maria@acme.io' },
      { id: 'r2', name: 'M. Chen', email: 'mchen@users.noreply.github.com' },
      { id: 'r3', name: 'maria', email: 'maria.chen@gmail.com' },
    ],
  },
  {
    id: 'author-2',
    displayName: 'Tomasz Kowalski',
    fromMailmap: false,
    sources: [{ id: 'r4', name: 'Tomasz Kowalski', email: 'tomasz@acme.io' }],
  },
  {
    id: 'author-3',
    displayName: 'Priya Nair',
    fromMailmap: true,
    sources: [
      { id: 'r5', name: 'Priya Nair', email: 'priya@acme.io' },
      { id: 'r6', name: 'pnair', email: 'p.nair@outlook.com' },
    ],
  },
  {
    id: 'author-4',
    displayName: 'Sam Ortiz',
    fromMailmap: false,
    sources: [{ id: 'r7', name: 'Sam Ortiz', email: 'sam.ortiz@proton.me' }],
  },
]

export const mockCommits: Commit[] = [
  {
    hash: 'a1f9c2e8b04d1a6f3c9e0b7d2a5f8c1e4b7d0a3f',
    shortHash: 'a1f9c2e',
    authorId: 'author-1',
    authoredAt: '2026-09-30T14:22:00Z',
    message: 'refactor(auth): split token refresh into its own module',
    filesChanged: 12,
  },
  {
    hash: 'b7e2d4a9c1f03b6e8a2d5c7f9b1e4d2a8c6f0b3d',
    shortHash: 'b7e2d4a',
    authorId: 'author-3',
    authoredAt: '2026-09-27T08:03:00Z',
    message: 'fix(payments): guard against negative refund amounts',
    filesChanged: 3,
  },
  {
    hash: 'c3d8f1b6a9e24c7d0f5b8a1e4d7c2b9f6a3d8c1e',
    shortHash: 'c3d8f1b',
    authorId: 'author-2',
    authoredAt: '2026-09-21T17:45:00Z',
    message: 'chore(ci): cache node_modules between pipeline runs',
    filesChanged: 1,
  },
  {
    hash: 'd9a4c7e2b5f81d3a6c9e2b5d8f1a4c7e0b3d6f9a',
    shortHash: 'd9a4c7e',
    authorId: 'author-1',
    authoredAt: '2026-09-15T10:11:00Z',
    message: 'feat(metrics): add churn heatmap to repository view',
    filesChanged: 27,
  },
  {
    hash: 'e5b8d1f4a7c29e6b0d3f8a5c1e7b4d9a2c6f0b8e',
    shortHash: 'e5b8d1f',
    authorId: 'author-4',
    authoredAt: '2026-09-08T12:30:00Z',
    message: 'docs: rewrite onboarding guide with screenshots',
    filesChanged: 5,
  },
]

export const mockTree: TreeNode[] = [
  {
    id: 'n1',
    name: 'src',
    path: 'src',
    type: 'directory',
    children: [
      {
        id: 'n1-1',
        name: 'auth',
        path: 'src/auth',
        type: 'directory',
        children: [
          { id: 'n1-1-1', name: 'token.ts', path: 'src/auth/token.ts', type: 'file' },
          { id: 'n1-1-2', name: 'session.ts', path: 'src/auth/session.ts', type: 'file' },
        ],
      },
      {
        id: 'n1-2',
        name: 'payments',
        path: 'src/payments',
        type: 'directory',
        children: [
          { id: 'n1-2-1', name: 'refund.ts', path: 'src/payments/refund.ts', type: 'file' },
          { id: 'n1-2-2', name: 'ledger.ts', path: 'src/payments/ledger.ts', type: 'file' },
        ],
      },
      { id: 'n1-3', name: 'index.ts', path: 'src/index.ts', type: 'file' },
    ],
  },
  {
    id: 'n2',
    name: 'tests',
    path: 'tests',
    type: 'directory',
    children: [
      { id: 'n2-1', name: 'auth.spec.ts', path: 'tests/auth.spec.ts', type: 'file' },
      { id: 'n2-2', name: 'payments.spec.ts', path: 'tests/payments.spec.ts', type: 'file' },
    ],
  },
  { id: 'n3', name: 'README.md', path: 'README.md', type: 'file' },
]
