# RAT — Repo Analysis Tool

A web dashboard that measures git repository activity **per author, per file, per directory, and for the whole repository**. Import a repo as a ZIP or from a clone URL, merge duplicate identities (via `.mailmap` or manually), then slice the metrics by repository, author, path, and commit set.

---

## Contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [How to use the app](#how-to-use-the-app)
- [Metrics explained](#metrics-explained)
- [Configuration](#configuration)
- [REST API reference](#rest-api-reference)
- [Project structure](#project-structure)
- [Production build](#production-build)
- [Troubleshooting & notes](#troubleshooting--notes)

---

## Features

- **Repository upload**
- — two intake paths:
  - **ZIP archive** that includes the `.git` directory (so full history is preserved).
  - **Clone URL** — RAT performs a deep clone of the full history.
- **Multiple repository support** — keep several repos registered and switch between them.
- **Author merging** — merges git identities using the repository's `.mailmap`, plus manual merge/split in the UI when there is no mailmap.
- **Four filter dimensions** — Repository, Author, File/Directory, and Commits (all history / time window / manually-picked commit list).
- **Metric categories** — File, Directory, Repository, Commit-Set, and Author metrics, each with in-app `?` tooltips explaining the formula.
- **Spec-correct handling** — binary files are excluded, rename detection at a 50% similarity threshold (attributed to the new path), and deletions recorded as removed lines.

## Tech stack

| Layer     | Tech                                                            |
|-----------|-----------------------------------------------------------------|
| Backend   | Node.js (ESM), Express 4, TypeScript, `git` CLI, `multer` uploads, JSON file store |
| Frontend  | Vite, React 18, TypeScript, React Router, Recharts, `lucide-react` |

## Prerequisites

- **Node.js ≥ 18** and npm.
- **Git ≥ 2.x** available on your `PATH` (the backend shells out to `git` — clone, `diff-tree`, `log`, etc.).
- A modern browser.

## Quick start

Open two terminals.

**1. Backend (API on `http://localhost:4000`)**
```bash
cd backend
npm install
npm run dev          # tsx watch — restarts on change
```

**2. Frontend (Vite dev server, usually `http://localhost:5173`)**
```bash
cd frontend
npm install
npm run dev
```

Then open the URL Vite prints (e.g. http://localhost:5173). The frontend proxies every `/api/*` request to the backend on port 4000, so you do not configure CORS or API URLs yourself.

> Verify the backend is up: `curl http://localhost:4000/api/health` → `{"status":"ok",...}`

## How to use the app

### 1. Add a repository
Click **Add Repository** (header button, sidebar **+**, or the sidebar nav item). Choose one mode:

- **Upload ZIP** — drag-and-drop (or browse) a `.zip` of the repo. **It must contain the `.git` directory**, otherwise there is no commit history to analyse. Give it a display name and import.
- **Clone URL** — paste an `http(s)://…` remote URL and a display name. RAT performs a **deep clone** (full history) so every commit is attributed.

Import runs the indexer (walks all non-merge commits reachable from `HEAD`) and applies any `.mailmap` automatically. The new repo appears in the left sidebar with its commit and author counts. Large repos take a little longer on first import.

### 2. Pick the repository
Click a repo card in the sidebar to make it active. Its authors, file tree, and commits load automatically, and the metrics recompute. Hover a card to reveal the **trash** icon to remove a repo (deletes its stored data).

### 3. Merge authors (Author Merging page)
Go to **Author Merging** in the sidebar.

- Each author lists the raw identities collapsed into it, with a **mailmap** or **merged** badge and their commit count.
- **Import `.mailmap`** — upload the file to fold identities belonging to one person.
- **Merge manually** — click **Merge** on an author and choose the surviving author. Their commits are combined.
- **Split** — click **Split** on a manually merged author to undo it.

Use this whenever the same person shows up under multiple name/email combinations (which skews per-author metrics).

### 4. Filter the metrics (FilterBar)
Along the top of the Dashboard:

- **Repository** — the active repo.
- **Author** — restrict the commit set to one merged identity (or all authors).
- **File / Directory** — scope every metric to a path and its subtree (or the whole repo).
- **Commits** — choose the commit set:
  - **All** — full history.
  - **Time period** — start/end dates (inclusive start, exclusive end of the selected day).
  - **Pick commits** — build a manual list from the commit dropdown; remove with the chips.

Active filters show as removable **chips**; **Clear all** resets everything except the selected repository. Metrics update as you change filters.

### 5. Read the metrics (Dashboard tabs)
- **Repository** — headline cards (commits in set, added/removed lines, net growth, total churn, contributors), the commit-activity area chart, churn-by-author bars, and top directories.
- **Files** — per-file table: Added, Removed, Growth, Churn, Mods, Freq η, Rate ρ.
- **Directories** — the same metrics rolled up per directory.
- **Commit Set** — aggregate totals, an **author ownership (ω)** table, and the commits in range.

Hover any **`?`** icon to see that metric's plain-language definition. Use the header **Recompute** button to force a reindex if the repo changed on disk.

## Metrics explained

For a commit \(h\), file \(f\): \(l^{+}_{h,f}\) lines added, \(l^{-}_{h,f}\) lines removed.
Binary files are never measured; renames (≥50% similarity) are attributed to the new path; deletions count as removed lines on the old path.

**File:** \(\delta_{h,f} = l^{+}_{h,f} - l^{-}_{h,f}\) (growth), \(\lambda_{h,f} = l^{+}_{h,f} + l^{-}_{h,f}\) (churn).

**Directory:** recursive sums over immediate children (files + sub-directories) for \(l^{+}, l^{-}, \delta, \lambda\).

**Repository:** directory metrics evaluated at the tree root.

**Commit set** \(H \subseteq \bar{H}\) (non-merge commits reachable from the reference): sum each file metric over \(H\). Then

- Modifications \(n_{H,o} = \sum_{h \in H} \mathbb{I}[\lambda_{h,o} > 0]\)
- Modification frequency \(\eta_{H,o} = n_{H,o} / |H|\)
- Churn rate \(\rho_{H,o} = \lambda_{H,o} / |H|\)

**Author** \(a\): authorship \(\mathbb{I}(a,h) = 1\) if \(a = h[a]\).

- Author churn \(\lambda_{H,o,a} = \sum_{h \in H} \lambda_{h,o} \cdot \mathbb{I}(a,h)\)
- Author ownership \(\omega_{H,o,a} = \lambda_{H,o,a} / \lambda_{H,o}\)

(\(\eta, \rho, \omega\) are defined as `0` when their denominator is `0`.)

## Configuration

Backend environment variables (optional, e.g. in `backend/.env`):

| Variable        | Default                 | Purpose                                        |
|-----------------|-------------------------|------------------------------------------------|
| `PORT`          | `4000`                  | API port.                                      |
| `RAT_DATA_DIR`  | `backend/data`          | Where cloned repos and `db.json` are stored.   |

If you change the backend `PORT`, update the proxy target in [`frontend/vite.config.ts`](frontend/vite.config.ts) accordingly. Import ZIP uploads are capped at **512 MB** per file.

## REST API reference

Base path: `/api`. All responses are JSON; errors return `{ "error": "…" }`.

| Method   | Path                       | Description                                            |
|----------|----------------------------|--------------------------------------------------------|
| `GET`    | `/health`                  | Liveness check.                                        |
| `GET`    | `/repos`                   | List registered repositories.                          |
| `POST`   | `/repos`                   | Add a repo. Multipart `file`+`name`+`source=zip`, or JSON `{ name, source:"url", url }`. |
| `DELETE` | `/repos/:id`               | Remove a repo and its stored data.                     |
| `POST`   | `/repos/:id/reindex`       | Invalidate cache and reindex.                          |
| `GET`    | `/repos/:id/authors`       | Merged authors (mailmap + manual).                     |
| `PUT`    | `/repos/:id/merges`        | Replace manual merge set: `{ merges: [...] }`.         |
| `POST`   | `/repos/:id/mailmap`       | Import a mailmap: `{ content }`.                       |
| `GET`    | `/repos/:id/commits`       | Commit list (for the manual picker).                   |
| `GET`    | `/repos/:id/tree`          | File/directory tree.                                   |
| `POST`   | `/repos/:id/analysis`      | Compute metrics for a filter request (see below).      |

**Analysis request body** (all optional):
```json
{
  "authorId": "alice@example.com",
  "objectPath": "src",
  "commitMode": "all | range | manual",
  "rangeStart": 1700000000,
  "rangeEnd": 1710000000,
  "selectedCommits": ["a1b2c3d"]
}
```
`range` uses `rangeStart` inclusive and `rangeEnd` exclusive (UNIX seconds).

## Project structure
```
.
├── backend/                 # Express + git analysis engine (ESM TypeScript)
│   ├── src/
│   │   ├── index.ts         # app entry (mounts /api)
│   │   ├── routes.ts        # REST endpoints
│   │   ├── repoService.ts   # import / index / analyse orchestration
│   │   ├── git.ts           # git CLI + numstat parser
│   │   ├── metrics.ts       # the metric math
│   │   ├── authors.ts       # identity resolution
│   │   ├── mailmap.ts       # .mailmap parser
│   │   ├── store.ts         # JSON store (db.json)
│   │   ├── model.ts         # shared domain types
│   │   └── config.ts        # ports, paths, thresholds
│   └── data/                # generated: cloned repos + db.json (gitignored)
└── frontend/                # Vite + React dashboard
    └── src/
        ├── App.tsx          # state + routing
        ├── components/      # Sidebar, Header, FilterBar, UploadDialog, …
        ├── pages/           # Dashboard, Authors
        ├── lib/             # api client, format + metric defs
        └── types/           # API-aligned types
```

## Production build
```bash
# Backend
cd backend && npm run build && npm start      # serves dist/ on PORT

# Frontend
cd frontend && npm run build                  # outputs dist/
npm run preview                               # local preview of the build
```
For a production deployment, serve `frontend/dist` from any static host and point `/api` at the backend (the Vite proxy is dev-only).

## Troubleshooting & notes

- **A binary-ish file shows line counts.** RAT defers entirely to **git's** binary detection. If git does not flag a file as binary, its lines are counted. This is correct per the spec ("Git provides the definition and detection of binary files").
- **"Must include the `.git` directory".** A ZIP without `.git` has no history, so nothing can be measured.
- **Clone failures.** Ensure the URL is reachable and you have access rights; private repos need credentials the backend host can use.
- **Ports.** Backend defaults to `4000`; if Vite picks another port (because `5173`/`5174` were busy), use the URL it prints.
- **Same person, split metrics.** This is exactly why Author Merging exists — merge identities before reading per-author numbers.
- **Recompute after on-disk changes.** Use the header **Recompute** (calls `POST /repos/:id/reindex`) to drop the cache and re-index.
