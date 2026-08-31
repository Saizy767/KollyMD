import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const UI_LIBRARIES = [
  'tailwindcss', 'bootstrap', 'bulma', 'antd',
  'styled-components', 'sass', 'node-sass', 'less', 'postcss',
  'reactstrap', 'react-bootstrap', 'semantic-ui-react',
  'evergreen-ui', 'rebass', 'grommet', 'foundation-sites',
  'primereact', 'twin.macro',
]

const UI_PREFIXES = [
  '@mui/', '@material-ui/', '@radix-ui/', '@headlessui/',
  '@emotion/', '@chakra-ui/', '@tailwindcss/', '@stitches/',
]

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }

const violations = []

for (const name of Object.keys(deps)) {
  if (UI_LIBRARIES.includes(name)) {
    violations.push(`${name}: UI library/CSS framework in dependencies`)
  }
  for (const prefix of UI_PREFIXES) {
    if (name.startsWith(prefix)) {
      violations.push(`${name}: UI library scoped package in dependencies`)
      break
    }
  }
}

if (violations.length > 0) {
  console.error('Style deps FAILED: UI libraries/CSS frameworks found in package.json:')
  for (const v of violations) console.error(`  ${v}`)
  process.exit(1)
} else {
  console.log('Style deps passed: no UI libraries or CSS frameworks in dependencies.')
}
