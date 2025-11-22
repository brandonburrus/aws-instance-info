import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: './lib',
    include: ['**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: '../coverage',
      reporter: ['text', 'lcov'],
    },
  },
})
