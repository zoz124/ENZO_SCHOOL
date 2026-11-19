'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createExamAction } from '@/app/(frontend)/actions/exams'
import { Icon } from './Icon'
import { AI_QUESTIONS_STORAGE_KEY } from './AiExamGenerator'

type BuilderQuestion = {
  prompt: string
  options: string[]
  correctOption: number
  points: number
}

const emptyQuestion = (): BuilderQuestion => ({
  prompt: '',
  options: ['', ''],
  correctOption: 0,
  points: 1,
})

export function ExamBuilder() {
  const router = useRouter()
  const [questions, setQuestions] = useState<BuilderQuestion[]>([emptyQuestion()])
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  // On first mount, check for AI-generated questions handed off via sessionStorage.
  // This is a one-time read; we clear the key immediately so a page refresh
  // doesn't re-apply stale questions.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(AI_QUESTIONS_STORAGE_KEY)
      if (!stored) return
      sessionStorage.removeItem(AI_QUESTIONS_STORAGE_KEY)
      const parsed = JSON.parse(stored) as unknown
      if (!Array.isArray(parsed) || parsed.length === 0) return
      const loaded: BuilderQuestion[] = (parsed as unknown[])
        .filter(
          (q): q is BuilderQuestion =>
            !!q &&
            typeof q === 'object' &&
            typeof (q as BuilderQuestion).prompt === 'string' &&
            Array.isArray((q as BuilderQuestion).options) &&
            typeof (q as BuilderQuestion).correctOption === 'number',
        )
        .map((q) => ({
          prompt: q.prompt,
          options: q.options.length >= 2 ? q.options : [...q.options, ''],
          correctOption: q.correctOption,
          points: typeof q.points === 'number' && q.points >= 1 ? q.points : 1,
        }))
      if (loaded.length > 0) setQuestions(loaded)
    } catch {
      // sessionStorage may be unavailable (e.g. private browsing on some
      // browsers). Silently ignore — the builder still starts with an empty question.
    }
  }, [])
  const updateQuestion = (index: number, patch: Partial<BuilderQuestion>) => {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    )
  }

  const submit = (formData: FormData) => {
    setMessage('')
    startTransition(async () => {
      const result = await createExamAction({
        title: String(formData.get('title') ?? ''),
        subject: String(formData.get('subject') ?? ''),
        description: String(formData.get('description') ?? ''),
        durationMinutes: Number(formData.get('durationMinutes') ?? 0),
        questions,
      })
      if (!result.ok || !result.examId) {
        setMessage(result.message ?? 'تعذر إنشاء الامتحان.')
        return
      }
      router.push(`/dashboard/exams/${result.examId}`)
      router.refresh()
    })
  }

  return (
    <form action={submit} className="mt-8 space-y-6">
      <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#f3e7eb] font-black text-[#721b3b]">
            1
          </span>
          <div>
            <h2 className="font-black text-[#321921]">بيانات الامتحان</h2>
            <p className="mt-1 text-xs text-[#9b858c]">المعلومات التي ستظهر للطالب قبل البداية</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">اسم الامتحان</span>
            <input
              name="title"
              required
              minLength={3}
              className="input-field"
              placeholder="امتحان الوحدة الثالثة"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">المادة</span>
            <input
              name="subject"
              required
              minLength={2}
              className="input-field"
              placeholder="الرياضيات"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">
              وصف قصير <small className="font-normal text-[#a59096]">(اختياري)</small>
            </span>
            <textarea
              name="description"
              maxLength={500}
              rows={3}
              className="input-field resize-none"
              placeholder="تعليمات أو ملاحظات للطلاب..."
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">
              مدة الامتحان بالدقائق
            </span>
            <div className="relative">
              <Icon
                name="clock"
                className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-[#a58e95]"
              />
              <input
                name="durationMinutes"
                type="number"
                required
                min={1}
                max={300}
                defaultValue={30}
                className="input-field pr-12"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-[#eadfe1] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#f3e7eb] font-black text-[#721b3b]">
              2
            </span>
            <div>
              <h2 className="font-black text-[#321921]">أسئلة الامتحان</h2>
              <p className="mt-1 text-xs text-[#9b858c]">
                {questions.length} {questions.length === 1 ? 'سؤال' : 'أسئلة'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f5edef] px-4 py-2.5 text-xs font-black text-[#721b3b] transition hover:bg-[#eadce1]"
          >
            <Icon name="plus" className="size-4" /> إضافة سؤال
          </button>
        </div>

        <div className="space-y-5">
          {questions.map((question, questionIndex) => (
            <article
              key={questionIndex}
              className="rounded-2xl border border-[#eadfe1] bg-[#fdfbf9] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <strong className="text-sm text-[#721b3b]">السؤال {questionIndex + 1}</strong>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((current) => current.filter((_, i) => i !== questionIndex))
                    }
                    className="grid size-9 place-items-center rounded-xl text-[#a28c93] transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`حذف السؤال ${questionIndex + 1}`}
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                )}
              </div>
              <textarea
                value={question.prompt}
                onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })}
                rows={2}
                maxLength={500}
                className="input-field resize-none"
                placeholder="اكتب نص السؤال هنا..."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(questionIndex, { correctOption: optionIndex })}
                      className={`grid size-10 shrink-0 place-items-center rounded-xl border text-xs font-black transition ${question.correctOption === optionIndex ? 'border-[#721b3b] bg-[#721b3b] text-white' : 'border-[#ddd0d4] bg-white text-[#9a858b]'}`}
                      aria-label={`تعيين الاختيار ${optionIndex + 1} كإجابة صحيحة`}
                    >
                      {question.correctOption === optionIndex ? (
                        <Icon name="check" className="size-4" />
                      ) : (
                        optionIndex + 1
                      )}
                    </button>
                    <input
                      value={option}
                      onChange={(event) => {
                        const options = [...question.options]
                        options[optionIndex] = event.target.value
                        updateQuestion(questionIndex, { options })
                      }}
                      className="input-field"
                      placeholder={`الاختيار ${optionIndex + 1}`}
                    />
                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const options = question.options.filter((_, i) => i !== optionIndex)
                          updateQuestion(questionIndex, {
                            options,
                            correctOption: Math.min(question.correctOption, options.length - 1),
                          })
                        }}
                        className="grid size-9 shrink-0 place-items-center text-[#b29fa5] hover:text-red-600"
                        aria-label="حذف الاختيار"
                      >
                        <Icon name="x" className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                {question.options.length < 8 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(questionIndex, { options: [...question.options, ''] })
                    }
                    className="text-xs font-black text-[#721b3b] hover:underline"
                  >
                    + إضافة اختيار
                  </button>
                )}
                <label className="flex items-center gap-2 text-xs font-bold text-[#7f6b72]">
                  الدرجة
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={question.points}
                    onChange={(event) =>
                      updateQuestion(questionIndex, { points: Number(event.target.value) })
                    }
                    className="w-20 rounded-xl border border-[#ddd0d4] bg-white px-3 py-2 text-center outline-none focus:border-[#721b3b]"
                  />
                </label>
              </div>
              <p className="mt-4 text-[11px] text-[#9f8a91]">
                اضغط على رقم الاختيار لتحديد الإجابة الصحيحة.
              </p>
            </article>
          ))}
        </div>
      </section>

      {message && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700"
        >
          {message}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-2xl border border-[#ddd0d4] bg-white px-6 py-3.5 text-sm font-bold text-[#766269]"
        >
          إلغاء
        </button>
        <button
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#721b3b] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#721b3b]/15 disabled:opacity-60"
        >
          <Icon name="check" className="size-5" />
          {pending ? 'جاري إنشاء الامتحان...' : 'إنشاء الامتحان والرابط'}
        </button>
      </div>
    </form>
  )
}
