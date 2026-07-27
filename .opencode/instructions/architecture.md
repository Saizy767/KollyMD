# architecture.md

## Core Philosophy
KollyMD follows **Clean Architecture** principles with a strict modular structure. The primary goal is to protect the codebase from AI-generated "spaghetti" by enforcing clear boundaries, contracts, and dependency directions. 

What may seem like overkill today becomes the standard that saves us tomorrow — when AI generates dozens of modules, we must guarantee it doesn't break existing logic.

## Architectural Layers

Every feature module MUST be organized into exactly three layers with strict dependency direction: `domain` → `application` → `infrastructure`.

### 1. Domain Layer (`domain/`)
- **Pure business logic.** Zero dependencies on frameworks, libraries, OS, or Electron.
- Contains: entities, value objects, domain errors, repository/service interfaces (ports).
- Must be 100% testable in isolation.
- **Rule:** If you can import `fs`, `electron`, `path`, or any external library here — you've broken the layer.

### 2. Application Layer (`application/`)
- **Use cases (scenarios).** Orchestrates domain logic to fulfill a specific user request.
- Contains: use-case classes/functions, DTOs (input/output contracts).
- Depends ONLY on `domain` interfaces (ports). Knows NOTHING about implementation details.
- **Critical rule:** `application` knows NOTHING about Electron, `ipcMain`, `BrowserWindow`, or events. It operates purely in terms of domain concepts.

### 3. Infrastructure Layer (`infrastructure/`)
- **Adapters and drivers.** Implements domain interfaces and bridges the pure core with the outside world.
- Contains: repository implementations, IPC handlers, external service adapters, file system access, database clients.
- Handles ALL translation between Electron/IPC protocols and clean TypeScript objects (DTOs).
- Catches domain exceptions from `application` and translates them into native Electron dialogs (per `style.md`).

## Dependency Injection

We use a **manual Composition Root** pattern. NO DI containers (Inversify, TSyringe, etc.).

- All dependencies are assembled manually in `src/composition-root.ts` at application startup.
- Use simple factory functions to construct dependencies.
- Pass dependencies explicitly through constructors or factory parameters.
- **Why:** This keeps the code "dry", transparent, and free of magic decorators or hidden wiring.

## Module Contract

Each module MUST expose exactly ONE public entry point: `index.ts`.

- All internal files (`domain/`, `application/`, `infrastructure/`) are private implementation details.
- Other modules and the composition root import ONLY from `modules/{feature}/index.ts`.
- **Rule:** Direct imports like `import { SomeInternalClass } from '../modules/user/domain/entities/user'` are strictly prohibited.

## Error Handling

Use **throw/catch** with custom domain exceptions.

- Define domain-specific error classes in `domain/errors/` (e.g., `ValidationError`, `NotFoundError`, `BusinessRuleViolationError`).
- Use cases throw these errors; infrastructure catches them and translates to user-facing messages (via native Electron dialogs).
- **Rule:** Never catch and silently swallow errors. Never use generic `Error` for domain problems — always use specific domain error types.

## Physical Project Structure
src/
├── modules/
│ ├── {feature-name}/
│ │ ├── domain/
│ │ │ ├── entities/
│ │ │ ├── value-objects/
│ │ │ ├── errors/
│ │ │ └── interfaces/ // repository/service ports
│ │ ├── application/
│ │ │ ├── use-cases/
│ │ │ └── dto/
│ │ ├── infrastructure/
│ │ │ ├── repositories/
│ │ │ ├── ipc-handlers/
│ │ │ └── external-services/
│ │ └── index.ts // public contract
├── shared/
│ ├── domain/ // shared entities, base classes
│ ├── application/ // shared use-cases, interfaces
│ └── infrastructure/ // logger, config, utilities
└── composition-root.ts // manual DI assembly

## What the AI Must NOT Do (Anti-patterns)

- Import from inside a module (e.g., `../modules/user/domain/...`) — always go through `index.ts`.
- Add Electron, Node.js, or framework imports into `domain/` or `application/`.
- Create a DI container or use decorators for injection.
- Catch errors silently or use generic `Error` for domain problems.
- Mix layers: e.g., calling a repository directly from a use case without going through a domain interface.
- Create "god modules" that handle multiple unrelated concerns — each module = one bounded context.
- Add cross-module dependencies that bypass `shared/` or the composition root.

## Positive Patterns (Do This)

- When adding a new feature: create a new folder in `modules/`, replicate the three-layer structure, expose only `index.ts`.
- When a use case needs data: define a repository interface in `domain/interfaces/`, implement it in `infrastructure/repositories/`, wire it in `composition-root.ts`.
- When handling IPC: the handler in `infrastructure/ipc-handlers/` validates input, calls the use case, catches domain errors, and replies via `event.reply` — all translation happens here.
- When two modules need to communicate: extract the shared contract into `shared/`, or have one module expose a high-level service via its `index.ts` that the other can consume.