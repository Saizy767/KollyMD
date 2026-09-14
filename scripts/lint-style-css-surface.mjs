import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RENDERER = join(ROOT, 'src', 'renderer')

function findFiles(dir, ext) {
  const results = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      results.push(...findFiles(full, ext))
    } else if (entry.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

const violations = []

const cssFiles = findFiles(RENDERER, '.css')
const STYLES_DIR = join(RENDERER, 'styles')
const MODS_DIR = join(RENDERER, 'mods')
for (const f of cssFiles) {
  if (f === join(RENDERER, 'styles.css')) continue
  if (f.startsWith(STYLES_DIR + sep)) continue
  if (f.startsWith(MODS_DIR + sep)) continue
  violations.push(
    `${relative(ROOT, f)}: extra CSS file (only styles.css, styles/ folder, or mods/ allowed)`
  )
}

const htmlFiles = findFiles(RENDERER, '.html')
for (const f of htmlFiles) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (/<style/i.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1} contains <style> tag`)
    }
    if (/\sstyle\s*=/i.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1} inline style= attribute`)
    }
  })
}

const tsFiles = findFiles(RENDERER, '.ts')
for (const f of tsFiles) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (/\.style\b/.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1} inline .style property access`)
    }
    if (/setAttribute\(\s*['"]style['"]/i.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1} setAttribute('style') call`)
    }
  })
}

if (violations.length > 0) {
  console.error('Style CSS-surface FAILED:')
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
} else {
  console.log('Style CSS-surface passed: single CSS surface (styles.css or styles/ folder), no <style> tags, no inline styles.')
}
