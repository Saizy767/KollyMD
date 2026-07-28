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

### 2. Visual Assets — text and Unicode only
- NO SVG, NO images (PNG/JPG/etc.), NO custom fonts (`@font-face`, web fonts).
- Use plain text and basic unstyled HTML elements to display data (standard `<table>`, `<ul>`, `<li>`, `<button>`, `<input>`).
- Unicode symbols ARE allowed as lightweight icons: `×` (close), `▸`/`▾` (expand/collapse), `●` (active marker), `⚑` (backlink/flag), etc. Do not use them as decorative emoji elsewhere.

### 3. Native Dialogs (Electron)
- Use **exclusively** native OS / browser dialogs to display errors, notifications, and confirmation requests.
- In the main process: use the `dialog` module from `electron`.
- In the renderer process: use standard browser `alert()`, `confirm()`, and `prompt()`.
- **Strictly prohibit** creating any custom modals, toasts, snackbars, or notification panels inside the HTML.

### 4. Text-Based Feedback (States)
System and form states are shown with text plus the basic `disabled`/`hidden` attributes — no spinners, no color-coded badges:
- **Loading state:** Change button text to "Loading..." (or "Searching...", "Creating...") and add the `disabled` attribute. No spinners or animations.
- **Validation errors:** Output plain text (e.g. `[Error: invalid format]`) directly next to the corresponding input field. No red borders or field highlighting.
- **Active tab:** `data-active="true"` attribute on `<li>` (CSS may style it) — keep the attribute for semantic clarity.

## Target Aesthetic
- **Theme:** Dark minimalist (Obsidian-like). Dark background, light text, one accent color.
- **Layout:** 3-column (sidebar | editor | preview). Top bar holds vault controls and search.
- **Typography:** System monospace for editor, system sans-serif for UI. No custom fonts loaded.

## What the AI Must NOT Do (Anti-patterns)
- Add a second CSS file or split styles across files — everything lives in `src/renderer/styles.css`.
- Use `<style>` tags or inline `style=` attributes anywhere.
- Suggest using UI component libraries (e.g., Material UI, Radix, Headless UI) or CSS frameworks (Tailwind, Bootstrap).
- Use SVG, PNG, JPG, icon fonts, or `@font-face`.
- Create custom dropdowns, selects, or modals instead of using native HTML/OS solutions.
- Waste tokens or time generating elaborate CSS animations, glassmorphism, or decorative effects.
