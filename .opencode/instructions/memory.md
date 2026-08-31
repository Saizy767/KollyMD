# memory.md

Project memory for the KollyMD agent. Loaded into context via `opencode.json` `instructions`.
Keep this file as a single source of truth for project scope, decisions, and conventions
agreed with the user. Update it whenever a decision changes.

## 1. Project Overview

**KollyMD** is an Obsidian/Logseq-like local knowledge base built on Electron + TypeScript.
Page-based paradigm (one note = one document, NOT a block-based outliner).
The goal is functional correctness with a clean dark-minimalist presentation. The editor
uses CodeMirror 6 Live Preview (WYSIWYG inline rendering with raw-syntax reveal on cursor).

## 2. Tech Stack (Decided)

- **Runtime:** Electron
- **Language:** TypeScript (strict)
- **Renderer:** Vanilla TS (no React/Vue/Svelte), but uses external npm imports (`@codemirror/*`) bundled by Vite
- **Bundler:** **Vite** for renderer (ESM bundling, HMR in dev). Main process stays on `tsc` (CommonJS). No bundler for main/modules/shared.
- **Packager:** electron-builder
- **Editor:** **CodeMirror 6** (`codemirror`, `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@lezer/highlight`) — Live Preview via custom `Decoration.replace()` + `WidgetType` ViewPlugin
- **Markdown rendering:** **CodeMirror 6 decorations** (inline WYSIWYG). `marked` + the old `knowledge:render` IPC + `MarkedMarkdownRenderer` are **REMOVED** (Phase B2d complete).
- **File watcher:** `chokidar` (cross-platform, reliable) — not yet implemented (Phase A1)
- **State storage:** JSON file in `app.getPath('userData')`
- **Renderer imports:** The renderer MAY import `@codemirror/*` (bundled by Vite). It does NOT import `marked` (removed) or `chokidar` (main-only).

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
| Renderer dialogs | `alert()` / `confirm()` native; text input via single `#prompt-dialog` modal (`customPrompt()`) — Electron does not implement `window.prompt()` | style.md:21 |
| Active tab marker | `data-active="true"` attribute on `<li>` (no CSS, no visual prefix) | user choice |
| Close tab button | Text `<button>Close</button>` (no SVG/icon) | style.md:15 |
| Loading state | Button text → "Loading..." + `disabled` attribute | style.md:26 |
| Validation errors | Plain text next to field (e.g. `[Error: invalid format]`) | style.md:27 |
| Live preview | CodeMirror 6 Live Preview — `Decoration.replace()` + `WidgetType`, cursor-on-line reveals raw syntax | user choice (Obsidian-like) |
| Editor surface | `<div id="editor-host">` + CM6 `EditorView` (NOT textarea). No separate `#preview` div. | user choice |
| Bundler | **Vite** for renderer (HMR + ESM bundling). Main process stays on `tsc` (CJS). | user choice — relaxed from "no bundler" for CM6 |
| Markdown rendering | **CM6 decorations** (inline WYSIWYG). `marked` + `MarkedMarkdownRenderer` + `knowledge:render` IPC → REMOVED in Phase B2d. | replaces marked-based preview |
| Wiki-links in editor | CM6 inline clickable decorations (`<a data-wiki>`), always clickable regardless of cursor | user choice |
| Tags in editor | CM6 inline clickable decorations (`<a data-tag>`), always clickable | consistent with wiki-links |
| CSS policy | Allowed in single file `src/renderer/styles.css` (no `<style>`, no inline, no frameworks) | user choice — relaxed from zero-CSS after MVP prototype |
| Icons | Unicode symbols only (`×` `▸` `▾` `●` `⚑`); NO SVG/images/fonts | style.md |
| Layout target | 2-column (sidebar | editor). No separate preview pane — CM6 IS the preview. | changed from 3-column after CM6 decision |
| Theme | Dark minimalist (dark bg, light text, one accent) | Obsidian-like |
| UI libraries | BANNED (no Material/Radix/Headless, no Tailwind/Bootstrap) | style.md |
| Renderer stack | Vanilla TS (no React/Vue/Svelte) — stays. CM6 is a library, not a framework. | user choice |
| Native dialogs | Stays (alert/confirm native; prompt via single `#prompt-dialog` modal since Electron lacks `window.prompt()`) even after visual phase | user choice |

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
  `FindNotesByTag`, `ResolveLink`, `CreateNoteFromLink`
