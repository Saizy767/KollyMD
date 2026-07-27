# style.md

## Core Philosophy
The primary focus of KollyMD development is the backend and internal logic. The frontend (Electron renderer) exists solely to provide basic functionality. 
The AI must completely ignore any tasks related to improving UI/UX, design, or creating a "beautiful wrapper". The absolute priority is dry, working functionality.

## Strict UI Rules

### 1. Zero Styling
- Do not write any CSS (including external files, `<style>` tags, and inline styles).
- Do not use CSS frameworks or utility classes (Tailwind, Bootstrap, etc.).
- Keep HTML markup as "dry", semantic, and unstyled as possible.

### 2. Ban on Visual Assets
- Strictly prohibit the use of icons, images, SVG graphics, and custom fonts.
- Use only plain text and basic unstyled HTML elements to display data (e.g., standard `<table>`, `<ul>`, `<li>`, `<button>`, `<input>`).

### 3. Native Dialogs (Electron Specifics)
- Use **exclusively** native OS system dialogs to display errors, notifications, and confirmation requests.
- In the main process: use the `dialog` module from `electron`.
- In the renderer process: use standard browser `alert()`, `confirm()`, and `prompt()`.
- **Strictly prohibit** creating any custom modals, toasts, snackbars, or notification panels inside the HTML.

### 4. Text-Based Feedback (States)
Since visual indicators are prohibited, system states and form states must be displayed using only text and basic HTML attributes:
- **Loading state:** Change the button text to "Loading..." and add the `disabled` attribute. No spinners or animations.
- **Validation errors:** Output plain text (e.g., `[Error: invalid format]`) directly next to the corresponding input field. No red borders or field highlighting.

## What the AI Must NOT Do (Anti-patterns)
- Attempt to "polish" the interface by adding margins, border-radius, or shadows.
- Suggest using UI component libraries (e.g., Material UI, Radix, Headless UI).
- Create custom dropdowns, selects, or modals instead of using native HTML/OS solutions.
- Waste tokens or time generating CSS code.