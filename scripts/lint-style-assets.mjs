import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RENDERER = join(ROOT, 'src', 'renderer')
const ASSETS_DIR = join(RENDERER, 'assets')
const MODS_DIR = join(RENDERER, 'mods')

const RASTER_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.bmp', '.webp', '.avif']
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

const rasterFiles = findFiles(RENDERER, RASTER_EXTS)
for (const f of rasterFiles) {
  violations.push(`${relative(ROOT, f)}: raster image file (text, Unicode, and SVG icons only)`)
}

const svgFiles = findFiles(RENDERER, ['.svg'])
for (const f of svgFiles) {
  if (f.startsWith(ASSETS_DIR + sep)) continue
  if (f.startsWith(MODS_DIR + sep)) continue
  violations.push(`${relative(ROOT, f)}: SVG outside assets/ or mods/ (SVG icons must live in src/renderer/assets/ or a mod folder)`)
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
  console.log('Style assets passed: no raster images/fonts in renderer; SVG only in assets/.')
}
