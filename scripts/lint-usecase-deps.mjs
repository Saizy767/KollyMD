import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

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
const useCaseFiles = allFiles.filter(
  (f) => f.includes('/application/use-cases/') && f.includes('/modules/')
)

const violations = []

for (const file of useCaseFiles) {
  const content = readFileSync(file, 'utf-8')
  const ctorMatch = content.match(/constructor\s*\(([\s\S]*?)\)\s*\{/)
  if (!ctorMatch) continue
  const depCount = (ctorMatch[1].match(/private readonly/g) || []).length
  if (depCount > 3) {
    violations.push(`${relative(ROOT, file)}: ${depCount} dependencies (max 3)`)
  }
}

if (violations.length > 0) {
  console.error('Rule 1 FAILED: use cases with more than 3 dependencies:')
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
} else {
  console.log('Rule 1 passed: all use cases have <=3 dependencies.')
}
