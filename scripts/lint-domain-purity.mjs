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
const domainFiles = allFiles.filter((f) => {
  const rel = relative(SRC, f)
  return rel.includes('/domain/') && !rel.endsWith('.test.ts')
})
const violations = []

for (const file of domainFiles) {
  const content = readFileSync(file, 'utf-8')
  const lines = content.split('\n')

  lines.forEach((line, i) => {
    const importMatch = line.match(/from\s+['"]([^'"]+)['"]/)
    if (!importMatch) return
    const importPath = importMatch[1]

    if (!importPath.startsWith('.')) {
      violations.push(
        `${relative(ROOT, file)}:${i + 1} imports bare package "${importPath}" (domain must be pure)`
      )
      return
    }

    const resolved = resolve(dirname(file), importPath)
    const relResolved = relative(SRC, resolved)

    if (relResolved.includes('/infrastructure/')) {
      violations.push(
        `${relative(ROOT, file)}:${i + 1} imports from infrastructure (domain must not depend on infrastructure)`
      )
    } else if (relResolved.includes('/application/')) {
      violations.push(
        `${relative(ROOT, file)}:${i + 1} imports from application (domain must not depend on application)`
      )
    }
  })
}

if (violations.length > 0) {
  console.error(
    'Rule 3 FAILED: domain layer imports from infrastructure/application or external packages:'
  )
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
} else {
  console.log('Rule 3 passed: domain layer is pure (no infrastructure/application/external imports).')
}
