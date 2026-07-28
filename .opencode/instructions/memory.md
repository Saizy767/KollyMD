# memory.md

Project memory for the KollyMD agent. Loaded into context via `opencode.json` `instructions`.
Keep this file as a single source of truth for project scope, decisions, and conventions
agreed with the user. Update it whenever a decision changes.

## 1. Project Overview

**KollyMD** is an Obsidian/Logseq-like local knowledge base built on Electron + TypeScript.
Page-based paradigm (one note = one document, NOT a block-based outliner).
The goal is dry, working functionality — UI polish is explicitly out of scope (see `style.md`).

## 2. Tech Stack (Decided)

- **Runtime:** Electron
- **Language:** TypeScript (strict)
- **Renderer:** Vanilla TS, no framework (no React/Vue/Svelte)
- **Bundler:** None — tsc compiles, renderer uses native ESM (`<script type="module">`)
- **Packager:** electron-builder
- **Markdown parser:** `marked` (runs in MAIN process, `knowledge` module infrastructure — NOT in renderer; browser context cannot resolve bare `node_modules` imports without a bundler, which is forbidden)
- **File watcher:** `chokidar` (cross-platform, reliable)
- **State storage:** JSON file in `app.getPath('userData')`
- **Renderer:** pure TS, zero external imports — only DOM + `window.api` (preload IPC). All parsing/rendering happens in main.

## 3. MVP Scope

### Features (in scope)
- Hybrid storage: open a folder as a vault OR a single file
- Tabs (multiple documents in one window via `<ul>` of `<li>`)
- File ops: New / Save / Save As / Auto-reload on disk changes / Recent files
- `[[wiki-links]]` with flat resolution (by filename, no subfolders in MVP)
- Backlinks (on-demand scan of vault)
- Auto-create note on click of a non-existent `[[link]]` (via `confirm()`)
- Tags `#tag` + listing notes by tag
- File explorer (plain `<ul>`/`<li>`, no icons)
- Global full-text search
- Persistent state: recent files, open tabs, last vault (JSON in userData)

### Explicitly out of scope for MVP
- Export (HTML/PDF)
- Multi-window (tabs only, not separate Electron windows)
- Block-based/outliner paradigm
- Subfolder-aware wiki-link resolution
- Persistent backlinks index (on-demand scan only)

## 4. Architecture Decisions (from discussion)

All decisions MUST comply with `architecture.md` and `style.md`. Key resolutions:

| Decision | Resolution | Rationale |
|---|---|---|
| `composition-root.ts` location | `src/composition-root.ts` (NOT `src/main/`) | architecture.md:76 |
| `main.ts` / `preload.ts` location | `src/main/` | architecture.md:76 |
| IPC pattern | `ipcMain.on` + `event.reply` with `reqId` for correlation | architecture.md:92 (literal) |
| Streaming events (watcher) | `event.reply` without reqId, renderer subscribes | watcher is push-based |
| Preload API | `contextBridge.exposeInMainWorld` with typed API object | security + type safety |
| Domain purity | `NotePath` VO is a pure string; name→fs path mapping lives in `infrastructure` | architecture.md:16 |
| Cross-module deps | ONLY via another module's `index.ts` | architecture.md:86 |
| Domain errors | Caught in IPC handler → shown via `dialog` (main) | architecture.md:28 + style.md:19 |
| Renderer dialogs | `alert()` / `confirm()` / `prompt()` only | style.md:21 |
| Active tab marker | `data-active="true"` attribute on `<li>` (no CSS, no visual prefix) | user choice |
| Close tab button | Text `<button>Close</button>` (no SVG/icon) | style.md:15 |
| Loading state | Button text → "Loading..." + `disabled` attribute | style.md:26 |
| Validation errors | Plain text next to field (e.g. `[Error: invalid format]`) | style.md:27 |
| Live preview | Debounce ~150ms, re-render via `marked` on buffer change | UX decision |
| CSS policy | Allowed in single file `src/renderer/styles.css` (no `<style>`, no inline, no frameworks) | user choice — relaxed from zero-CSS after MVP prototype |
| Icons | Unicode symbols only (`×` `▸` `▾` `●` `⚑`); NO SVG/images/fonts | style.md |
| Layout target | 3-column (sidebar \| editor \| preview), top bar vault+search | Obsidian-like |
| Theme | Dark minimalist (dark bg, light text, one accent) | Obsidian-like |
| UI libraries | BANNED (no Material/Radix/Headless, no Tailwind/Bootstrap) | style.md |
| Renderer stack | Vanilla TS (no React/Vue/Svelte) — stays even after visual phase | user choice |
| Native dialogs | Stays (alert/confirm/prompt) even after visual phase | user choice |

