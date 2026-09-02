# style.md

## Core Philosophy
The primary focus of KollyMD is functional correctness. The frontend (Electron renderer) exists to provide usable access to the backend logic, with a clean dark-minimalist presentation that does not get in the way. Visual polish is permitted within the constraints below, but it is never the priority — dry, working functionality always wins.

## UI Rules

### 1. CSS — allowed, single file, vanilla only
- Write CSS in exactly one external file: `src/renderer/styles.css`.
- NO `<style>` tags in HTML, NO inline `style=` attributes in markup or generated DOM.
- NO CSS frameworks or utility classes (Tailwind, Bootstrap, etc.).
- NO CSS-in-JS, NO preprocessors, NO PostCSS.
- Allowed: flexbox/grid layouts, margins/padding, colors, border-radius, basic transitions. Keep it minimal and semantic.
- The single `styles.css` is the ONLY allowed CSS surface; everything else stays unstyled semantic HTML.

### 2. Visual Assets — text, Unicode, and SVG icons
- SVG icons ARE allowed as lightweight UI icons (e.g. folder expand/collapse arrows). SVG icon files live in `src/renderer/assets/` and are imported via Vite (`import url from './assets/*.svg'`). Recolor SVG `fill` to match the theme (e.g. `#d4d4d4`); do NOT use `currentColor` with `<img>`.
- NO raster images (PNG/JPG/etc.), NO custom fonts (`@font-face`, web fonts).
- Use plain text and basic unstyled HTML elements to display data (standard `<table>`, `<ul>`, `<li>`, `<button>`, `<input>`).
- Unicode symbols ARE also allowed as lightweight icons: `×` (close), `●` (active marker), `⚑` (backlink/flag), etc. Do not use them as decorative emoji elsewhere.

### 3. Native Dialogs (Electron)
- Use **exclusively** native OS / browser dialogs to display errors, notifications, and confirmation requests.
- In the main process: use the `dialog` module from `electron`.
- In the renderer process: use standard browser `alert()` and `confirm()`. For text input use the single designated `#prompt-dialog` modal (`customPrompt()`), because Electron does not implement `window.prompt()`.
- **Strictly prohibit** creating any custom modals, toasts, snackbars, or notification panels inside the HTML, **except** the single `#prompt-dialog` input dialog.

### 4. Text-Based Feedback (States)
System and form states are shown with text plus the basic `disabled`/`hidden` attributes — no spinners, no color-coded badges:
- **Loading state:** Change button text to "Loading..." (or "Searching...", "Creating...") and add the `disabled` attribute. No spinners or animations.
- **Validation errors:** Output plain text (e.g. `[Error: invalid format]`) directly next to the corresponding input field. No red borders or field highlighting.
- **Active tab:** `data-active="true"` attribute on `<li>` (CSS may style it) — keep the attribute for semantic clarity.

## Target Aesthetic
- **Theme:** Dark minimalist (Obsidian-like). Dark background, light text, one accent color.
- **Layout:** 2-column (sidebar | editor). Sidebar holds vault controls, search, and file tree. Editor is a single unified surface (CodeMirror 6 Live Preview) — no separate preview pane.
- **Typography:** System sans-serif for UI. Editor uses CodeMirror 6 with system monospace fallback; no custom fonts loaded.

## 5. Editor Surface — CodeMirror 6 Live Preview
- The editor is a **single unified surface** built on CodeMirror 6 (`<div id="editor-host">`, NOT a `<textarea>`).
- **Live Preview mode:** markdown is rendered inline via CM6 decorations (`Decoration.replace()` + `WidgetType`). When the text cursor is on a line, that line reveals raw markdown syntax; all other lines show rendered output. This mirrors Obsidian's Live Preview.
- `[[wiki-links]]` and `#tags` are rendered as **inline clickable decorations** (`<a data-wiki>` / `<a data-tag>`) directly in the editor — always clickable, regardless of cursor position.
- There is **no separate preview pane**. The old `#preview` div and the `marked`-based rendering pipeline are removed.
- CM6 is bundled via Vite (see `architecture.md` Build Pipeline). The renderer is no longer "zero external imports" — it imports `@codemirror/*` packages, bundled by Vite.
- Styling for CM6 (`.cm-editor`, `.cm-content`, widget classes) lives in `src/renderer/styles.css` alongside the rest of the UI.

## What the AI Must NOT Do (Anti-patterns)
- Add a second CSS file or split styles across files — everything lives in `src/renderer/styles.css`.
- Use `<style>` tags or inline `style=` attributes anywhere.
- Suggest using UI component libraries (e.g., Material UI, Radix, Headless UI) or CSS frameworks (Tailwind, Bootstrap).
- Use PNG, JPG, icon fonts, or `@font-face`. (SVG icons in `src/renderer/assets/` ARE allowed — see section 2.)
- Create custom dropdowns, selects, or modals instead of using native HTML/OS solutions.
- Waste tokens or time generating elaborate CSS animations, glassmorphism, or decorative effects.
