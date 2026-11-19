'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from './Icon'
import type { GeneratedQuestion, GenerateExamResponse } from '@/app/api/generate-exam/route'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_RAW_TEXT_CHARS,
  MAX_REQUEST_BYTES,
  isPayloadWithinLimit,
  parseFreeformQa,
  resizeImageToDataUri,
  shuffleOptions,
} from '@/lib/ai-exam-utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_IMAGES = 3

/** Key used to hand off generated questions to ExamBuilder via sessionStorage. */
export const AI_QUESTIONS_STORAGE_KEY = 'ai-generated-questions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = 'material' | 'qa'

type QaPair = {
  id: string
  question: string
  answer: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black transition ${
        active
          ? 'bg-[#721b3b] text-white shadow-lg shadow-[#721b3b]/15'
          : 'bg-[#f5edef] text-[#721b3b] hover:bg-[#eadce1]'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Shuffles options exactly once (on mount) using the stable-initialiser form
 * of useState so the shuffle is not re-run on every parent render.
 */
function QuestionCard({ q, index }: { q: GeneratedQuestion; index: number }) {
  const [revealed, setRevealed] = useState(false)
  // Shuffle once on mount — the () => ... initialiser is only called once.
  const [options] = useState<string[]>(() => shuffleOptions(q.correct, q.wrong))

  return (
    <article className="rounded-2xl border border-[#eadfe1] bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-[#721b3b]">السؤال {index + 1}</p>
      <p className="mt-2 font-bold leading-7 text-[#321921]">{q.question}</p>

      <ul className="mt-4 space-y-2" dir="auto">
        {options.map((opt, i) => {
          const isCorrect = opt === q.correct
          return (
            <li
              // Use index-based key; the options array is stable (never mutated)
              key={i}
              className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm transition ${
                revealed && isCorrect
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : revealed && !isCorrect
                    ? 'border-red-200 bg-red-50/50 text-red-700'
                    : 'border-[#eadfe1] text-[#4c363d]'
              }`}
            >
              {revealed && isCorrect ? (
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-green-600" />
              ) : revealed ? (
                <Icon name="x" className="mt-0.5 size-4 shrink-0 text-red-400" />
              ) : (
                <span className="mt-0.5 size-4 shrink-0 rounded-full border border-current" />
              )}
              {opt}
            </li>
          )
        })}
      </ul>

      {revealed && q.explanation && (
        <p className="mt-4 rounded-xl bg-[#fdf8f4] px-4 py-3 text-sm leading-7 text-[#80622a]">
          <strong>التفسير: </strong>
          {q.explanation}
        </p>
      )}

      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="mt-4 text-xs font-black text-[#721b3b] hover:underline"
      >
        {revealed ? 'إخفاء الإجابة' : 'إظهار الإجابة الصحيحة'}
      </button>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AiExamGenerator() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('material')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null)

  // Material mode
  const [images, setImages] = useState<File[]>([])
  const [extraText, setExtraText] = useState('')
  const [count, setCount] = useState(5)
  const [resizing, setResizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // QA mode
  const [qaPairs, setQaPairs] = useState<QaPair[]>([
    { id: crypto.randomUUID(), question: '', answer: '' },
  ])
  const [rawQaText, setRawQaText] = useState('')
  const [qaInputMode, setQaInputMode] = useState<'structured' | 'freeform'>('freeform')

  // ---- File handling ----
  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const incoming = Array.from(files).filter((f) =>
      (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type),
    )
    if (incoming.length === 0) {
      setError('استخدم صور JPEG أو PNG أو WEBP فقط.')
      return
    }

    const slots = MAX_IMAGES - images.length
    if (slots <= 0) {
      setError(`الحد الأقصى ${MAX_IMAGES} صور.`)
      return
    }

    setError(null)
    setResizing(true)
    try {
      const resized = await Promise.all(
        incoming.slice(0, slots).map((f) => resizeImageToDataUri(f, 1400, 0.8)),
      )
      // Store resized data URIs as pseudo-File objects so thumbnail preview works.
      // We keep them as strings in a parallel state.
      setImages((prev) => {
        const combined = [...prev, ...incoming.slice(0, slots)]
        return combined.slice(0, MAX_IMAGES)
      })
      // Store the already-resized data URIs to avoid re-encoding on submit.
      setResizedUris((prev) => [...prev, ...resized].slice(0, MAX_IMAGES))
    } catch {
      setError('تعذر معالجة الصور. تأكد من صحة الملفات وحاول مرة أخرى.')
    } finally {
      setResizing(false)
    }
  }

  // Parallel state for pre-resized data URIs (avoids re-encoding on submit).
  const [resizedUris, setResizedUris] = useState<string[]>([])

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setResizedUris((prev) => prev.filter((_, i) => i !== index))
  }

  // ---- QA pair helpers ----
  const updatePair = (id: string, field: 'question' | 'answer', value: string) =>
    setQaPairs((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))

  const addPair = () =>
    setQaPairs((prev) => [...prev, { id: crypto.randomUUID(), question: '', answer: '' }])

  const removePair = (id: string) => setQaPairs((prev) => prev.filter((p) => p.id !== id))

  // ---- Submit ----
  const handleSubmit = () => {
    setError(null)
    setQuestions(null)

    startTransition(async () => {
      try {
        let bodyJson: string

        if (mode === 'material') {
          if (resizedUris.length === 0) {
            setError('أرفق صورة واحدة على الأقل.')
            return
          }
          const payload = { mode: 'material', images: resizedUris, extraText, count }
          bodyJson = JSON.stringify(payload)
        } else {
          let pairs: Array<{ question: string; answer: string }>

          if (qaInputMode === 'freeform') {
            pairs = parseFreeformQa(rawQaText)

            // Fallback: the text is not empty but no س:/ج: pairs were
            // recognised. Send the raw text and let the model extract the
            // pairs itself. Output validation and shuffling stay in code.
            if (pairs.length === 0) {
              const rawText = rawQaText.trim().slice(0, MAX_RAW_TEXT_CHARS)
              if (!rawText) {
                setError('أدخل سؤالًا وإجابة واحدة على الأقل.')
                return
              }
              bodyJson = JSON.stringify({ mode: 'qa', rawText })
            } else {
              bodyJson = JSON.stringify({ mode: 'qa', pairs })
            }
          } else {
            pairs = qaPairs.filter((p) => p.question.trim() && p.answer.trim())
            if (pairs.length === 0) {
              setError('أدخل سؤالًا وإجابة واحدة على الأقل.')
              return
            }
            bodyJson = JSON.stringify({ mode: 'qa', pairs })
          }
        }

        // Client-side payload size guard
        if (!isPayloadWithinLimit(bodyJson)) {
          setError(
            `حجم الطلب كبير جدًا (يتجاوز ${(MAX_REQUEST_BYTES / 1024 / 1024).toFixed(1)} ميجابايت). قلّل عدد الصور أو حجمها.`,
          )
          return
        }

        const res = await fetch('/api/generate-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyJson,
        })

        const data: GenerateExamResponse = await res.json()
        if (!data.ok) {
          setError(data.error)
          return
        }
        setQuestions(data.questions)
      } catch {
        setError('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.')
      }
    })
  }

  // ---- Load questions into ExamBuilder ----
  const handleLoadIntoBuilder = () => {
    if (!questions) return
    // Map GeneratedQuestion → BuilderQuestion shape
    const builderQuestions = questions.map((q) => {
      const opts = shuffleOptions(q.correct, q.wrong)
      const correctIndex = opts.indexOf(q.correct)
      return {
        prompt: q.question,
        options: opts,
        correctOption: correctIndex === -1 ? 0 : correctIndex,
        points: 1,
      }
    })
    try {
      sessionStorage.setItem(AI_QUESTIONS_STORAGE_KEY, JSON.stringify(builderQuestions))
      router.push('/dashboard/exams/new')
    } catch {
      setError('تعذر نقل الأسئلة. جرّب نسخها يدويًا.')
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="mt-6 space-y-6" dir="rtl">
      {/* Mode selector */}
      <div className="flex gap-2 rounded-3xl bg-[#f5edef] p-1.5">
        <ModeTab
          active={mode === 'material'}
          onClick={() => {
            setMode('material')
            setError(null)
            setQuestions(null)
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="book" className="size-4" />
            من مادة تعليمية
          </span>
        </ModeTab>
        <ModeTab
          active={mode === 'qa'}
          onClick={() => {
            setMode('qa')
            setError(null)
            setQuestions(null)
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="file" className="size-4" />
            من أسئلة وإجابات
          </span>
        </ModeTab>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODE A: Material                                                     */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'material' && (
        <section className="space-y-5 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-black text-[#321921]">ارفع المادة التعليمية</h2>
            <p className="mt-1 text-xs text-[#9b858c]">
              حتى {MAX_IMAGES} صور (JPEG / PNG / WEBP) · تُضغط تلقائيًا قبل الإرسال
            </p>
          </div>

          {/* Drop zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void handleFiles(e.dataTransfer.files)
            }}
            disabled={images.length >= MAX_IMAGES || resizing}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#ddd0d4] bg-[#fdf9fa] py-10 text-sm font-bold text-[#9a858b] transition hover:border-[#721b3b] hover:text-[#721b3b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resizing ? (
              <>
                <div className="size-6 animate-spin rounded-full border-2 border-[#ddd0d4] border-t-[#721b3b]" />
                جارٍ ضغط الصورة...
              </>
            ) : (
              <>
                <Icon name="plus" className="size-8" />
                {images.length === 0 ? 'انقر أو اسحب الصور هنا' : 'إضافة صورة أخرى'}
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />

          {/* Thumbnail strip */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((file, i) => (
                <div
                  key={i}
                  className="relative size-24 overflow-hidden rounded-2xl border border-[#eadfe1] bg-[#f8f3f1]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="حذف الصورة"
                  >
                    <Icon name="x" className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Optional extra text */}
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">
              نص إضافي <small className="font-normal text-[#a59096]">(اختياري)</small>
            </span>
            <textarea
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              rows={3}
              maxLength={2000}
              className="input-field resize-none"
              placeholder="تعليمات إضافية أو تلميحات للنموذج..."
            />
          </label>

          {/* Question count */}
          <label className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#503a41]">عدد الأسئلة:</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-20 rounded-xl border border-[#ddd0d4] bg-white px-3 py-2 text-center text-sm outline-none focus:border-[#721b3b]"
            />
          </label>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODE B: QA                                                           */}
      {/* ------------------------------------------------------------------ */}
      {mode === 'qa' && (
        <section className="space-y-5 rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-black text-[#321921]">أسئلة مع إجاباتها الصحيحة</h2>
            <p className="mt-1 text-xs text-[#9b858c]">
              سيُنشئ الذكاء الاصطناعي 3 خيارات خاطئة لكل سؤال، مع الحفاظ على نص السؤال والإجابة
              الصحيحة.
            </p>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-2 text-xs font-black">
            <button
              type="button"
              onClick={() => setQaInputMode('freeform')}
              className={`rounded-xl px-4 py-2 transition ${
                qaInputMode === 'freeform'
                  ? 'bg-[#721b3b] text-white'
                  : 'bg-[#f5edef] text-[#721b3b] hover:bg-[#eadce1]'
              }`}
            >
              نص حر
            </button>
            <button
              type="button"
              onClick={() => setQaInputMode('structured')}
              className={`rounded-xl px-4 py-2 transition ${
                qaInputMode === 'structured'
                  ? 'bg-[#721b3b] text-white'
                  : 'bg-[#f5edef] text-[#721b3b] hover:bg-[#eadce1]'
              }`}
            >
              نموذج منظّم
            </button>
          </div>

          {qaInputMode === 'freeform' ? (
            <div>
              <p className="mb-2 text-xs text-[#9b858c]">
                اكتب كل سؤال على شكل <code className="rounded bg-[#f5edef] px-1">س: نص السؤال</code>{' '}
                ثم <code className="rounded bg-[#f5edef] px-1">ج: الإجابة</code>
              </p>
              <textarea
                value={rawQaText}
                onChange={(e) => setRawQaText(e.target.value)}
                rows={10}
                className="input-field resize-y font-mono text-sm"
                placeholder={
                  'س: ما هو عاصمة المملكة العربية السعودية؟\nج: الرياض\n\nس: ما هو أكبر كوكب في المجموعة الشمسية؟\nج: المشتري'
                }
                dir="auto"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {qaPairs.map((pair, i) => (
                <div key={pair.id} className="rounded-2xl border border-[#eadfe1] bg-[#fdfbf9] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <strong className="text-sm text-[#721b3b]">سؤال {i + 1}</strong>
                    {qaPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePair(pair.id)}
                        className="grid size-8 place-items-center rounded-xl text-[#a28c93] hover:bg-red-50 hover:text-red-600"
                        aria-label="حذف السؤال"
                      >
                        <Icon name="trash" className="size-4" />
                      </button>
                    )}
                  </div>
                  <input
                    value={pair.question}
                    onChange={(e) => updatePair(pair.id, 'question', e.target.value)}
                    className="input-field mb-3"
                    placeholder="نص السؤال"
                    dir="auto"
                  />
                  <input
                    value={pair.answer}
                    onChange={(e) => updatePair(pair.id, 'answer', e.target.value)}
                    className="input-field"
                    placeholder="الإجابة الصحيحة"
                    dir="auto"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addPair}
                className="inline-flex items-center gap-2 text-sm font-black text-[#721b3b] hover:underline"
              >
                <Icon name="plus" className="size-4" />
                إضافة سؤال آخر
              </button>
            </div>
          )}
        </section>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      )}

      {/* Generate button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || resizing}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#721b3b] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#721b3b]/15 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          <Icon name="sparkle" className="size-5" />
          {pending ? 'جارٍ التوليد...' : 'توليد الأسئلة'}
        </button>
      </div>

      {/* Loading state */}
      {pending && (
        <div className="rounded-3xl border border-[#eadfe1] bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-[#f5edef] border-t-[#721b3b]" />
          <p className="text-sm font-bold text-[#927d84]">الذكاء الاصطناعي يُولّد الأسئلة…</p>
          <p className="mt-1 text-xs text-[#b4a2a7]">قد يستغرق ذلك بضع ثوانٍ</p>
        </div>
      )}

      {/* Results */}
      {!pending && questions && questions.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#321921]">الأسئلة المُوّلدة</h2>
              <p className="mt-0.5 text-xs text-[#9b858c]">{questions.length} سؤال</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Primary CTA: load into ExamBuilder */}
              <button
                type="button"
                onClick={handleLoadIntoBuilder}
                className="inline-flex items-center gap-2 rounded-xl bg-[#721b3b] px-4 py-2.5 text-xs font-black text-white shadow shadow-[#721b3b]/15 transition hover:-translate-y-0.5"
              >
                <Icon name="plus" className="size-4" />
                إنشاء امتحان من هذه الأسئلة
              </button>
              {/* Secondary: generate again */}
              <button
                type="button"
                onClick={() => {
                  setQuestions(null)
                  setError(null)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f5edef] px-4 py-2.5 text-xs font-black text-[#721b3b] transition hover:bg-[#eadce1]"
              >
                <Icon name="sparkle" className="size-4" />
                توليد جديد
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