## 5. Module Structure (5 bounded contexts)

Each module = `domain/` → `application/` → `infrastructure/` + `index.ts` (single public entry).

### 5.1 `vault` — filesystem access
- **Domain:** `Note` (id, name, content), `NotePath` (VO, pure string), `Vault` (rootPath string),
  `NoteNotFoundError`, `NoteAlreadyExistsError`, interfaces `NoteRepository`, `FileWatcher`
- **Application:** `OpenVault`, `ListNotes`, `ReadNote`, `WriteNote`, `CreateNote`, `ResolveNoteName`
- **Infrastructure:** `FsNoteRepository` (Node `fs`+`path`), `ChokidarFileWatcher`, `VaultIpcHandler`
- **Public:** DTOs + `registerVaultIpc(ipcMain, deps)`

### 5.2 `editor` — editing session
- **Domain:** `Document` (id, noteId, buffer, dirty), `Tab` (id, documentId, order)
- **Application:** `NewDocument`, `SaveDocument`, `SaveAsDocument`, `CloseTab`, `UpdateBuffer`
- **Infrastructure:** `EditorIpcHandler`
- **Depends on:** `vault` (via `index.ts`) for read/write

### 5.3 `knowledge` — link graph
- **Domain:** `WikiLink` (targetName), `Backlink` (sourceNoteId, targetNoteId), `Tag` (name), `NoteRef`
- **Application:** `ParseWikiLinks`, `FindBacklinks` (on-demand scan via `NoteRepository`),
  `FindNotesByTag`, `CreateNoteFromLink`
- **Infrastructure:** `MarkedWikiLinkPlugin` (marked extension rendering `[[...]]` → `<a data-wiki="Name">`),
  `KnowledgeIpcHandler`
- **Depends on:** `vault`

### 5.4 `search` — full-text search
- **Domain:** `SearchResult` (noteId, snippet, positions)
- **Application:** `SearchNotes` (on-demand scan)
- **Infrastructure:** `SearchIpcHandler`
- **Depends on:** `vault`

### 5.5 `state` — workspace persistence
- **Domain:** `WorkspaceState` (recentFiles, openTabs, lastVault), domain errors
- **Application:** `LoadState`, `SaveState`, `AddRecentFile`, `UpdateOpenTabs`
- **Infrastructure:** `JsonStateRepository` (fs in `app.getPath('userData')`), `StateIpcHandler`

### `shared/`
- `shared/domain/errors/DomainError.ts` (base), `ValidationError`, `NotFoundError`, `BusinessRuleViolationError`
- `shared/infrastructure/Logger.ts`, `AppConfig.ts` (userData paths)

### `composition-root.ts` (in `src/`)
Manual DI assembly. Constructs all repositories, use-cases; registers each module's IPC handler.
`main.ts` imports and calls `bootstrap()`.

## 6. IPC Contract

All channels use `ipcMain.on` + `event.reply` with a `reqId` for request/response correlation.
The preload layer generates `reqId`, sends, and resolves a Promise on the matching reply.

### Channels
- `vault:open-vault`, `vault:open-file`, `vault:list-notes`, `vault:read-note`,
  `vault:write-note`, `vault:create-note`
