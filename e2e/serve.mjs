/**
 * Boots the real Next.js app for Playwright against a local SQLite database.
 *
 * `E2E_LOCAL_DB=1` switches src/payload.config.ts from the Figma Cloud backend
 * (which needs FIGMA_EID and is unreachable outside the Figma Make sandbox) to
 * the local e2e config. Everything else — routes, server actions, collections,
 * hooks, access rules — is the real application code.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const tmpDir = path.join(root, 'e2e', '.tmp')
fs.mkdirSync(tmpDir, { recursive: true })

const dbFile = path.join(tmpDir, 'e2e.db')
// Start from a clean database for every run so counts are deterministic.
for (const suffix of ['', '-shm', '-wal']) {
  const file = `${dbFile}${suffix}`
  if (fs.existsSync(file)) fs.rmSync(file, { force: true })
}

const port = process.env.E2E_PORT || '3100'

const child = spawn(
  process.execPath,
  [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--port', port, '--hostname', '127.0.0.1'],
  {
    cwd: root,
    env: {
      ...process.env,
      E2E_LOCAL_DB: '1',
      E2E_DB_URL: `file:${dbFile}`,
      PAYLOAD_SECRET: 'e2e-local-secret-not-for-production',
      NODE_OPTIONS: '--max-old-space-size=2048',
      PORT: port,
    },
    stdio: 'inherit',
  },
)

const shutdown = () => {
  child.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
child.on('exit', (code) => process.exit(code ?? 0))
