import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Folders } from './collections/Folders'
import { Tags } from './collections/Tags'
import { Teachers } from './collections/Teachers'
import { Exams } from './collections/Exams'
import { ExamAttempts } from './collections/ExamAttempts'
import { migrations } from './migrations'
import { e2eConfig } from './payload.e2e.config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const collections = [Admins, Media, Folders, Tags, Teachers, Exams, ExamAttempts]
const admin = {
  user: Admins.slug,
  constrainWidth: true,
  dashboard: {
    widgets: [],
    defaultLayout: [
      { widgetSlug: 'activity' as const, width: 'full' as const },
      { widgetSlug: 'collections' as const, width: 'full' as const },
    ],
  },
}

/**
 * The Playwright/Vitest suite runs the app against a local SQLite file through
 * `E2E_LOCAL_DB=1`. Hosted deployments (Vercel) run `next start`, so NODE_ENV is
 * `production` there too and it cannot be used to tell the two apart. A stray
 * `E2E_LOCAL_DB=1` in a hosting dashboard must never swap the production
 * database for the throwaway SQLite file at `e2e/.tmp/e2e.db`, which does not
 * exist on the hosting filesystem.
 */
const useLocalE2eDatabase = process.env.E2E_LOCAL_DB === '1' && !process.env.VERCEL

if (
  !useLocalE2eDatabase &&
  !process.env.FIGMA_EID &&
  (!process.env.PAYLOAD_SECRET || !process.env.DATABASE_URL)
) {
  throw new Error(
    'Production Payload requires PAYLOAD_SECRET and DATABASE_URL. Configure both environment variables before starting the app.',
  )
}

const config =
  useLocalE2eDatabase
    ? e2eConfig
    : process.env.FIGMA_EID
      ? buildFigmaConfig({
          admin: {
            ...admin,
            importMap: { baseDir: path.resolve(dirname) },
          },
          i18n: {
            fallbackLanguage: 'en',
            supportedLanguages: { en: adminLanguage },
          },
          collections,
          typescript: {
            outputFile: path.resolve(dirname, 'payload-types.ts'),
          },
          localization: {
            locales: [{ code: 'en', label: 'English' }],
            fallback: true,
            defaultLocale: 'en',
          },
          plugins: [mcpPlugin({})],
          figma: {},
        })
      : buildConfig({
          secret: process.env.PAYLOAD_SECRET || '',
          admin,
          collections,
          db: postgresAdapter({
            pool: {
              connectionString: process.env.DATABASE_URL || '',
            },
            migrationDir: path.resolve(dirname, 'migrations'),
            // Payload never pushes schema in production, and Vercel has no
            // build/deploy hook that could run `payload migrate`. Handing the
            // committed migrations to the adapter makes the first production
            // request create the tables, so `/admin` works on a fresh
            // PostgreSQL database instead of failing on missing relations.
            prodMigrations: migrations,
          }),
          i18n: {
            fallbackLanguage: 'en',
            supportedLanguages: { en: adminLanguage },
          },
          localization: {
            locales: [{ code: 'en', label: 'English' }],
            fallback: true,
            defaultLocale: 'en',
          },
          plugins: [mcpPlugin({})],
          typescript: {
            outputFile: path.resolve(dirname, 'payload-types.ts'),
          },
        })

export default config