- `vault:note-changed` (streaming, no reqId — main pushes on watcher events)
- `editor:new`, `editor:save`, `editor:save-as`
- `knowledge:render`, `knowledge:parse-links`, `knowledge:find-backlinks`, `knowledge:find-by-tag`,
  `knowledge:resolve-link`, `knowledge:create-note-from-link`
- `search:search-notes`
- `state:load`, `state:save`, `state:add-recent`, `state:update-open-tabs`

### Error handling in IPC handlers
1. Catch domain error from use case
2. Show via `dialog.showMessageBox` (main process)
3. Reply to renderer with `{ reqId, error: true }` (no error text leaked to renderer UI)

## 7. Renderer Layout (vanilla TS, native ESM, zero CSS)

`src/renderer/index.html` — bare semantic skeleton:
```
<div id="tabs"><ul></ul></div>
<aside id="explorer"><ul></ul></aside>
<textarea id="editor"></textarea>
<div id="preview"></div>
<input id="search"><ul id="search-results"></ul>
<ul id="backlinks"></ul>
```

`src/renderer/renderer.ts` — entry (`type="module"`).
Regions: `tabs.ts`, `explorer.ts`, `editor.ts`, `preview.ts`, `search.ts`, `backlinks.ts`.

- Renderer is pure DOM + IPC. NO external imports (no `marked` in renderer).
- To render preview: send raw MD via `knowledge:render` IPC → main returns HTML (with wiki-link plugin applied) → inject into `#preview` via `innerHTML`. Debounce ~150ms.
- Wiki-link clicks (`<a data-wiki="Name">`) → `knowledge:resolve-link` → if null, `confirm("Create note 'Name'?")` → `create-note-from-link`.
- Active tab: `li[data-active="true"]`.
- Close tab: `<button>Close</button>`.

## 8. Physical Project Structure

```
KollyMD/
├── package.json
├── tsconfig.json / tsconfig.main.json / tsconfig.renderer.json
├── electron-builder.yml
├── src/
│   ├── composition-root.ts
│   ├── main/
│   │   ├── main.ts
│   │   └── preload.ts
│   ├── modules/
│   │   ├── vault/{domain,application,infrastructure}/ + index.ts
│   │   ├── editor/{...}/ + index.ts
│   │   ├── knowledge/{...}/ + index.ts
│   │   ├── search/{...}/ + index.ts
│   │   └── state/{...}/ + index.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── renderer.ts
│   │   └── regions/{tabs,explorer,editor,preview,search,backlinks}.ts
│   └── shared/
│       ├── domain/errors/
│       └── infrastructure/{Logger,AppConfig}.ts
```

## 9. Implementation Phases

1. **Scaffold:** `package.json`, `tsconfig.*`, `electron-builder.yml`, `src/main/main.ts`,
   `preload.ts` (contextBridge skeleton), empty `index.html`, `composition-root.ts`
2. **`shared/`:** `DomainError`, `Logger`, `AppConfig`
3. **`state` module** (full) + IPC + JSON repository
4. **`vault` module** (full): domain → application → `FsNoteRepository` + `ChokidarFileWatcher` + IPC
5. **`editor` module** + IPC
6. **Renderer v1:** tabs (`data-active`), textarea, Save/Open/SaveAs, auto-reload, recent files
7. **`knowledge` module** + `MarkedWikiLinkPlugin` + IPC (resolve/backlinks/tags/create-from-link)
8. **Renderer v2:** wiki-link clicks (via `confirm`), backlinks panel, tags
9. **`search` module** + IPC
10. **Renderer v3:** search box + results
11. **Renderer v4:** file explorer (plain `<ul>`/`<li>`)
12. **Final:** `tsc --noEmit` across all three tsconfigs, `npm run build`, smoke test

## 10. Compliance Checklist (run before each commit)

