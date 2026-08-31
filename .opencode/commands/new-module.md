---
description: Scaffolds a new bounded context module with the 3-layer Clean Architecture structure.
agent: build
---

Run `node scripts/new-module.mjs $ARGUMENTS` to create the module skeleton.

Usage: `node scripts/new-module.mjs <name> [--ipc] [--repo]`

- `<name>` — module name in kebab-case (e.g. `tags`, `note-graph`)
- `--ipc` — create IPC handler skeleton
- `--repo` — create repository interface + Fs implementation skeleton

After creation:
1. Run `npm run lint:encapsulation` to verify the module boundary.
2. Remind the user to wire the module in `src/composition-root.ts` when adding use cases and IPC handlers.
