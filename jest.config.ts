import type { Config } from 'jest'

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov'],
  fakeTimers: {
    enableGlobally: false,
  },
  notify: false,
  notifyMode: 'failure-change',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/?(*.)+(test).ts'],
}

export default config
