import fs from 'node:fs'
import path from 'node:path'

export type MakeSiteSettings = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/**
 * Site settings are written by the Make lifecycle into `.figma/make/site.json`.
 * Some checkouts ship the folder without the leading dot (`figma/make/site.json`),
 * and a static `import` of a missing JSON file fails the whole build. Resolve the
 * file at runtime and fall back to defaults so the app always boots.
 */
const readSiteSettings = (): MakeSiteSettings => {
  const candidates = [
    path.join(process.cwd(), '.figma', 'make', 'site.json'),
    path.join(process.cwd(), 'figma', 'make', 'site.json'),
  ]

  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue
      const raw = fs.readFileSync(candidate, 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as MakeSiteSettings
    } catch {
      // A malformed settings file must never take the app down.
    }
  }

  return {}
}

export const makeSiteSettings = readSiteSettings()

export function sanitizeHtmlAttribute(value: string | undefined): string {
  return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
}