- **Infrastructure:** `KnowledgeIpcHandler`
- **Migration note:** `MarkedMarkdownRenderer` + `RenderMarkdown` use case + `knowledge:render` IPC channel are **REMOVED** (Phase B2d complete). `marked` dependency removed. Markdown rendering will be via CM6 Live Preview decorations (B2b, pending).
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
- `vault:note-changed` (streaming, no reqId — main pushes on watcher events) — Phase A1
- `editor:new`, `editor:save`, `editor:save-as`, `editor:close-document`, `editor:switch-document`,
  `editor:get-open-documents`, `editor:mark-dirty`, `editor:get-open-tabs`
- `knowledge:find-backlinks`, `knowledge:find-notes-by-tag`,
  `knowledge:resolve-link`, `knowledge:create-note-from-link`
- `knowledge:render` — **REMOVED** (Phase B2d complete)
- `search:search-notes`
- `state:load`, `state:save`, `state:get-recent-files` — Phase A2

### Error handling in IPC handlers
1. Catch domain error from use case
2. Show via `dialog.showMessageBox` (main process)
3. Reply to renderer with `{ reqId, error: true }` (no error text leaked to renderer UI)

## 7. Renderer Layout (vanilla TS + Vite + CodeMirror 6)

`src/renderer/index.html` — semantic skeleton, links `styles.css`:
```
<aside id="sidebar"> vault-bar + search-bar + explorer + search-results </aside>
<main id="main"> tabs + editor-bar + <div id="editor-host"> + backlinks </main>
```

**NOT a `<textarea>`** — `#editor-host` is a container for CodeMirror 6 `EditorView`.

`src/renderer/renderer.ts` — Vite entry (ESM, bundled). Wires CM6 + DOM events.

`src/renderer/editor/` — CM6 modules:
- `cm-setup.ts` — `EditorState.create()` + `EditorView` config (markdown lang, dark theme, line wrapping, updateListener for dirty tracking)
- `live-preview.ts` — `ViewPlugin.fromClass()` with `buildDecorations(view)`: walks Lezer markdown tree, applies `Decoration.replace()` + `WidgetType` for heading/bold/italic/code/link/list/quote/hr. Cursor-on-line → skip decoration (raw syntax visible).
- `wiki-decorations.ts` — separate `ViewPlugin`: regex scan for `[[Name]]` and `#tag`, `Decoration.replace()` with clickable `<a data-wiki>` / `<a data-tag>` widgets. Always active (not cursor-dependent).

**No `#preview` div.** The old `marked`-based preview pipeline (`renderPreview()`, `schedulePreview()`, `knowledge:render` IPC) is removed in Phase B2d.

- Wiki-link clicks (`a[data-wiki]`) → DOM event delegation on `#editor-host` → `knowledge:resolve-link` → if null, `confirm("Create note 'Name'?")` → `create-note-from-link`.
- Tag clicks (`a[data-tag]`) → `knowledge:find-notes-by-tag` → `alert` with note list.
- Active tab: `li[data-active="true"]`.
- Close tab: `<button>×</button>` (Unicode, not SVG).
- Tab switching: CM6 content → `view.state.doc.toString()` saved to `TabState.content`; load → `view.dispatch({ changes: { from: 0, to, insert: newContent } })`.
- Save: read content from `view.state.doc.toString()`.

## 8. Physical Project Structure

