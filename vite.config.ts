import { defineConfig } from 'vite'
import { resolve } from 'node:path'

const cwd = process.cwd()

const config = defineConfig({
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: [
      { find: /^@mod-sdk$/, replacement: resolve(cwd, 'src/mod-sdk/index.ts') },
      { find: /^@shared\//, replacement: resolve(cwd, 'src/shared') + '/' },
      { find: /^@vault$/, replacement: resolve(cwd, 'src/modules/vault/index.ts') },
      { find: /^@vault\//, replacement: resolve(cwd, 'src/modules/vault') + '/' },
      { find: /^@editor$/, replacement: resolve(cwd, 'src/modules/editor/index.ts') },
      { find: /^@editor\//, replacement: resolve(cwd, 'src/modules/editor') + '/' },
      { find: /^@knowledge$/, replacement: resolve(cwd, 'src/modules/knowledge/index.ts') },
      { find: /^@knowledge\//, replacement: resolve(cwd, 'src/modules/knowledge') + '/' },
      { find: /^@state$/, replacement: resolve(cwd, 'src/modules/state/index.ts') },
      { find: /^@state\//, replacement: resolve(cwd, 'src/modules/state') + '/' },
      { find: /^@renderer\//, replacement: resolve(cwd, 'src/renderer') + '/' },
      { find: /^@search-server\//, replacement: resolve(cwd, 'src/renderer/mods/search/server') + '/' },
    ],
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 5173
  },
})

;(config as any).test = {
  deps: {
    inline: [/.*mod-sdk.*/, /.*mods\/.*\/server.*/],
  },
}

export default config