- CSS only in `src/renderer/styles.css` — NO `<style>` tags, NO inline `style=`
- No SVG / PNG / JPG / icon fonts / `@font-face` (Unicode symbols ARE allowed)
- No UI component libraries or CSS frameworks (Tailwind, Bootstrap, Material, Radix, etc.)
- No `import` of `fs`/`path`/`electron`/`marked`/`chokidar` in `domain/` or `application/`
- No direct import into a module's internals (must go through `index.ts`)
- All domain errors extend `DomainError` (no `throw new Error(...)` for domain problems)
- All user-facing errors via `dialog` (main) or `alert`/`confirm`/`prompt` (renderer)
- No silent error swallowing
- No DI container / no decorators for injection
- Each module exposes exactly one `index.ts`
- `composition-root.ts` is in `src/`, not `src/main/`

## 11. Current Status

### Completed phases

| Phase | Status | Notes |
|---|---|---|
| 1. Scaffold | COMPLETE | Electron + tsc, zero-CSS HTML, `composition-root.ts` in `src/` |
| 2. `shared/` | COMPLETE | `DomainError`, `Logger` (levels error/warn/info/debug), `AppConfig.create(userDataPath)` |
| 3. `state` module | COMPLETE | `WorkspaceState`, `JsonStateRepository` (pure fs, takes `stateFilePath` via constructor), `GetLastVault`/`SetLastVault`/`GetOpenTabs`/`SetOpenTabs` |
| 4. `vault` module | PARTIAL | open/list/create/read/write/findByNoteName/readAllNotes ✅; **`ChokidarFileWatcher` ❌** |
| 5. `editor` module | COMPLETE (multi-doc) | `Document` (immutable readonly), `DocumentRepository` (8 multi-doc methods), `OpenDocument`/`Save`/`SaveAs`/`New`/`MarkDirty`/`Close`/`Switch`/`GetOpenDocuments`; tabs with persist+restore |
| 6. Renderer v1 | PARTIAL | textarea, save/open/saveas/new, tabs ✅; **auto-reload ❌, recent files UI ❌** |
| 7-8. `knowledge` module | COMPLETE | `WikiLink`/`Backlink`/`Tag`/`NoteRef`, `MarkdownRenderer` port, `MarkedMarkdownRenderer` (marked v12 extensions: `[[Name]]`→`<a data-wiki>`, `#tag`→`<a data-tag>`), `RenderMarkdown`/`ParseWikiLinks`/`FindBacklinks`/`FindNotesByTag`/`ResolveLink` (case-insensitive)/`CreateNoteFromLink`; live preview (150ms debounce), wiki-link click→resolve/create, tag click→alert, backlinks panel |
| 9-10. `search` module | COMPLETE | `SearchResult`, `SearchNotes` (case-insensitive, content+name, regex-escaped query, snippet with `>>match<<` markers + ~40 char context, sorted by matchCount), `SearchIpcHandler`; renderer live search (200ms debounce), results clickable→openFile |
| 11. File explorer | COMPLETE | tree with expand/collapse (`[*]`/`[-]`/`[+]`), folder selection, Create button with auto-increment |

### Architectural audit fixes (applied)

1. **`NoteNameCollisionError`** domain error replaces generic `throw new Error()` in `FsNoteRepository.createNote` (was violating architecture.md:53)
2. **`Logger`** created in `shared/infrastructure/` — all silent catches now log with context:
   - `FsNoteRepository` (2 spots: readdirSync, statSync)
   - `JsonStateRepository` (load failure)
   - renderer `markDirty` uses `console.warn` (renderer cannot import from `shared/`)
3. **`Document` fields `readonly`** — `path` and `dirty` are now immutable; `InMemoryDocumentRepository` already used immutable re-creation pattern
4. **`AppConfig`** — `JsonStateRepository` no longer imports `electron`; `app.getPath('userData')` moved to `composition-root.ts`. State file path unchanged (existing user data preserved).

### Architectural corrections applied during scaffold (still valid)

1. **`marked` runs in MAIN process** (`knowledge` module infrastructure) — NOT in renderer; browser context cannot resolve bare `node_modules` imports without a bundler (forbidden). `knowledge:render` IPC channel reserved for MD->HTML rendering.