```
KollyMD/
├── package.json
├── vite.config.ts              # Vite config for renderer bundling
├── tsconfig.json / tsconfig.main.json / tsconfig.renderer.json
├── electron-builder.yml
└── src/
    ├── composition-root.ts     # manual DI assembly (compiled by tsc, NOT Vite)
    ├── main/
    │   ├── main.ts             # Electron entry, BrowserWindow
    │   └── preload.ts          # contextBridge → window.api
    ├── modules/
    │   ├── vault/{domain,application,infrastructure}/ + index.ts
    │   ├── editor/{...}/ + index.ts
    │   ├── knowledge/{...}/ + index.ts
    │   ├── search/{...}/ + index.ts
    │   └── state/{...}/ + index.ts
    ├── renderer/
    │   ├── index.html          # semantic HTML, links styles.css
    │   ├── renderer.ts         # Vite entry, wires CM6 + DOM events
    │   ├── editor/             # CodeMirror 6 setup + Live Preview decorations
    │   │   ├── cm-setup.ts     # EditorState + EditorView configuration
    │   │   ├── live-preview.ts # ViewPlugin with Decoration.replace() + WidgetType
    │   │   └── wiki-decorations.ts  # [[wiki-link]] and #tag inline decorations
    │   ├── styles.css          # single CSS surface (dark minimalist)
    │   └── env.d.ts            # ambient type declarations
    └── shared/
        ├── domain/errors/      # DomainError base + specific errors
        └── infrastructure/     # Logger, AppConfig
```

## 9. Implementation Phases

### Completed (Phases 1-11)
1. **Scaffold:** `package.json`, `tsconfig.*`, `electron-builder.yml`, `src/main/main.ts`, `preload.ts`, `composition-root.ts`
2. **`shared/`:** `DomainError`, `Logger`, `AppConfig`
3. **`state` module** + IPC + JSON repository
4. **`vault` module** (partial): domain → application → `FsNoteRepository` + IPC (ChokidarFileWatcher pending)
5. **`editor` module** + IPC (multi-doc tabs, persist+restore)
6. **Renderer v1:** tabs, save/open/saveas/new
7-8. **`knowledge` module:** wiki-links, backlinks, tags, live preview (marked-based, to be replaced)
9-10. **`search` module** + IPC + renderer live search
11. **File explorer** + Create button + sidebar layout + `styles.css` (dark minimalist)

### Phase A — QoL (NEXT, before visual)

**A1. ChokidarFileWatcher (vault)** — auto-reload on disk changes
**A2. Recent files (state)** — use cases + UI (button + toggle list, limit 10)
**A3. Verification + commit**

### Phase B — Visual: CodeMirror 6 Live Preview (decomposed)

**B2a. Vite migration + CM6 basic setup** — COMPLETE
- Install: `vite`, `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/lang-markdown`, `@lezer/highlight`
- `vite.config.ts` — renderer bundling, dev server `localhost:5173`, output `dist/renderer/`
- `package.json` scripts: `dev` (vite dev + electron), `build` (tsc main + vite build renderer)
- `main.ts`: dev → `loadURL('http://localhost:5173')`, prod → `loadFile('dist/renderer/index.html')`
- `src/renderer/editor/cm-setup.ts`: `EditorState.create()` + `EditorView` (markdown lang, dark theme, line wrapping, `updateListener` for dirty tracking)
- Replaced `<textarea id="editor">` with `<div id="editor-host">` + CM6 instance
- Integrated with existing: open/save/tabs — content via `view.state.doc.toString()` / `view.dispatch()`
- `styles.css`: CM6 dark theme (`.cm-editor`, `.cm-content`)
- **Checkpoint:** CM6 works, markdown syntax highlighting, save/open/tabs functional.

**B2b. Live Preview decorations (WYSIWYG)** — COMPLETE
- `src/renderer/editor/live-preview.ts`: `ViewPlugin.fromClass()` with `buildDecorations(view)`
- Walk Lezer markdown tree (from `@codemirror/lang-markdown` syntax tree)
- Applies `Decoration.mark()` with class + `Decoration.replace()` for syntax hiding + `WidgetType` for HR
  - Heading → `.cm-h1`-`.cm-h6` (font-size scaling)
  - StrongEmphasis → `.cm-strong`; Emphasis → `.cm-em`
  - InlineCode → `.cm-code-inline`; FencedCode/CodeBlock → `.cm-code-block`
  - Blockquote → `.cm-blockquote`; Link → `.cm-link`
  - HR → `<hr>` widget (`.cm-hr-widget`)
  - HeaderMark/EmphasisMark/CodeMark/LinkMark/QuoteMark/URL/LinkLabel → hidden (`Decoration.replace()`)
