import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RENDERER = join(ROOT, 'src', 'renderer')

const IMAGE_EXTS = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp', '.avif']
const FONT_EXTS = ['.woff', '.woff2', '.ttf', '.otf', '.eot']

function findFiles(dir, exts) {
  const results = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      results.push(...findFiles(full, exts))
    } else if (exts.some((ext) => entry.endsWith(ext))) {
      results.push(full)
    }
  }
  return results
}

const violations = []

const imageFiles = findFiles(RENDERER, IMAGE_EXTS)
for (const f of imageFiles) {
  violations.push(`${relative(ROOT, f)}: image/asset file (text and Unicode only)`)
}

const fontFiles = findFiles(RENDERER, FONT_EXTS)
for (const f of fontFiles) {
  violations.push(`${relative(ROOT, f)}: font file (no @font-face/web fonts)`)
}

const contentFiles = findFiles(RENDERER, ['.html', '.ts', '.css'])
for (const f of contentFiles) {
  const content = readFileSync(f, 'utf-8')
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (/<svg/i.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1} <svg> element (Unicode symbols only)`)
    }
    if (/@font-face/i.test(line)) {
      violations.push(`${relative(ROOT, f)}:${i + 1} @font-face declaration (no custom fonts)`)
    }
    const urlMatch = line.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/)
    if (urlMatch && FONT_EXTS.some((ext) => urlMatch[1].endsWith(ext))) {
      violations.push(`${relative(ROOT, f)}:${i + 1} url() references font file "${urlMatch[1]}"`)
    }
  })
}

if (violations.length > 0) {
  console.error('Style assets FAILED:')
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
} else {
  console.log('Style assets passed: no SVG/images/fonts in renderer.')
}
