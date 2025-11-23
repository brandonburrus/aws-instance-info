import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
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
