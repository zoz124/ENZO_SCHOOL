import path from 'path'
import { buildFigmaConfig } from '@payloadcms/figma'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { en as adminLanguage } from '@payloadcms/translations/languages/en'
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

/**
 * Test-only escape hatch.
 *
 * The Figma Cloud backend (`buildFigmaConfig`) requires FIGMA_EID and a remote
 * Content API database, neither of which exists outside the Figma Make sandbox.
 * When E2E_LOCAL_DB=1 the app boots against a local SQLite database instead so
 * Playwright can drive the real UI. Production and the Figma preview keep the
 * default path below unchanged.
 */
const config =
  process.env.E2E_LOCAL_DB === '1' || !process.env.FIGMA_EID
    ? e2eConfig
    : buildFigmaConfig({
        admin: {
          user: Admins.slug,
          constrainWidth: true,
          dashboard: {
            widgets: [],
            defaultLayout: [
              { widgetSlug: 'activity', width: 'full' },
              { widgetSlug: 'collections', width: 'full' },
            ],
          },
          importMap: {
            baseDir: path.resolve(dirname),
          },
        },
        i18n: {
          fallbackLanguage: 'en',
          supportedLanguages: { en: adminLanguage },
        },
        collections: [Admins, Media, Folders, Tags, Teachers, Exams, ExamAttempts],
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

export default config
