/**
 * Groq chat-completions client for the AI Exam Generator.
 *
 * Kept separate from the route handler so the status mapping and retry logic
 * can be unit-tested with a mocked `fetch`.
 *
 * Logging rule: never log the API key, request headers, or request bodies.
 * Only the route path, a fixed failure reason, the upstream HTTP status and
 * the model name are logged.
 */

import type { GeneratedQuestion } from '@/app/api/generate-exam/route'
import { parseGroqContent } from '@/lib/ai-exam-utils'

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/** Route path used in server logs. */
export const ROUTE_PATH = '/api/generate-exam'

export type CallResult =
  | { ok: true; questions: GeneratedQuestion[] }
  | { ok: false; error: string; retryable?: boolean; status?: number }

/**
 * Map an upstream Groq HTTP status to our own status code and Arabic message.
 *
 * Each failure gets a distinct message so the UI can tell a bad key apart from
 * a missing model or a rate limit. Only a missing key produces 503, and that
 * check lives in the route, not here.
 */
export function mapGroqFailure(upstreamStatus: number): { error: string; status: number } {
  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return { error: 'مفتاح Groq غير صالح. تحقق من إعدادات المفتاح.', status: 502 }
  }
  if (upstreamStatus === 404) {
    return { error: 'موديل Groq غير متاح. تحقق من اسم الموديل.', status: 502 }
  }
  if (upstreamStatus === 429) {
    return { error: 'تجاوزت حد الطلبات. انتظر لحظة وحاول مجددًا.', status: 429 }
  }
  return { error: `خطأ في خدمة الذكاء الاصطناعي (${upstreamStatus}).`, status: 502 }
}

/** Safe server log: route, reason, and for upstream errors the status + model. */
export function logFailure(
  reason: string,
  detail: { upstreamStatus?: number; model?: string } = {},
) {
  const parts = [`route=${ROUTE_PATH}`, `reason=${reason}`]
  if (detail.upstreamStatus !== undefined) parts.push(`upstream=${detail.upstreamStatus}`)
  if (detail.model !== undefined) parts.push(`model=${detail.model}`)
  console.error(`[generate-exam] ${parts.join(' ')}`)
}

/** Single Groq call. Returns a structured failure instead of throwing. */
export async function callGroq(
  apiKey: string,
  payload: object,
  model: string,
): Promise<CallResult> {
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
    logFailure('network_error', { model })
    return { ok: false, error: 'تعذر الاتصال بخدمة الذكاء الاصطناعي.', status: 502 }
  }

  if (!groqRes.ok) {
    const mapped = mapGroqFailure(groqRes.status)
    logFailure('upstream_error', { upstreamStatus: groqRes.status, model })
    return { ok: false, error: mapped.error, status: mapped.status }
  }

  let groqData: unknown
  try {
    groqData = await groqRes.json()
  } catch {
    logFailure('upstream_invalid_json', { upstreamStatus: groqRes.status, model })
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
    logFailure('upstream_empty_content', { upstreamStatus: groqRes.status, model })
    return {
      ok: false,
      error: 'لم يتم استلام محتوى من الذكاء الاصطناعي.',
      retryable: true,
      status: 502,
    }
  }

  const parsed = parseGroqContent(content)
  if (!parsed.ok) {
    logFailure('output_parse_failed', { upstreamStatus: groqRes.status, model })
    return { ok: false, error: parsed.error, retryable: true, status: 502 }
  }

  return { ok: true, questions: parsed.questions }
}

/**
 * Calls Groq, retrying once on content-parse failures. Auth, model-not-found
 * and rate-limit failures are not retried: they will not fix themselves.
 */
export async function callGroqWithRetry(
  apiKey: string,
  payload: object,
  model: string,
): Promise<CallResult> {
  const result = await callGroq(apiKey, payload, model)
  if (result.ok) return result

  if (result.retryable) {
    const retry = await callGroq(apiKey, payload, model)
    if (retry.ok) return retry
    return { ok: false, error: retry.error, status: retry.status ?? 502 }
  }

  return result
}
