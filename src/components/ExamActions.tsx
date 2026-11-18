'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteExamAction, toggleExamStatusAction } from '@/app/(frontend)/actions/exams'
import { Icon } from './Icon'

type ExamActionsProps = {
  examId: string
  currentStatus: 'active' | 'archived'
}

export function ExamActions({ examId, currentStatus }: ExamActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'active' | 'archived'>(currentStatus)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggleStatus = () => {
    setError(null)
    startTransition(async () => {
      const res = await toggleExamStatusAction(examId)
      if (res.ok && res.status) {
        setStatus(res.status)
        router.refresh()
      } else if (res.message) {
        setError(res.message)
      }
    })
  }

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const res = await deleteExamAction(examId)
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else if (res.message) {
        setError(res.message)
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {error && (
        <span className="text-xs font-bold text-red-300 bg-red-950/60 px-3 py-1.5 rounded-lg">
          {error}
        </span>
      )}

      {/* زر إيقاف أو تفعيل الامتحان */}
      <button
        onClick={handleToggleStatus}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:opacity-60 ${
          status === 'active'
            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
        }`}
      >
        <Icon name={status === 'active' ? 'pause' : 'play'} className="size-4" />
        {isPending
          ? 'جاري التعديل...'
          : status === 'active'
            ? 'إيقاف الامتحان مؤقتاً'
            : 'تفعيل الامتحان للطلاب'}
      </button>

      {/* زر حذف الامتحان */}
      {!showConfirmDelete ? (
        <button
          onClick={() => setShowConfirmDelete(true)}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
        >
          <Icon name="trash" className="size-4 text-red-400" />
          حذف الامتحان
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-red-950/80 p-1.5 rounded-xl border border-red-500/40">
          <span className="text-xs font-bold text-red-200 px-2">تأكيد الحذف نهائياً؟</span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 transition"
          >
            {isPending ? 'جاري الحذف...' : 'نعم، احذف'}
          </button>
          <button
            onClick={() => setShowConfirmDelete(false)}
            disabled={isPending}
            className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-white/80 hover:bg-white/20 transition"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  )
}
