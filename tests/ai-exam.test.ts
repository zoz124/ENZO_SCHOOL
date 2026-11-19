/**
 * Unit tests for the AI Exam Generator pure-logic utilities.
 *
 * These tests NEVER call Groq — fetch is mocked globally and any attempt to
 * reach a real endpoint will fail the test.
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  extractJson,
  isPayloadWithinLimit,
  isValidDataUri,
  MAX_REQUEST_BYTES,
  parseGroqContent,
  parseFreeformQa,
  shuffleOptions,
  stripCodeFences,
  stripThinkBlocks,
} from '@/lib/ai-exam-utils'

// ---------------------------------------------------------------------------
// Safety: ensure fetch is never called in this test file
// ---------------------------------------------------------------------------
vi.stubGlobal('fetch', () => {
  throw new Error('fetch must not be called in ai-exam unit tests')
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// shuffleOptions
// ---------------------------------------------------------------------------

describe('shuffleOptions', () => {
  const correct = 'الإجابة الصحيحة'
  const wrong: [string, string, string] = ['خطأ 1', 'خطأ 2', 'خطأ 3']

  it('returns an array of length 4', () => {
    expect(shuffleOptions(correct, wrong)).toHaveLength(4)
  })

  it('contains the correct answer', () => {
    expect(shuffleOptions(correct, wrong)).toContain(correct)
  })

  it('contains all three wrong answers', () => {
    const result = shuffleOptions(correct, wrong)
    for (const w of wrong) expect(result).toContain(w)
  })

  it('does not mutate the wrong array', () => {
    const original = [...wrong]
    shuffleOptions(correct, wrong)
    expect(wrong).toEqual(original)
  })

  it('produces a different order at some point (probabilistic — 1/24 chance of false pass)', () => {
    const orders = new Set<string>()
    for (let i = 0; i < 50; i++) {
      orders.add(shuffleOptions(correct, wrong).join('|'))
    }
    // If truly random, we should see at least 2 different orderings in 50 tries.
    expect(orders.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// stripThinkBlocks
// ---------------------------------------------------------------------------

describe('stripThinkBlocks', () => {
  it('removes a single think block', () => {
    const input = '<think>internal reasoning</think>{"questions":[]}'
    expect(stripThinkBlocks(input)).toBe('{"questions":[]}')
  })

  it('removes multiline think blocks', () => {
    const input = '<think>\nline 1\nline 2\n</think>\n{"questions":[]}'
    expect(stripThinkBlocks(input)).toBe('{"questions":[]}')
  })

  it('is case-insensitive', () => {
    const input = '<THINK>stuff</THINK>{"ok":true}'
    expect(stripThinkBlocks(input)).toBe('{"ok":true}')
  })

  it('leaves text without think blocks untouched', () => {
    const input = '{"questions":[]}'
    expect(stripThinkBlocks(input)).toBe(input)
  })

  it('removes multiple think blocks', () => {
    const input = '<think>a</think>text<think>b</think>end'
    expect(stripThinkBlocks(input)).toBe('textend')
  })
})

// ---------------------------------------------------------------------------
// stripCodeFences
// ---------------------------------------------------------------------------

describe('stripCodeFences', () => {
  it('strips ```json fences', () => {
    const input = '```json\n{"questions":[]}\n```'
    expect(stripCodeFences(input)).toBe('{"questions":[]}')
  })

  it('strips plain ``` fences', () => {
    const input = '```\n{"questions":[]}\n```'
    expect(stripCodeFences(input)).toBe('{"questions":[]}')
  })

  it('leaves text without fences untouched', () => {
    const input = '{"questions":[]}'
    expect(stripCodeFences(input)).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// extractJson
// ---------------------------------------------------------------------------

describe('extractJson', () => {
  it('extracts JSON after a think block', () => {
    const input =
      '<think>reasoning</think>\n{"questions":[{"question":"Q","correct":"C","wrong":["W1","W2","W3"],"explanation":"E"}]}'
    const result = extractJson(input)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('extracts JSON from code-fenced markdown', () => {
    const input = '```json\n{"questions":[]}\n```'
    expect(extractJson(input)).toBe('{"questions":[]}')
  })

  it('extracts the first {...} block when model adds prose', () => {
    const input = 'Here is your JSON: {"questions":[]} and nothing else.'
    expect(extractJson(input)).toBe('{"questions":[]}')
  })
})

// ---------------------------------------------------------------------------
// parseGroqContent
// ---------------------------------------------------------------------------

const validContent = JSON.stringify({
  questions: [
    {
      question: 'ما عاصمة مصر؟',
      correct: 'القاهرة',
      wrong: ['الإسكندرية', 'الجيزة', 'الأقصر'],
      explanation: 'القاهرة هي العاصمة الرسمية لجمهورية مصر العربية.',
    },
  ],
})

describe('parseGroqContent', () => {
  it('parses a well-formed content string', () => {
    const result = parseGroqContent(validContent)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.questions).toHaveLength(1)
      expect(result.questions[0].question).toBe('ما عاصمة مصر؟')
      expect(result.questions[0].correct).toBe('القاهرة')
      expect(result.questions[0].wrong).toHaveLength(3)
    }
  })

  it('handles think blocks before JSON', () => {
    const withThink = `<think>Let me think…</think>\n${validContent}`
    const result = parseGroqContent(withThink)
    expect(result.ok).toBe(true)
  })

  it('handles code-fenced JSON', () => {
    const fenced = `\`\`\`json\n${validContent}\n\`\`\``
    const result = parseGroqContent(fenced)
    expect(result.ok).toBe(true)
  })

  it('returns ok:false for empty string', () => {
    expect(parseGroqContent('').ok).toBe(false)
  })

  it('returns ok:false for invalid JSON', () => {
    expect(parseGroqContent('not json at all').ok).toBe(false)
  })

  it('returns ok:false when questions array is empty', () => {
    expect(parseGroqContent('{"questions":[]}')).toMatchObject({ ok: false })
  })

  it('returns ok:false when questions key is missing', () => {
    expect(parseGroqContent('{"data":[]}')).toMatchObject({ ok: false })
  })

  it('skips malformed question objects and returns ok:false if none valid', () => {
    const bad = JSON.stringify({ questions: [{ bad: true }] })
    expect(parseGroqContent(bad)).toMatchObject({ ok: false })
  })

  it('skips invalid entries but keeps valid ones', () => {
    const mixed = JSON.stringify({
      questions: [
        { bad: true },
        {
          question: 'سؤال',
          correct: 'صح',
          wrong: ['غلط1', 'غلط2', 'غلط3'],
          explanation: '',
        },
      ],
    })
    const result = parseGroqContent(mixed)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.questions).toHaveLength(1)
  })

  it('defaults explanation to empty string when missing', () => {
    const noExplanation = JSON.stringify({
      questions: [
        {
          question: 'Q',
          correct: 'C',
          wrong: ['W1', 'W2', 'W3'],
        },
      ],
    })
    const result = parseGroqContent(noExplanation)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.questions[0].explanation).toBe('')
  })

  it('returns ok:false when wrong array has fewer than 3 items', () => {
    const short = JSON.stringify({
      questions: [{ question: 'Q', correct: 'C', wrong: ['W1', 'W2'] }],
    })
    expect(parseGroqContent(short)).toMatchObject({ ok: false })
  })
})

// ---------------------------------------------------------------------------
// isValidDataUri
// ---------------------------------------------------------------------------

describe('isValidDataUri', () => {
  const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDA'

  it('accepts a JPEG data URI', () => {
    expect(isValidDataUri(jpeg)).toBe(true)
  })

  it('accepts a PNG data URI', () => {
    expect(isValidDataUri('data:image/png;base64,abc123=')).toBe(true)
  })

  it('accepts a WEBP data URI', () => {
    expect(isValidDataUri('data:image/webp;base64,abc123=')).toBe(true)
  })

  it('rejects a GIF data URI', () => {
    expect(isValidDataUri('data:image/gif;base64,abc123=')).toBe(false)
  })

  it('rejects a plain URL', () => {
    expect(isValidDataUri('https://example.com/image.jpg')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidDataUri('')).toBe(false)
  })

  it('rejects a text/html data URI', () => {
    expect(isValidDataUri('data:text/html;base64,abc')).toBe(false)
  })

  it('rejects a data URI with no base64 body', () => {
    expect(isValidDataUri('data:image/jpeg;base64,')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isPayloadWithinLimit
// ---------------------------------------------------------------------------

describe('isPayloadWithinLimit', () => {
  it('accepts a small payload', () => {
    expect(isPayloadWithinLimit('{"mode":"qa"}')).toBe(true)
  })

  it('rejects a payload over the limit', () => {
    // Build a string longer than MAX_REQUEST_BYTES
    const big = 'x'.repeat(MAX_REQUEST_BYTES + 1)
    expect(isPayloadWithinLimit(big)).toBe(false)
  })

  it('accepts a payload exactly at the limit', () => {
    const exact = 'x'.repeat(MAX_REQUEST_BYTES)
    expect(isPayloadWithinLimit(exact)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// parseFreeformQa
// ---------------------------------------------------------------------------

describe('parseFreeformQa', () => {
  it('parses Arabic س/ج prefixes', () => {
    const text = 'س: ما عاصمة مصر؟\nج: القاهرة'
    const result = parseFreeformQa(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ question: 'ما عاصمة مصر؟', answer: 'القاهرة' })
  })

  it('parses English q:/a: prefixes (case-insensitive)', () => {
    const text = 'Q: Capital of Egypt?\nA: Cairo'
    const result = parseFreeformQa(text)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ question: 'Capital of Egypt?', answer: 'Cairo' })
  })

  it('parses multiple pairs', () => {
    const text = 'س: سؤال 1\nج: إجابة 1\nس: سؤال 2\nج: إجابة 2'
    expect(parseFreeformQa(text)).toHaveLength(2)
  })

  it('ignores a question with no answer', () => {
    const text = 'س: بدون إجابة\nس: مع إجابة\nج: هنا'
    const result = parseFreeformQa(text)
    expect(result).toHaveLength(1)
    expect(result[0].question).toBe('مع إجابة')
  })

  it('returns an empty array for empty input', () => {
    expect(parseFreeformQa('')).toHaveLength(0)
  })

  it('returns an empty array when no recognised prefix is found', () => {
    expect(parseFreeformQa('this is just some text without prefixes')).toHaveLength(0)
  })

  it('trims whitespace from question and answer', () => {
    const text = 'س:   نص السؤال   \nج:   الإجابة   '
    const result = parseFreeformQa(text)
    expect(result[0]).toEqual({ question: 'نص السؤال', answer: 'الإجابة' })
  })
})