- **Cursor reveal logic:** if selection (cursor) intersects the node's line range → skip decoration (raw syntax visible); otherwise apply decorations
- `DecorationSet` updated on `docChanged`, `selectionSet`, `viewportChanged`
- `styles.css`: widget styles (`.cm-h1`, `.cm-strong`, etc.)
- **Checkpoint:** markdown renders inline, cursor on line reveals raw syntax.

**B2c. Wiki-link/tag inline decorations** — COMPLETE
- `src/renderer/editor/wiki-decorations.ts`: separate `ViewPlugin`
- Regex scan for `[[Name]]` and `#tag` (on each viewport update)
- `Decoration.replace()` with `WidgetType`:
  - Wiki-link → `<a data-wiki="Name" class="cm-wikilink">Name</a>`
  - Tag → `<a data-tag="name" class="cm-tag">#name</a>`
- Cursor-dependent (hidden when cursor on the line, rendered otherwise)
- DOM event delegation on `#editor-host`: click `a[data-wiki]` → `handleWikiLinkClick`; click `a[data-tag]` → `handleTagClick`
- `styles.css`: `.cm-wikilink`, `.cm-tag` accent color styling
- **Checkpoint:** `[[Name]]` and `#tag` clickable directly in editor.

**B2d. Integration + cleanup** — COMPLETE
- Removed `<div id="preview">`, `<span id="preview-status">` from HTML
- Removed `renderPreview()`, `schedulePreview()` + all calls + preview click listener + `handleWikiLinkClick`/`handleTagClick` (will be re-wired in B2c via CM6 decorations) from renderer
- Removed `MarkedMarkdownRenderer`, `RenderMarkdown` use case, `MarkdownRenderer` port from knowledge module (files deleted)
- Removed `knowledge:render` IPC channel + handler + preload method
- Removed `marked` from dependencies
- Updated `env.d.ts`: removed `knowledge.render`
- Updated `styles.css`: removed `#preview` / `#preview-status` styles
- Verified: backlinks panel still works (separate from editor), save/open/tabs work, typecheck + build pass
- **Checkpoint:** no preview pane, marked pipeline fully removed. Editor is still a `<textarea>` until B2a (CM6 basic). Wiki-link/tag clicks are temporarily unavailable (return in B2c).

**B2e. Update memory.md + style.md + architecture.md**
- Finalize phase table, update compliance checklist, commit

### Phase B3 — Layout polish (after B2)
- Fine-tune `styles.css`: sidebar, tabs, editor, backlinks proportions
- Unicode icons throughout: `×` (close tab), `▸`/`▾` (folders), `●` (active), `⚑` (backlink)
- Responsive considerations (min widths, overflow)

## 10. Compliance Checklist (run before each commit)

- CSS only in `src/renderer/styles.css` — NO `<style>` tags, NO inline `style=`
- No SVG / PNG / JPG / icon fonts / `@font-face` (Unicode symbols ARE allowed)
- No UI component libraries or CSS frameworks (Tailwind, Bootstrap, Material, Radix, etc.)
- No `import` of `fs`/`path`/`electron`/`chokidar` in `domain/` or `application/` (renderer MAY import `@codemirror/*` — bundled by Vite)
- `marked` REMOVED (Phase B2d complete) — do not re-introduce `marked` usage. Markdown rendering is now CM6 decorations (B2b, pending).
- No direct import into a module's internals (must go through `index.ts`)
- All domain errors extend `DomainError` (no `throw new Error(...)` for domain problems)
- All user-facing errors via `dialog` (main) or `alert`/`confirm` (renderer); text input via `#prompt-dialog` (`customPrompt()`)
- No silent error swallowing
- No DI container / no decorators for injection
- Each module exposes exactly one `index.ts`
- `composition-root.ts` is in `src/`, not `src/main/`
- Main process: `tsc` (CJS). Renderer: `vite build` (ESM bundled). Do not mix.

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

