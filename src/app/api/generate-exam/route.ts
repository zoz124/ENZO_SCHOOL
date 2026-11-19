import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTeacher } from '@/lib/teacher-auth'
import { isValidDataUri, parseGroqContent } from '@/lib/ai-exam-utils'

// ---------------------------------------------------------------------------
// Exported types (imported by the client component)
// ---------------------------------------------------------------------------

export type GeneratedQuestion = {
  question: string
  correct: string
  wrong: [string, string, string]
  explanation: string
}

export type GenerateExamResponse =
  | { ok: true; questions: GeneratedQuestion[] }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Constants — read from env at request time so a missing key never crashes
// the module import and the rest of the app keeps working.
// ---------------------------------------------------------------------------

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_IMAGES = 3 // qwen/qwen3.8-27b hard limit per Groq docs
const MAX_QUESTIONS = 20
const DEFAULT_QUESTIONS = 5
const MAX_PAIRS = 50

/** Maximum request body the route will read. Requests larger than this get 413. */
const MAX_BODY_BYTES = 4 * 1024 * 1024 // 4 MB

// ---------------------------------------------------------------------------
// In-memory rate limiter (per teacher ID, resets on server restart)
// ---------------------------------------------------------------------------

type RateBucket = { count: number; windowStart: number }
const rateBuckets = new Map<string, RateBucket>()

/** Returns true when the teacher is within the allowed rate. */
function checkRateLimit(teacherId: string): boolean {
  const WINDOW_MS = 60_000 // 1 minute
  const MAX_PER_WINDOW = 10

  const now = Date.now()
  const bucket = rateBuckets.get(teacherId)

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    rateBuckets.set(teacherId, { count: 1, windowStart: now })
    return true
  }
  if (bucket.count >= MAX_PER_WINDOW) return false
  bucket.count += 1
  return true
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

function buildMaterialMessages(images: string[], extraText: string, count: number) {
  const systemPrompt = `You are an exam-question generator. The user will provide educational material (images and/or text). Your task is to create multiple-choice questions ONLY based on that material.

Rules:
- Output language must match the language of the material (Arabic stays Arabic, English stays English).
- Each question must have exactly one correct answer and three plausible but wrong distractors of similar length and style.
- Keep questions focused on facts and concepts present in the material.
- Return ONLY valid JSON — no markdown fences, no explanation outside JSON.
- JSON shape: {"questions":[{"question":"","correct":"","wrong":["","",""],"explanation":""}]}`

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
  for (const img of images) {
    userContent.push({ type: 'image_url', image_url: { url: img } })
  }

  const textPart =
    `Generate exactly ${count} multiple-choice questions based ONLY on the provided material.` +
    (extraText ? `\n\nAdditional context from the user:\n${extraText}` : '') +
    '\n\nReturn JSON only.'
  userContent.push({ type: 'text', text: textPart })

  return { systemPrompt, userContent }
}