2. **ESM in renderer is FORBIDDEN.** `<script type="module">` does NOT work with `file://` protocol (Chromium blocks ESM via CORS on `file://`). Use plain `<script src="...">`. `tsconfig.renderer.json` emits CommonJS (`module: CommonJS` inherited from base) — no `export {}` in output. `env.d.ts` uses ambient declarations (no `export`/`import`).

3. **macOS Gatekeeper blocks unsigned/revoked Electron binaries.** `package.json` `postinstall`: `node node_modules/electron/install.js && xattr -r -d com.apple.quarantine node_modules/electron/dist/Electron.app 2>/dev/null; codesign --force --deep --sign - node_modules/electron/dist/Electron.app 2>/dev/null; true`

### Remaining work — two-phase plan

All core MVP features (vault, editor with tabs, knowledge graph, search) are COMPLETE.
The project now transitions from "dry prototype" to "usable product". The roadmap has
two phases: **Phase A (QoL)** first, then **Phase B (Visual)**.

#### Phase A — QoL (NEXT)

**A1. ChokidarFileWatcher (vault)**
- Domain: `WatchEvent` entity (`kind: 'add'|'change'|'unlink'|'rename'`, `path`, `oldPath?`); `FileWatcher` port (`start(root)`, `stop()`, `onChange(cb)`)
- Infrastructure: `ChokidarFileWatcher` (chokidar, ignore dotfiles, persistent). Rename = unlink+add within ~300ms buffered window. Logging via existing `Logger`.
- IPC: streaming push `event.reply('vault:note-changed', { kind, path, oldPath? })` — NO reqId (push, not request/response). Preload `api.vault.onNoteChanged(cb)`.
- Composition root: start watcher on `OpenVault` + restore on startup; stop on vault switch.
- Renderer behavior (decided):
  - `add`/`unlink`/`rename` → `loadExplorer()` (refresh tree)
  - `change` → if path is active tab → **auto-reload content** (overwrite textarea, NO confirm — unsaved changes lost per user decision)
  - `unlink` → if tab open → close it
  - `rename` → update `path` in `TabState` if open

**A2. Recent files (state)**
- Application (state): `AddRecentFile` (add to front, dedup, cap 10), `GetRecentFiles`
- Integration: `EditorIpcHandler.open-document` calls `AddRecentFile.execute(path)` after success
- New IPC channel `state:get-recent-files`
- Renderer: `<button id="recent-btn">Recent</button>` in `#vault-bar`; click → `getRecentFiles()` → toggle `<ul id="recent-list">` (visible/hidden via `hidden` attr); click item → `openFile(path)` + hide list; empty state "No recent files"
- Limit: 10 files (decided)

**A3. Verification**: `typecheck` + `build` + smoke (external file change → tree+tab reload; Recent button shows list)

#### Phase B — Visual (after A)

**B1. style.md already relaxed** (done in this commit): CSS allowed in single `styles.css`, Unicode icons allowed, ban kept on SVG/fonts/UI-libraries/frameworks.

**B2. CSS + Layout**
- Create `src/renderer/styles.css` (single file)
- 3-column layout (Obsidian-like):
  ```
  +----------------------------------------------------+
  | Top bar: vault-bar | search-bar                    |
  +----------+-----------------------+-----------------+
  | Sidebar  | Tabs                  | Preview         |
  | Explorer | +-------------------+ | (rendered MD)   |
  | Create   | | Editor (textarea) | |                 |
  | Refresh  | |                   | | Backlinks       |
  | Recent   | +-------------------+ |                 |
  | Tree     | doc-status           |                 |
  +----------+-----------------------+-----------------+
  ```
- Dark minimalist theme (dark bg, light text, one accent color)
- Unicode symbols as icons: `×` (close tab), `▸`/`▾` (folders), `●` (active), `⚑` (backlink)
- System monospace for editor, system sans-serif for UI

**B3. Update memory.md phase table + commit**

### Next action

**Phase A1 — ChokidarFileWatcher**. Implementation starts immediately (build mode active).