### Architectural corrections applied during scaffold (historical — some superseded)

1. **`marked` was moved to MAIN process** (historical). NOW DEPRECATED — Phase B2d removes `marked` entirely, replacing it with CM6 Live Preview decorations in the renderer (bundled by Vite).

2. **ESM in renderer was FORBIDDEN** (historical, `file://` CORS limitation). NOW SUPERSEDED — Vite bundles the renderer into a single JS file, loaded via `<script>` (no `file://` ESM issue). `tsconfig.renderer.json` will switch to ESM (`module: ES2020`) during Phase B2a.

3. **macOS Gatekeeper blocks unsigned/revoked Electron binaries.** `package.json` `postinstall`: `node node_modules/electron/install.js && xattr -r -d com.apple.quarantine node_modules/electron/dist/Electron.app 2>/dev/null; codesign --force --deep --sign - node_modules/electron/dist/Electron.app 2>/dev/null; true`

### Remaining work — decomposed roadmap

All core MVP features (vault, editor with tabs, knowledge graph, search) are COMPLETE.
Sidebar layout + dark minimalist CSS are DONE. The project now transitions to
**CodeMirror 6 Live Preview** as the unified editor surface.

#### Phase A — QoL (NEXT, before CM6 migration)

| Task | Status | Details |
|---|---|---|
| A1. ChokidarFileWatcher | TODO | `WatchEvent` entity, `FileWatcher` port, `ChokidarFileWatcher` impl; streaming IPC `vault:note-changed`; renderer: refresh tree on add/unlink/rename, auto-reload active tab on change, close tab on unlink |
| A2. Recent files | TODO | `AddRecentFile`/`GetRecentFiles` use cases (cap 10, dedup); `<button id="recent-btn">` + toggle `<ul>` in sidebar; `open-document` calls `AddRecentFile` |
| A3. Verification | TODO | typecheck + build + smoke test |

#### Phase B — CodeMirror 6 Live Preview (after Phase A)

| Task | Status | Details |
|---|---|---|
| B2a. Vite migration + CM6 basic | COMPLETE | Vite + `@codemirror/*` installed; `vite.config.ts`; `dev`/`build` scripts; `main.ts` dev/prod URL switching; `editor/cm-setup.ts`; replaced textarea with `#editor-host` + CM6; integrated open/save/tabs; CM6 dark theme in styles.css |
| B2b. Live Preview decorations | COMPLETE | `editor/live-preview.ts` ViewPlugin; Lezer tree walk; `Decoration.mark()` + `Decoration.replace()` + `WidgetType` for heading/bold/italic/code/blockquote/link/hr; cursor-on-line reveals raw syntax |
| B2c. Wiki-link/tag decorations | COMPLETE | `editor/wiki-decorations.ts` ViewPlugin; regex `[[Name]]` + `#tag`; clickable `<a data-wiki>`/`<a data-tag>` widgets; cursor-dependent; DOM event delegation → `handleWikiLinkClick`/`handleTagClick` |
| B2d. Integration + cleanup | COMPLETE | Removed `#preview` div + `preview-status`; removed `renderPreview`/`schedulePreview`; removed `MarkedMarkdownRenderer`/`RenderMarkdown`/`MarkdownRenderer`/`knowledge:render` IPC; removed `marked` dependency; updated env.d.ts + styles.css. |
| B2e. Docs update | COMPLETE | memory.md phase table + compliance checklist updated. |

#### Phase B3 — Layout polish (after B2)
- Fine-tune styles.css proportions, Unicode icons throughout, responsive min-widths

### Next action

**Phase A1 — ChokidarFileWatcher**. Then A2 (Recent files). Then Phase B2a (Vite + CM6 basic).
Decision pending user confirmation to start.
