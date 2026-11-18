import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { buildConfig } from 'payload'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Teachers } from './collections/Teachers'
import { Exams } from './collections/Exams'
import { ExamAttempts } from './collections/ExamAttempts'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Local-database config used ONLY when `E2E_LOCAL_DB=1` is set (Playwright and
 * Vitest). The Figma Cloud backend is unreachable outside the Figma Make
 * sandbox, so end-to-end tests need a real, local database to exercise the
 * actual collections, hooks and access rules.
 *
 * `src/payload.config.ts` keeps `buildFigmaConfig()` as its default and only
 * takes this branch when the env var is present, so the Figma deployment path
 * is unchanged.
 */
export const e2eConfig = buildConfig({
  secret: process.env.PAYLOAD_SECRET || 'e2e-local-secret-not-for-production',
  admin: { user: Admins.slug },
  collections: [Admins, Media, Folders, Tags, Teachers, Exams, ExamAttempts],
  db: sqliteAdapter({
    client: {
      url: process.env.E2E_DB_URL || `file:${path.join(dirname, '..', 'e2e', '.tmp', 'e2e.db')}`,
    },
  }),
  typescript: { outputFile: path.join(dirname, 'payload-types.ts') },
})

export default e2eConfig
