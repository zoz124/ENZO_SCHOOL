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
      { widgetSlug: 'activity', width: 'full' as const },
      { widgetSlug: 'collections', width: 'full' as const },
    ],
  },
}

const config =
  process.env.E2E_LOCAL_DB === '1'
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
