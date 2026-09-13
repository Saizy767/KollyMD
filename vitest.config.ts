import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig({
  ...viteConfig,
  root: process.cwd(),
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    deps: {
      inline: [/.*mod-sdk.*/, /.*mods\/.*\/server.*/],
    },
  },
})
