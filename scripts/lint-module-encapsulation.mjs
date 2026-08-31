import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src')

function findTsFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      results.push(...findTsFiles(full))
    } else if (entry.endsWith('.ts')) {
      results.push(full)
    }
  }
  return results
}

const allFiles = findTsFiles(SRC)
const violations = []

for (const file of allFiles) {
  const content = readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  const relFile = relative(SRC, file)
  const fileModuleMatch = relFile.match(/^modules\/([^/]+)\//)
  const fileModule = fileModuleMatch ? fileModuleMatch[1] : null

  lines.forEach((line, i) => {
    const importMatch = line.match(/from\s+['"]([^'"]+)['"]/)
    if (!importMatch) return
    const importPath = importMatch[1]
    if (!importPath.startsWith('.')) return

    const resolved = resolve(dirname(file), importPath)
    const relResolved = relative(SRC, resolved)
    const targetMatch = relResolved.match(
      /^modules\/([^/]+)\/(domain|application|infrastructure)\//
    )
    if (targetMatch) {
      const targetModule = targetMatch[1]
      if (fileModule !== targetModule) {
        violations.push(
          `${relative(ROOT, file)}:${i + 1} imports "${importPath}" into ${targetModule}/${targetMatch[2]} (use ${targetModule} index.ts)`
        )
      }
    }
  })
}

if (violations.length > 0) {
  console.error('Rule 2 FAILED: deep imports into module internals (bypassing index.ts):')
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
} else {
  console.log('Rule 2 passed: no deep cross-module imports.')
}
