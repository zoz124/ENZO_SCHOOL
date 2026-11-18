'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  startAttemptAction,
  submitAttemptAction,
  type SubmissionResult,
} from '@/app/(frontend)/actions/exams'
import { Brand } from './Brand'
import { Icon } from './Icon'

type StudentQuestion = {
  id: string
  prompt: string
  points: number
  options: string[]
}

type ExamRunnerProps = {
  exam: {
    id: string
    title: string
    subject: string
    description?: string
    durationMinutes: number
    questions: StudentQuestion[]
  }
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function ExamRunner({ exam }: ExamRunnerProps) {
  const [studentName, setStudentName] = useState('')
  const [session, setSession] = useState<{
    attemptId: string
    token: string
    deadline: number
  } | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [remaining, setRemaining] = useState(exam.durationMinutes * 60)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const submitting = useRef(false)

  const answeredCount = Object.keys(answers).length
  const progress = exam.questions.length ? (answeredCount / exam.questions.length) * 100 : 0

  const submit = useCallback(async () => {
    if (!session || submitting.current) return
    submitting.current = true
    setMessage('')
    const response = await submitAttemptAction({
      attemptId: session.attemptId,
      token: session.token,
      answers: exam.questions.map((question) => ({
        questionId: question.id,
        selectedOption: answers[question.id] ?? -1,
      })),
    })
    if (!response.ok) {
      submitting.current = false
      setMessage(response.message ?? 'تعذر التسليم.')
      return
    }
    setResult(response)
  }, [answers, exam.questions, session])

  useEffect(() => {
    if (!session || result) return
    // The countdown is derived from the server-issued deadline on every tick,
    // so a refresh, a sleeping tab, or a changed system clock cannot buy the
    // student extra time. The server re-checks the same deadline on submit.
    const tick = () => {
      const left = Math.max(0, Math.round((session.deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) void submit()
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [result, session, submit])

  const totalPoints = useMemo(
    () => exam.questions.reduce((sum, question) => sum + question.points, 0),
    [exam.questions],
  )

  if (!session) {
    return (
      <main className="min-h-screen bg-[#fbf8f2] px-5 py-8" dir="rtl">
        <div className="mx-auto max-w-3xl">
          <header className="flex items-center justify-between">
            <Brand />
            <span className="rounded-full border border-[#e3d7da] bg-white px-4 py-2 text-xs font-bold text-[#8f7a81]">
              بوابة الطالب
            </span>
          </header>
          <section className="mt-16 overflow-hidden rounded-[2rem] border border-[#eadfe1] bg-white shadow-2xl shadow-[#5d2d3b]/8">
            <div className="bg-[#721b3b] px-6 py-10 text-center text-white sm:px-10">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/10">
                <Icon name="file" className="size-8" />
              </span>
              <p className="mt-6 text-sm font-bold text-white/60">{exam.subject}</p>
              <h1 className="mt-2 text-3xl font-black">{exam.title}</h1>
              {exam.description && (
                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/65">
                  {exam.description}
                </p>
              )}
            </div>
            <div className="p-6 sm:p-10">
              <div className="grid grid-cols-3 gap-3">
                {[
                  [exam.questions.length, 'سؤال', 'file' as const],
                  [exam.durationMinutes, 'دقيقة', 'clock' as const],
                  [totalPoints, 'درجة', 'target' as const],
                ].map(([value, label, icon]) => (
                  <div key={String(label)} className="rounded-2xl bg-[#f8f3f1] p-4 text-center">
                    <Icon name={icon as 'file'} className="mx-auto size-5 text-[#721b3b]" />
                    <strong className="mt-2 block text-xl font-black text-[#321921]">
                      {value}
                    </strong>
                    <span className="text-[11px] text-[#927d84]">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl border border-[#eadfe1] p-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#503a41]">
                    اكتب اسمك للبدء
                  </span>
                  <input
                    value={studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    minLength={2}
                    maxLength={80}
                    className="input-field"
                    placeholder="الاسم الثلاثي"
                  />
                </label>
                {message && (
                  <p role="alert" className="mt-3 text-sm font-bold text-red-600">
                    {message}
                  </p>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setMessage('')
                      const response = await startAttemptAction(exam.id, studentName)
                      if (!response.ok || !response.attemptId || !response.token) {
                        setMessage(response.message ?? 'تعذر بدء الامتحان.')
                        return
                      }
                      setSession({
                        attemptId: response.attemptId,
                        token: response.token,
                        deadline:
                          response.deadline ??
                          Date.now() + exam.durationMinutes * 60 * 1000,
                      })
                      if (typeof response.remainingSeconds === 'number') {
                        setRemaining(response.remainingSeconds)
                      }
                    })
                  }
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#721b3b] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#721b3b]/15 disabled:opacity-60"
                >
                  {pending ? 'جاري بدء الامتحان...' : 'ابدأ الامتحان'}
                  {!pending && <Icon name="arrow-left" className="size-5" />}
                </button>
              </div>
              <p className="mt-5 text-center text-xs leading-6 text-[#a08a91]">
                عند الضغط على البدء سيبدأ المؤقت فورًا، وسيتم تسليم إجاباتك تلقائيًا عند انتهاء الوقت.
              </p>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0]" dir="rtl">
      <header className="sticky top-0 z-20 border-b border-[#eadfe1] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#9b858c]">{exam.subject}</p>
            <h1 className="truncate text-sm font-black text-[#321921] sm:text-base">
              {exam.title}
            </h1>
          </div>
          <div
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-black ${remaining <= 60 ? 'bg-red-50 text-red-700' : 'bg-[#f3e7eb] text-[#721b3b]'}`}
            dir="ltr"
          >
            <Icon name="clock" className="size-5" />
            <span>{formatTime(remaining)}</span>
          </div>
        </div>
        <div className="h-1 bg-[#eadfe1]">
          <div className="h-full bg-[#721b3b] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1fr_270px]">
        <div className="space-y-5">
          {exam.questions.map((question, questionIndex) => (
            <article
              id={`q-${question.id}`}
              key={question.id}
              className="scroll-mt-28 rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#721b3b] text-sm font-black text-white">
                  {questionIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-base font-black leading-8 text-[#321921]">
                      {question.prompt}
                    </h2>
                    <span className="shrink-0 rounded-full bg-[#f7f1f0] px-3 py-1 text-[10px] font-bold text-[#927d84]">
                      {question.points} درجة
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {question.options.map((option, optionIndex) => {
                      const selected = answers[question.id] === optionIndex
                      return (
                        <button
                          type="button"
                          key={optionIndex}
                          onClick={() =>
                            setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                          }
                          className={`flex items-center gap-3 rounded-2xl border p-4 text-right text-sm font-semibold transition ${selected ? 'border-[#721b3b] bg-[#f7eef1] text-[#721b3b]' : 'border-[#e8dcdf] bg-white text-[#5f4b51] hover:border-[#721b3b]/35'}`}
                        >
                          <span
                            className={`grid size-7 shrink-0 place-items-center rounded-full border text-[11px] ${selected ? 'border-[#721b3b] bg-[#721b3b] text-white' : 'border-[#d9cbd0] text-[#9b858c]'}`}
                          >
                            {selected ? (
                              <Icon name="check" className="size-4" />
                            ) : (
                              String.fromCharCode(1571 + optionIndex)
                            )}
                          </span>
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </article>
          ))}
          {message && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
            >
              {message}
            </p>
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm lg:sticky lg:top-28">
          <h2 className="font-black text-[#321921]">تقدمك</h2>
          <div className="mt-5 flex items-end justify-between">
            <span className="text-sm text-[#927d84]">تمت الإجابة</span>
            <strong className="text-2xl font-black text-[#721b3b]">
              {answeredCount}
              <small className="text-sm text-[#a08a91]">/{exam.questions.length}</small>
            </strong>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ede4e6]">
            <div
              className="h-full rounded-full bg-[#721b3b] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-6 grid grid-cols-5 gap-2">
            {exam.questions.map((question, index) => (
              <a
                key={question.id}
                href={`#q-${question.id}`}
                className={`grid aspect-square place-items-center rounded-lg text-xs font-black ${answers[question.id] !== undefined ? 'bg-[#721b3b] text-white' : 'bg-[#f5efed] text-[#9a858b]'}`}
              >
                {index + 1}
              </a>
            ))}
          </div>
          <button
            type="button"
            disabled={submitting.current}
            onClick={() => void submit()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#721b3b] px-4 py-3.5 text-sm font-black text-white disabled:opacity-60"
          >
            <Icon name="check" className="size-5" />
            تسليم الامتحان
          </button>
          <p className="mt-3 text-center text-[10px] leading-5 text-[#a08a91]">
            يمكنك التسليم قبل انتهاء الوقت. الأسئلة غير المجابة تُحسب خطأ.
          </p>
        </aside>
      </div>

      {result?.ok && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c161e]/75 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl"
          >
            <div className="bg-[#721b3b] px-6 py-9 text-center text-white">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/12">
                <Icon name="graduation" className="size-8" />
              </span>
              <h2 id="result-title" className="mt-5 text-3xl font-black">
                تم تسليم الامتحان
              </h2>
              <p className="mt-2 text-sm text-white/60">
                أحسنت يا {studentName}، إليك نتيجتك ونموذج الإجابة.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-3 gap-3">
                {[
                  [`${result.score}/${result.maxScore}`, 'الدرجة'],
                  [result.wrongCount ?? 0, 'إجابة خاطئة'],
                  [formatTime(result.durationSeconds ?? 0), 'مدة الحل'],
                ].map(([value, label]) => (
                  <div key={String(label)} className="rounded-2xl bg-[#f8f3f1] p-4 text-center">
                    <strong
                      className="block text-xl font-black text-[#721b3b]"
                      dir={label === 'مدة الحل' ? 'ltr' : 'rtl'}
                    >
                      {value}
                    </strong>
                    <span className="mt-1 block text-[11px] text-[#927d84]">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-black text-[#321921]">نموذج الإجابة</h3>
                <div className="mt-4 space-y-4">
                  {result.modelAnswers?.map((answer, index) => (
                    <article
                      key={index}
                      className={`rounded-2xl border p-5 ${answer.isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-full ${answer.isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                        >
                          <Icon name={answer.isCorrect ? 'check' : 'x'} className="size-4" />
                        </span>
                        <div>
                          <h4 className="text-sm font-black leading-7 text-[#321921]">
                            {index + 1}. {answer.prompt}
                          </h4>
                          <p className="mt-2 text-xs text-[#7f6b72]">
                            إجابتك:{' '}
                            <strong>
                              {answer.selectedOption >= 0
                                ? answer.options[answer.selectedOption]
                                : 'بدون إجابة'}
                            </strong>
                          </p>
                          {!answer.isCorrect && (
                            <p className="mt-1 text-xs text-green-700">
                              الإجابة الصحيحة:{' '}
                              <strong>{answer.options[answer.correctOption]}</strong>
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="mt-7 w-full rounded-2xl bg-[#321921] px-5 py-4 text-sm font-black text-white"
              >
                العودة للصفحة الرئيسية
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
