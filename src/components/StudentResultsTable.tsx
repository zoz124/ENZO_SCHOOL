'use client'

import { useState } from 'react'
import { Icon } from './Icon'

export type QuestionDetail = {
  id?: string | null
  prompt: string
  options: { text: string; id?: string | null }[]
  correctOption: number
  points?: number | null
}

export type StudentAttempt = {
  id: string | number
  studentName: string
  startedAt?: string | null
  submittedAt?: string | null
  durationSeconds?: number | null
  score: number
  maxScore: number
  wrongCount: number
  status: 'in-progress' | 'submitted' | 'auto-submitted'
  answers?:
    | {
        questionId: string
        selectedOption: number
        isCorrect: boolean
      }[]
    | null
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

const formatDuration = (seconds?: number | null) => {
  const total = seconds ?? 0
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes === 0) return `${rest} ثانية`
  return `${minutes} د و ${rest} ث`
}

export function StudentResultsTable({
  attempts,
  questions,
}: {
  attempts: StudentAttempt[]
  questions: QuestionDetail[]
}) {
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | number | null>(null)
  const [onlyWrongFilter, setOnlyWrongFilter] = useState(false)

  const toggleExpand = (id: string | number) => {
    setExpandedAttemptId((prev) => (prev === id ? null : id))
  }

  if (attempts.length === 0) {
    return (
      <div className="py-16 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#f5edef] text-[#721b3b]">
          <Icon name="users" className="size-8" />
        </span>
        <h3 className="mt-5 font-black text-[#321921]">لم يدخل أي طالب بعد</h3>
        <p className="mt-2 text-sm text-[#927d84]">
          انسخ رابط الامتحان وأرسله للطلاب، وستظهر النتائج ووقت الدخول والخروج وتفاصيل أخطاء كل طالب هنا فور التسليم.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] text-right text-sm">
        <thead className="bg-[#faf7f4] text-xs text-[#927d84]">
          <tr>
            <th className="px-6 py-4 font-bold">الطالب</th>
            <th className="px-6 py-4 font-bold">وقت الدخول (البدء)</th>
            <th className="px-6 py-4 font-bold">وقت الخروج (التسليم)</th>
            <th className="px-6 py-4 font-bold">مدة الحل</th>
            <th className="px-6 py-4 font-bold">النتيجة</th>
            <th className="px-6 py-4 font-bold">الأخطاء</th>
            <th className="px-6 py-4 font-bold">الحالة</th>
            <th className="px-6 py-4 font-bold text-center">تفاصيل الأخطاء</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8ea]">
          {attempts.map((attempt) => {
            const isExpanded = expandedAttemptId === attempt.id
            const percent = attempt.maxScore
              ? Math.round((attempt.score / attempt.maxScore) * 100)
              : 0

            return (
              <tbody key={attempt.id} className="divide-y divide-[#f0e8ea]">
                <tr className={`transition hover:bg-[#fdfaf8] ${isExpanded ? 'bg-[#fcf7f8]' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f3e7eb] text-xs font-black text-[#721b3b]">
                        {attempt.studentName.trim().charAt(0)}
                      </span>
                      <strong className="font-black text-[#321921]">{attempt.studentName}</strong>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-[#624e54]" dir="ltr">
                    <span className="block text-right">{formatDateTime(attempt.startedAt)}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-[#624e54]" dir="ltr">
                    <span className="block text-right">{formatDateTime(attempt.submittedAt)}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#4c363d]">
                    {formatDuration(attempt.durationSeconds)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#721b3b]">
                        {attempt.score} / {attempt.maxScore}
                      </span>
                      <span className="text-xs text-[#a08a91]">({percent}%)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {attempt.wrongCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                        {attempt.wrongCount} خطأ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        كامل ✔️
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-black ${
                        attempt.status === 'auto-submitted'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {attempt.status === 'auto-submitted' ? 'تسليم تلقائي' : 'تم التسليم'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleExpand(attempt.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        isExpanded
                          ? 'bg-[#721b3b] text-white shadow-sm'
                          : 'bg-[#f4ebea] text-[#721b3b] hover:bg-[#ebd9dc]'
                      }`}
                    >
                      <Icon name="eye" className="size-4" />
                      {isExpanded ? 'إخفاء' : 'عرض الأخطاء'}
                    </button>
                  </td>
                </tr>

                {/* التفاصيل المنسدلة لإجابات الطالب */}
                {isExpanded && (
                  <tr>
                    <td colSpan={8} className="bg-[#fcf8f6] p-6">
                      <div className="rounded-2xl border border-[#ebd7dc] bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#f2e6e8] pb-4">
                          <div>
                            <h4 className="font-black text-[#321921] text-base">
                              تفاصيل إجابات الطالب: {attempt.studentName}
                            </h4>
                            <p className="mt-1 text-xs text-[#9c858d]">
                              استعراض الأسئلة ومعرفة الإجابات الصحيحة والخاطئة بدقة
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setOnlyWrongFilter(false)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                !onlyWrongFilter
                                  ? 'bg-[#721b3b] text-white'
                                  : 'bg-[#f0e4e7] text-[#721b3b] hover:bg-[#e6d3d7]'
                              }`}
                            >
                              كل الأسئلة ({questions.length})
                            </button>
                            <button
                              onClick={() => setOnlyWrongFilter(true)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                onlyWrongFilter
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              الأسئلة الخاطئة فقط ({attempt.wrongCount})
                            </button>
                          </div>
                        </div>

                        <div className="mt-5 space-y-4">
                          {questions
                            .filter((q, idx) => {
                              if (!onlyWrongFilter) return true
                              const ans = attempt.answers?.find(
                                (a) => String(a.questionId) === String(q.id ?? idx),
                              )
                              return !ans || !ans.isCorrect
                            })
                            .map((question, qIdx) => {
                              const answer = attempt.answers?.find(
                                (a) => String(a.questionId) === String(question.id ?? qIdx),
                              )
                              const isCorrect = Boolean(answer?.isCorrect)
                              const selectedOpt = answer?.selectedOption ?? -1

                              return (
                                <div
                                  key={question.id ?? qIdx}
                                  className={`rounded-xl border p-4 transition ${
                                    isCorrect
                                      ? 'border-emerald-200 bg-emerald-50/40'
                                      : 'border-red-200 bg-red-50/40'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`grid size-6 place-items-center rounded-full text-xs font-black text-white ${
                                          isCorrect ? 'bg-emerald-600' : 'bg-red-600'
                                        }`}
                                      >
                                        {isCorrect ? '✓' : '✕'}
                                      </span>
                                      <strong className="text-sm font-bold text-[#321921]">
                                        س {qIdx + 1}: {question.prompt}
                                      </strong>
                                    </div>
                                    <span className="text-xs font-bold text-[#8d777e]">
                                      {question.points ?? 1} درجة
                                    </span>
                                  </div>

                                  {/* الخيارات */}
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {question.options.map((option, optIdx) => {
                                      const isSelectedByStudent = selectedOpt === optIdx
                                      const isCorrectModelAnswer =
                                        question.correctOption === optIdx

                                      let optStyle = 'border-stone-200 bg-white text-stone-700'
                                      let badge = null

                                      if (isCorrectModelAnswer) {
                                        optStyle =
                                          'border-emerald-500 bg-emerald-100/70 text-emerald-900 font-bold'
                                        badge = (
                                          <span className="mr-auto rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                                            الإجابة الصحيحة النموذجية ✔️
                                          </span>
                                        )
                                      } else if (isSelectedByStudent && !isCorrect) {
                                        optStyle =
                                          'border-red-500 bg-red-100/70 text-red-900 font-bold'
                                        badge = (
                                          <span className="mr-auto rounded-md bg-red-600 px-2 py-0.5 text-[10px] text-white">
                                            إجابة الطالب الخاطئة ❌
                                          </span>
                                        )
                                      }

                                      return (
                                        <div
                                          key={optIdx}
                                          className={`flex items-center justify-between rounded-lg border p-2.5 text-xs ${optStyle}`}
                                        >
                                          <span>{option.text}</span>
                                          {badge}
                                        </div>
                                      )
                                    })}
                                  </div>

                                  {selectedOpt === -1 && (
                                    <p className="mt-2 text-xs font-bold text-amber-700">
                                      ⚠️ لم يُجب الطالب على هذا السؤال قبل التسليم.
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
