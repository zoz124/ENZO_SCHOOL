import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { buildConfig } from 'payload'
import { Admins } from '../src/collections/Admins'
import { Media } from '../src/collections/Media'
import { Folders } from '../src/collections/Folders'
import { Tags } from '../src/collections/Tags'
import { Teachers } from '../src/collections/Teachers'
import { Exams } from '../src/collections/Exams'
import { ExamAttempts } from '../src/collections/ExamAttempts'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Local test config.
 *
 * The production config uses `buildFigmaConfig()`, which requires Figma Cloud
 * credentials (FIGMA_EID + a remote Content API database). That backend is not
 * reachable outside the Figma Make sandbox, so integration tests run the SAME
 * collection definitions and hooks against a local SQLite database instead.
 *
 * This is the only way to exercise the real access rules, validation and
 * beforeChange hooks rather than re-implementing them in the test.
 */
export const testConfig = buildConfig({
  secret: 'test-secret-for-vitest-only',
  admin: { user: Admins.slug },
  collections: [Admins, Media, Folders, Tags, Teachers, Exams, ExamAttempts],
  db: sqliteAdapter({
    client: { url: `file:${path.join(dirname, '.tmp', 'test.db')}` },
  }),
  typescript: { outputFile: path.join(dirname, '.tmp', 'payload-types.ts') },
  onInit: async (payload) => {
    payload.logger.info('Test payload initialised')
  },
})

// The server actions import the config as a default export
// (`import config from '@payload-config'`), so the test config must provide one.
export default testConfig