function buildQaMessages(pairs: Array<{ question: string; answer: string }>) {
  const systemPrompt = `You are an exam-question generator. The user provides questions with their correct answers. For each, write exactly 3 plausible but wrong answer options of similar length and style to the correct answer. Do NOT change the question text or the correct answer. Do NOT alter the meaning.

Rules:
- Output language must match the input language.
- Return ONLY valid JSON — no markdown fences, no explanation outside JSON.
- JSON shape: {"questions":[{"question":"","correct":"","wrong":["","",""],"explanation":""}]}`

  const pairsText = pairs
    .map((p, i) => `${i + 1}. Question: ${p.question}\n   Correct answer: ${p.answer}`)
    .join('\n\n')

  const userText = `Here are the question-answer pairs. For each, generate 3 wrong options and a brief explanation.\n\n${pairsText}\n\nReturn JSON only.`
  return { systemPrompt, userText }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// Never evaluate this route at build time: it reads env at request time and
// depends on the request session.
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<NextResponse<GenerateExamResponse>> {
  // 1. Auth — reuse the same session mechanism as the dashboard
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ ok: false, error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
  }

  // 2. Rate limit
  if (!checkRateLimit(String(teacher.id))) {
    return NextResponse.json(
      { ok: false, error: 'تجاوزت حد الطلبات. انتظر دقيقة وحاول مجددًا.' },
      { status: 429 },
    )
  }

  // 3. Body size cap (read as ArrayBuffer to enforce before JSON.parse)
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'حجم الطلب كبير جدًا. قلّل عدد الصور أو حجمها.' },
      { status: 413 },
    )
  }

  // 4. Check API key (server-side only, never logged)
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'خدمة توليد الأسئلة غير مفعّلة حاليًا. يرجى الاتصال بالمسؤول.' },
      { status: 503 },
    )
  }

  // 5. Parse body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'طلب غير صالح.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || !('mode' in body)) {
    return NextResponse.json({ ok: false, error: 'حقل mode مطلوب.' }, { status: 400 })
  }

  const rawBody = body as Record<string, unknown>
  const models = {
    vision: process.env.GROQ_VISION_MODEL ?? 'qwen/qwen3.8-27b',
    text: process.env.GROQ_TEXT_MODEL ?? 'llama-3.3-70b-versatile',
  }

  // 6. Route by mode
  if (rawBody.mode === 'material') {
    const rawImages = rawBody.images
    if (!Array.isArray(rawImages) || rawImages.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'يجب إرفاق صورة واحدة على الأقل.' },
        { status: 400 },
      )
    }
    if (rawImages.length > MAX_IMAGES) {
      return NextResponse.json(
        { ok: false, error: `الحد الأقصى للصور هو ${MAX_IMAGES}.` },
        { status: 400 },
      )
    }
    for (const img of rawImages) {
      if (typeof img !== 'string' || !isValidDataUri(img)) {
        return NextResponse.json(
          { ok: false, error: 'صيغة الصور غير صحيحة. استخدم صور JPEG/PNG/WEBP.' },
          { status: 400 },
        )
      }
    }

    const count =
      typeof rawBody.count === 'number'
        ? Math.min(Math.max(Math.round(rawBody.count), 1), MAX_QUESTIONS)
        : DEFAULT_QUESTIONS
    const extraText = typeof rawBody.extraText === 'string' ? rawBody.extraText.slice(0, 2000) : ''

    const { systemPrompt, userContent } = buildMaterialMessages(
      rawImages as string[],
      extraText,
      count,
    )

    return await callGroqWithRetry(apiKey, {
      model: models.vision,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    })
  }

  if (rawBody.mode === 'qa') {
    const rawPairs = rawBody.pairs
    if (!Array.isArray(rawPairs) || rawPairs.length === 0) {
      return NextResponse.json({ ok: false, error: 'يجب إدخال أسئلة وإجابات.' }, { status: 400 })
    }
    if (rawPairs.length > MAX_PAIRS) {
      return NextResponse.json(
        { ok: false, error: `الحد الأقصى هو ${MAX_PAIRS} سؤالًا.` },
        { status: 400 },
      )
    }

    const pairs: Array<{ question: string; answer: string }> = []
    for (const item of rawPairs) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as Record<string, unknown>).question !== 'string' ||
        typeof (item as Record<string, unknown>).answer !== 'string'
      ) {
        return NextResponse.json({ ok: false, error: 'بيانات الأسئلة غير مكتملة.' }, { status: 400 })
      }
      pairs.push({
        question: String((item as Record<string, unknown>).question).slice(0, 1000),
        answer: String((item as Record<string, unknown>).answer).slice(0, 500),
      })
    }

    const { systemPrompt, userText } = buildQaMessages(pairs)

    return await callGroqWithRetry(apiKey, {
      model: models.text,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000,
    })
  }

  return NextResponse.json(
    { ok: false, error: 'قيمة mode غير مدعومة. استخدم material أو qa.' },
    { status: 400 },
  )
}

// ---------------------------------------------------------------------------
// Groq call with one-time retry on parse failure
// ---------------------------------------------------------------------------

async function callGroqWithRetry(
  apiKey: string,
  payload: object,
): Promise<NextResponse<GenerateExamResponse>> {
  const result = await callGroq(apiKey, payload)
  if (result.ok) return NextResponse.json(result)

  // Retry once on content parse errors (not on network/rate-limit/auth errors)
  if (result.retryable) {
    const retry = await callGroq(apiKey, payload)
    if (retry.ok) return NextResponse.json(retry)
    return NextResponse.json({ ok: false, error: retry.error }, { status: 502 })
  }

  return NextResponse.json({ ok: false, error: result.error }, { status: result.status ?? 502 })
}

type CallResult =
  | { ok: true; questions: GeneratedQuestion[] }
  | { ok: false; error: string; retryable?: boolean; status?: number }

async function callGroq(apiKey: string, payload: object): Promise<CallResult> {
  let groqRes: Response
  try {
    groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, error: 'تعذر الاتصال بخدمة الذكاء الاصطناعي.', status: 502 }
  }

  if (!groqRes.ok) {
    const status = groqRes.status
    if (status === 429) {
      return {
        ok: false,
        error: 'تجاوزت حد الطلبات. انتظر لحظة وحاول مجددًا.',
        status: 429,
      }
    }
    return {
      ok: false,
      error: `خطأ في خدمة الذكاء الاصطناعي (${status}).`,
      status: 502,
    }
  }

  let groqData: unknown
  try {
    groqData = await groqRes.json()
  } catch {
    return {
      ok: false,
      error: 'استجابة غير صالحة من خدمة الذكاء الاصطناعي.',
      retryable: true,
      status: 502,
    }
  }

  const content =
    groqData &&
    typeof groqData === 'object' &&
    'choices' in groqData &&
    Array.isArray((groqData as { choices: unknown[] }).choices) &&
    (groqData as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message
      ?.content

  if (typeof content !== 'string') {
    return {
      ok: false,
      error: 'لم يتم استلام محتوى من الذكاء الاصطناعي.',
      retryable: true,
      status: 502,
    }
  }

  const parsed = parseGroqContent(content)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, retryable: true, status: 502 }
  }

  return { ok: true, questions: parsed.questions }
}
