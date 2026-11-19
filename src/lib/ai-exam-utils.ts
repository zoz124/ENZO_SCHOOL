/**
 * Pure utility functions for the AI Exam Generator.
 *
 * All functions here are side-effect-free and have no dependency on Next.js,
 * Payload, or the Groq API, so they can be unit-tested with Vitest directly.
 */

import type { GeneratedQuestion } from '@/app/api/generate-exam/route'

// ---------------------------------------------------------------------------
// Image validation
// ---------------------------------------------------------------------------

/** Accepted MIME types (GIF excluded: not useful for educational material). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/**
 * Returns true when the string is a well-formed data URI for an accepted image
 * type. The base64 body is validated only for character-set conformance, not
 * decoded — full decoding on the server wastes memory.
 */
export function isValidDataUri(s: string): boolean {
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)
}

// ---------------------------------------------------------------------------
// Shuffle
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates shuffle of [correct, ...wrong]. Returns a new array; does not
 * mutate the input.
 */
export function shuffleOptions(correct: string, wrong: [string, string, string]): string[] {
  const all: string[] = [correct, ...wrong]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    // Non-null assertion is safe: i and j are always within bounds.
    const tmp = all[i]!
    all[i] = all[j]!
    all[j] = tmp
  }
  return all
}

// ---------------------------------------------------------------------------
// Output parsing
// ---------------------------------------------------------------------------

/**
 * Strip <think>…</think> blocks that some reasoning models emit before the
 * JSON payload. Handles multi-line, nested-looking, and malformed closings.
 */
export function stripThinkBlocks(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/**
 * Strip markdown code fences that some models wrap around JSON despite being
 * told not to: ```json … ``` or ``` … ```.
 */
export function stripCodeFences(text: string): string {
  // Leading fence with optional language tag
  let result = text.replace(/^```(?:json)?\s*/i, '')
  // Trailing fence
  result = result.replace(/\s*```\s*$/, '')
  return result.trim()
}

/**
 * Clean a raw LLM content string by stripping think-blocks and code fences,
 * then return the first JSON object found in the remaining text.
 */
export function extractJson(raw: string): string {
  let text = stripThinkBlocks(raw)
  text = stripCodeFences(text)

  // If the model still wrapped it in prose, extract the first {...} block.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    return text.slice(start, end + 1)
  }
  return text
}

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

export type ParseResult =
  | { ok: true; questions: GeneratedQuestion[] }
  | { ok: false; error: string }

/**
 * Parse and validate the content string returned by Groq.
 * Returns a typed result — never throws.
 */
export function parseGroqContent(content: string): ParseResult {
  const cleaned = extractJson(content)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return { ok: false, error: 'لم يُرجع الذكاء الاصطناعي JSON صالحًا. حاول مرة أخرى.' }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('questions' in parsed) ||
    !Array.isArray((parsed as { questions: unknown }).questions)
  ) {
    return { ok: false, error: 'بنية البيانات المُرجعة غير صحيحة. حاول مرة أخرى.' }
  }

  const questions: GeneratedQuestion[] = []
  for (const q of (parsed as { questions: unknown[] }).questions) {
    if (!q || typeof q !== 'object') continue
    const item = q as Record<string, unknown>
    if (
      typeof item.question !== 'string' ||
      typeof item.correct !== 'string' ||
      !Array.isArray(item.wrong) ||
      item.wrong.length < 3
    )
      continue
    questions.push({
      question: String(item.question),
      correct: String(item.correct),
      wrong: [String(item.wrong[0]), String(item.wrong[1]), String(item.wrong[2])],
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
    })
  }

  if (questions.length === 0) {
    return { ok: false, error: 'لم يتم توليد أسئلة. حاول مرة أخرى أو عدّل المحتوى.' }
  }

  return { ok: true, questions }
}

// ---------------------------------------------------------------------------
// Payload size guard
// ---------------------------------------------------------------------------

/** Maximum JSON body size we will send to /api/generate-exam from the browser. */
export const MAX_REQUEST_BYTES = 3.5 * 1024 * 1024 // 3.5 MB

/**
 * Returns true if the serialised body string length (UTF-8 worst-case) is
 * within the allowed limit. This is a client-side early rejection; the server
 * enforces its own cap independently.
 */
export function isPayloadWithinLimit(bodyJson: string): boolean {
  // JSON.stringify produces UTF-16 JS strings; for a data URI the characters
  // are all ASCII so byteLength ≈ charLength. We use length as a conservative
  // upper bound (saves the TextEncoder allocation in the common case).
  return bodyJson.length <= MAX_REQUEST_BYTES
}

// ---------------------------------------------------------------------------
// Image resizing (browser-only, uses createImageBitmap + OffscreenCanvas)
// ---------------------------------------------------------------------------

/**
 * Resize an image file so neither dimension exceeds `maxSide` pixels, then
 * re-encode as JPEG at the given quality. Returns a data URI string.
 *
 * Uses createImageBitmap + OffscreenCanvas when available (all modern browsers
 * and Chromium-based environments) and falls back to HTMLCanvasElement.
 *
 * This function must only be called in a browser context.
 */
export async function resizeImageToDataUri(
  file: File,
  maxSide = 1400,
  quality = 0.8,
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Compute target dimensions preserving aspect ratio.
  let targetW = width
  let targetH = height
  if (width > maxSide || height > maxSide) {
    const ratio = Math.min(maxSide / width, maxSide / height)
    targetW = Math.round(width * ratio)
    targetH = Math.round(height * ratio)
  }

  let dataUri: string

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(targetW, targetH)
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
    if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas')
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    dataUri = await blobToDataUri(blob)
  } else {
    // HTMLCanvasElement fallback
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context from canvas')
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close()
    dataUri = canvas.toDataURL('image/jpeg', quality)
  }

  return dataUri
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ---------------------------------------------------------------------------
// QA freeform parser
// ---------------------------------------------------------------------------

/**
 * Parse a freeform text block of the shape:
 *   س: <question text>
 *   ج: <answer text>
 * Also accepts English prefixes (q:, a:, question:, answer:).
 */
export function parseFreeformQa(text: string): Array<{ question: string; answer: string }> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const pairs: Array<{ question: string; answer: string }> = []
  let cur: Partial<{ question: string; answer: string }> = {}

  for (const line of lines) {
    const qMatch = line.match(/^(?:س|q|question)[:\-\s]+(.+)/iu)
    const aMatch = line.match(/^(?:ج|a|answer)[:\-\s]+(.+)/iu)
    if (qMatch) {
      if (cur.question && cur.answer) pairs.push(cur as { question: string; answer: string })
      cur = { question: qMatch[1]!.trim() }
    } else if (aMatch) {
      cur.answer = aMatch[1]!.trim()
    }
  }
  if (cur.question && cur.answer) pairs.push(cur as { question: string; answer: string })
  return pairs
}
