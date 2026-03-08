import path from 'node:path'
import { defineConfig } from 'vitest/config'

const root = path.resolve(__dirname)

export default defineConfig({
  plugins: [
    {
      // Redirect sync wrapper imports to pre-built dist/ JS files.
      // make-synchronous spawns worker threads; Vite's SSR transform replaces
      // import() with __vite_ssr_dynamic_import__ which doesn't exist in workers.
      // Using pre-built dist/ JS files avoids this by keeping native import().
      name: 'sync-wrapper-to-dist',
      // Run before Vite's built-in resolvers
      enforce: 'pre',
      resolveId(id, importer) {
        if (!importer) return null
        const syncModules = ['ec2', 'rds', 'elasticache']
        for (const mod of syncModules) {
          if (
            id === `../lib/${mod}.js` ||
            id.endsWith(`/lib/${mod}.ts`) ||
            id.endsWith(`/lib/${mod}.js`)
          ) {
            return path.resolve(root, `dist/${mod}.js`)
          }
        }
        return null
      },
    },
  ],
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    passWithNoTests: true,
    server: {
      deps: {
        // Prevent Vite from transforming the pre-built dist/ sync wrapper modules.
        // These are redirected from lib/ by the plugin above, and need to remain
        // as native ESM so that make-synchronous workers can use real import().
        external: [/\/dist\/(ec2|rds|elasticache)\.js$/],
      },
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      all: true,
      reportsDirectory: './coverage',
      include: ['lib/**/*.ts'],
      reporter: ['text', 'lcov'],
      exclude: [
        '**/*.test.ts',
        '**/index.ts', // Re-export only file
        '**/index.async.ts', // Re-export only file
        '**/types.ts', // Auto-generated types file
      ],
    },
  },
})
