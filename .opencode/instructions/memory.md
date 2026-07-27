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

- No CSS file / `<style>` / `style=` anywhere
- No SVG / PNG / icon / custom font
- No `import` of `fs`/`path`/`electron`/`marked`/`chokidar` in `domain/` or `application/`
- No direct import into a module's internals (must go through `index.ts`)
- All domain errors extend `DomainError` (no `throw new Error(...)` for domain problems)
- All user-facing errors via `dialog` (main) or `alert`/`confirm`/`prompt` (renderer)
- No silent error swallowing
- No DI container / no decorators for injection
- Each module exposes exactly one `index.ts`
- `composition-root.ts` is in `src/`, not `src/main/`

## 11. Current Status

**Phase 1 (scaffold) — COMPLETE.** `npm start` launches an Electron window that loads
`dist/renderer/index.html`; renderer script executes (`KollyMD renderer ready` logged via
`webContents.on('console-message')`). Verified end-to-end on macOS arm64.

Scaffold files in place: `package.json`, three `tsconfig*.json`, `electron-builder.yml`,
`.gitignore`, `src/main/main.ts` (with `did-fail-load` / `console-message` / `render-process-gone`
diagnostics), `src/main/preload.ts` (empty `contextBridge` api), `src/composition-root.ts`
(empty `bootstrap(ipcMain)`), `src/renderer/{index.html,renderer.ts,env.d.ts}`.

**Architectural corrections applied during scaffold:**

1. **`marked` moved from renderer -> main** (`knowledge` module infrastructure). The renderer
   is a pure DOM+IPC layer with zero external imports, because the browser context cannot
   resolve bare `node_modules` specifiers without a bundler (forbidden). `knowledge:render`
   IPC channel added to the contract for MD->HTML rendering.

2. **ESM in renderer is FORBIDDEN.** `<script type="module">` does NOT work with `file://`
   protocol (Chromium blocks ESM via CORS on `file://`). Use plain `<script src="...">`.
   Implication: renderer code cannot use `import`/`export`; multi-file renderer must use
   global namespace pattern or IIFE concatenation (NOT ESM modules). `tsconfig.renderer.json`
   still emits CommonJS-wrapped output (`"use strict"` + globals) — acceptable.

3. **macOS Gatekeeper blocks unsigned/revoked Electron binaries.** The downloaded Electron
   zip carries `com.apple.quarantine`; on first launch Gatekeeper moves the app to Bin as
   "malware". Fix in `package.json` `postinstall`: after `install.js`, run
   `xattr -r -d com.apple.quarantine node_modules/electron/dist/Electron.app` then
   `codesign --force --deep --sign - node_modules/electron/dist/Electron.app`. Without this,
   `npm start` fails with `ENOENT` (binary silently deleted) or a malware dialog.

**Next action:** Phase 2 — `shared/` (`DomainError`, `Logger`, `AppConfig`).
