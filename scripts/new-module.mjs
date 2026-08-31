import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const MODULES = join(ROOT, 'src', 'modules')

const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const positional = args.filter((a) => !a.startsWith('--'))
const name = positional[0]

if (!name) {
  console.error('Usage: node scripts/new-module.mjs <name> [--ipc] [--repo]')
  console.error('  <name>  module name in kebab-case (e.g. tags, note-graph)')
  console.error('  --ipc   create IPC handler skeleton')
  console.error('  --repo  create repository interface + Fs implementation skeleton')
  process.exit(1)
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(`Invalid module name "${name}": use kebab-case (lowercase, hyphens, digits)`)
  process.exit(1)
}

const pascal = name
  .split('-')
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join('')

const moduleDir = join(MODULES, name)

if (existsSync(moduleDir)) {
  console.error(`Module "${name}" already exists at src/modules/${name}/`)
  process.exit(1)
}

const dirs = [
  'domain/entities',
  'domain/errors',
  'domain/interfaces',
  'application/use-cases',
  'infrastructure/repositories',
  'infrastructure/ipc-handlers',
]

const created = []

for (const d of dirs) {
  const full = join(moduleDir, d)
  mkdirSync(full, { recursive: true })
}

const indexPath = join(moduleDir, 'index.ts')
writeFileSync(indexPath, '')
created.push(`src/modules/${name}/index.ts`)

const dtoPath = join(moduleDir, 'application', 'dto.ts')
writeFileSync(dtoPath, '')
created.push(`src/modules/${name}/application/dto.ts`)

if (flags.includes('--ipc')) {
  const ipcContent = `import { IpcMain } from 'electron'

export class ${pascal}IpcHandler {
  constructor(private readonly ipcMain: IpcMain) {}

  register(): void {
    // Register IPC handlers for ${name} module
  }
}
`
  const ipcPath = join(moduleDir, 'infrastructure', 'ipc-handlers', `${pascal}IpcHandler.ts`)
  writeFileSync(ipcPath, ipcContent)
  created.push(`src/modules/${name}/infrastructure/ipc-handlers/${pascal}IpcHandler.ts`)
}

if (flags.includes('--repo')) {
  const repoInterfaceContent = `export interface ${pascal}Repository {
  // Define repository methods
}
`
  const repoInterfacePath = join(moduleDir, 'domain', 'interfaces', `${pascal}Repository.ts`)
  writeFileSync(repoInterfacePath, repoInterfaceContent)
  created.push(`src/modules/${name}/domain/interfaces/${pascal}Repository.ts`)

  const fsRepoContent = `import type { ${pascal}Repository } from '../../domain/interfaces/${pascal}Repository'

export class Fs${pascal}Repository implements ${pascal}Repository {
  // Implement repository methods
}
`
  const fsRepoPath = join(moduleDir, 'infrastructure', 'repositories', `Fs${pascal}Repository.ts`)
  writeFileSync(fsRepoPath, fsRepoContent)
  created.push(`src/modules/${name}/infrastructure/repositories/Fs${pascal}Repository.ts`)
}

console.log(`Created module "${name}" with ${created.length} file(s):`)
for (const f of created) console.log(`  ${f}`)
if (flags.length === 0) {
  console.log('  (directories only — use --ipc and/or --repo for boilerplate)')
}
