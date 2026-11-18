import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // Point the actions' `@payload-config` import at the local SQLite test
      // config so server actions run against a real Payload instance.
      '@payload-config': path.resolve(import.meta.dirname, 'tests/payload.test.config.ts'),
      // `server-only` throws outside a Next.js server bundle. In tests the
      // modules under test are server code by construction, so stub it out.
      'server-only': path.resolve(import.meta.dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Payload opens a single SQLite file; run files serially to avoid lock contention.
    fileParallelism: false,
    pool: 'forks',
    maxWorkers: 1,
  },
})
