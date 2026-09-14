# KollyMD

Local Obsidian/Logseq-like knowledge base built on Electron + TypeScript.
Page-based paradigm: one note = one document. Focus is on dry, working functionality,
not UI polish.

## Tech Stack

- **Runtime:** Electron 31
- **Language:** TypeScript (strict)
- **Renderer:** Vanilla TS, no framework, bundled by Vite
- **Bundler:** Vite (renderer + dev server with HMR); `tsc` for main process (CommonJS)
- **Packager:** electron-builder
- **Editor:** CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`) — Live Preview via custom decorations
- **Math rendering:** KaTeX
- **File watcher:** `chokidar`
- **State storage:** JSON in `app.getPath('userData')`

## MVP Scope

- Hybrid storage: open a folder as a vault OR a single file
- Tabs (multiple documents in one window)
- File ops: New / Save / Save As / Auto-reload on disk changes / Recent files
- `[[wiki-links]]` with flat resolution (by filename)
- Backlinks (on-demand scan of vault)
- Auto-create note on click of a non-existent `[[link]]`
- Tags `#tag` + listing notes by tag
- File explorer (plain text list, no icons)
- Global full-text search
- Persistent state: recent files, open tabs, last vault

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

> Note: if the Electron postinstall script fails to write `path.txt`, run
> `node node_modules/electron/install.js` manually, or unzip the cached
> `electron-v*-*-*.zip` from `~/Library/Caches/electron/` into
> `node_modules/electron/dist/` and write
> `Electron.app/Contents/MacOS/Electron` (no trailing newline) to
> `node_modules/electron/path.txt`.

### Scripts

| Command             | Action                                                  |
| ------------------- | ------------------------------------------------------- |
| `npm run typecheck` | `tsc --noEmit` for both main and renderer configs       |
| `npm run lint:arch` | Architecture lint: use-case deps, encapsulation, domain purity |
| `npm run lint:style`| Style lint: CSS surface, assets, deps                   |
| `npm run build`     | Compile main + Vite build renderer                      |
| `npm run dev`       | Dev mode: tsc watch + Vite dev server + Electron        |
| `npm start`         | Build and launch Electron in production mode            |
| `npm run dist`      | Build and package a distributable via electron-builder  |

## Download & Install

Prebuilt binaries are published on the [Releases page](https://github.com/Saizy767/KollyMD/releases).

### Linux

1. Download `KollyMD-<version>.AppImage`.
2. Make it executable: `chmod +x KollyMD-<version>.AppImage`.
3. Run it (double-click or `./KollyMD-<version>.AppImage`).

Auto-update is enabled: the app checks GitHub Releases on startup and updates
itself when a newer version is available.

### macOS

1. Download `KollyMD-<version>.dmg`.
2. Open the `.dmg` and drag `KollyMD.app` into `/Applications`.
3. Clear the Gatekeeper quarantine flag (the app is unsigned):
   ```bash
   xattr -cr /Applications/KollyMD.app
   ```
4. Launch `KollyMD.app`.

Auto-update is **not** available on macOS (requires code signing + notarization).
To update, download the new `.dmg` from Releases and repeat the steps above.

## Architecture

KollyMD follows Clean Architecture with a strict modular structure. Every feature
module is split into three layers with one-way dependencies:
`domain` -> `application` -> `infrastructure`.

- **domain** — pure business logic, no Node/Electron/library imports
- **application** — use cases, depends only on domain interfaces
- **infrastructure** — adapters, IPC handlers, fs/electron/marked/chokidar

Dependencies are assembled manually in `src/composition-root.ts` (no DI container).
Each module exposes exactly one public entry point: `index.ts`.

### Modules (bounded contexts)

| Module       | Responsibility                                            |
| ------------ | --------------------------------------------------------- |
| `vault`      | Filesystem access: read/write/list notes, file watcher    |
| `editor`     | Editing session: documents, tabs, dirty state             |
| `knowledge`  | Link graph: wiki-links, backlinks, tags, MD rendering     |
| `search`     | Full-text search across vault                             |
| `state`      | Workspace persistence (recent files, open tabs, last vault) |

### IPC

All channels use `ipcMain.on` + `event.reply` with a `reqId` for request/response
correlation. The preload layer (`src/main/preload.ts`) exposes a typed `window.api`
via `contextBridge`. Domain errors thrown in use cases are caught in IPC handlers
and shown via native `dialog` (main) or `alert`/`confirm`/`prompt` (renderer).

## Project Structure

```
KollyMD/
├── package.json
├── vite.config.ts              # Vite config for renderer bundling
├── tsconfig.json               # base config
├── tsconfig.main.json          # CJS, node types, includes main/modules/shared
├── tsconfig.renderer.json      # ESM, DOM lib, includes renderer only
├── electron-builder.yml
└── src/
    ├── composition-root.ts     # manual DI assembly
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
    │   ├── index.html          # semantic HTML, links styles/index.css
    │   ├── renderer.ts         # Vite entry, DI wiring for regions
    │   ├── state.ts            # shared app state (getters/setters)
    │   ├── env.d.ts            # ambient type declarations
    │   ├── assets/             # SVG icons (folder arrows)
    │   ├── editor/             # CodeMirror 6 setup + decorations
    │   │   ├── cm-setup.ts
    │   │   ├── live-preview.ts
    │   │   ├── wiki-decorations.ts
    │   │   └── math-decorations.ts
    │   ├── regions/            # UI regions (one file per region)
    │   │   ├── command-bar.ts
    │   │   ├── editor.ts
    │   │   ├── explorer.ts
    │   │   ├── explorer-watch.ts
    │   │   ├── sidebar.ts
    │   │   └── tabs.ts
    │   ├── styles/             # modular CSS (one file per region)
    │   │   ├── index.css       # @import entry point
    │   │   ├── base.css
    │   │   ├── buttons.css
    │   │   ├── sidebar.css
    │   │   ├── command-bar.css
    │   │   ├── explorer.css
    │   │   ├── tabs.css
    │   │   ├── editor.css
    │   │   └── prompt.css
    │   ├── ui/
    │   │   └── prompt-dialog.ts
    │   └── utils/
    │       └── path.ts
    └── shared/
        ├── domain/errors/      # DomainError base + specific errors
        └── infrastructure/     # Logger, AppConfig
```

## UI Constraints

Per `.opencode/instructions/style.md`:

- Minimalist UI: Vanilla CSS with modular structure (`src/renderer/styles/`), limited SVG assets for basic navigation only. No heavy UI frameworks (Tailwind, Bootstrap) or inline styles.
- Native OS dialogs only: `dialog` module in main, `alert`/`confirm`/`prompt` in renderer
- Loading state: button text -> "Loading..." + `disabled`
- Validation errors: plain text next to the field
- Active tab marked via `data-active="true"` attribute

## Status

Phase 1 (scaffold) is complete. The app boots: `tsc` compiles both configs cleanly,
Electron launches and loads the renderer. No feature modules are implemented yet.

See `.opencode/instructions/memory.md` for the full project memory and implementation
roadmap.
