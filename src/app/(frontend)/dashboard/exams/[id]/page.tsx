import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { Icon } from '@/components/Icon'
import { getCurrentTeacher } from '@/lib/teacher-auth'

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-EG', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(value))
    : '—'

const formatDuration = (seconds?: number | null) => {
  const total = seconds ?? 0
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export default async function ExamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) return null
  const { id } = await params
  const payload = await getPayload({ config })

  let exam
  try {
    exam = await payload.findByID({
      collection: 'exams',
      id,
      user: teacher,
      overrideAccess: false,
      depth: 0,
    })
  } catch {
    notFound()
  }
  if (!exam) notFound()

  const attempts = await payload.find({
    collection: 'exam-attempts',
    user: teacher,
    overrideAccess: false,
    depth: 0,
    where: {
      and: [{ exam: { equals: exam.id } }, { status: { not_equals: 'in-progress' } }],
    },
    sort: '-submittedAt',
    limit: 500,
  })

  const average = attempts.docs.length
    ? Math.round(
        attempts.docs.reduce(
          (sum, item) => sum + (item.maxScore ? (item.score / item.maxScore) * 100 : 0),
          0,
        ) / attempts.docs.length,
      )
    : 0

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#8b767d] transition hover:text-[#721b3b]"
      >
        <Icon name="arrow-left" className="size-4 rotate-180" />
        العودة للوحة التحكم
      </Link>

      <section className="mt-6 rounded-3xl bg-[#321921] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70">
                {exam.subject}
              </span>
              <span className="rounded-full bg-[#78a580]/20 px-3 py-1.5 text-xs font-bold text-[#bde0c3]">
                {exam.status === 'active' ? 'نشط الآن' : 'مؤرشف'}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black">{exam.title}</h1>
            <div className="mt-4 flex flex-wrap gap-5 text-xs text-white/55">
              <span className="flex items-center gap-2">
                <Icon name="clock" className="size-4" />
                {exam.durationMinutes} دقيقة
              </span>
              <span className="flex items-center gap-2">
                <Icon name="file" className="size-4" />
                {exam.questions?.length ?? 0} سؤال
              </span>
              <span className="flex items-center gap-2">
                <Icon name="target" className="size-4" />
                {(exam.questions ?? []).reduce((sum, q) => sum + (q.points ?? 1), 0)} درجة
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-bold text-white/45">رابط الطلاب</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code dir="ltr" className="rounded-xl bg-black/20 px-4 py-3 text-xs text-white/75">
                /exam/{exam.code}
              </code>
              <CopyLinkButton path={`/exam/${exam.code}`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ['عدد الطلاب', attempts.totalDocs, 'users' as const],
          ['متوسط النتائج', `${average}%`, 'chart' as const],
          ['عدد الأسئلة', exam.questions?.length ?? 0, 'file' as const],
        ].map(([label, value, icon]) => (
          <article
            key={String(label)}
            className="flex items-center gap-4 rounded-2xl border border-[#eadfe1] bg-white p-5"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f3e7eb] text-[#721b3b]">
              <Icon name={icon as 'users'} className="size-5" />
            </span>
            <div>
              <strong className="block text-2xl font-black text-[#321921]">{value}</strong>
              <span className="text-xs text-[#927d84]">{label}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm">
        <div className="border-b border-[#eee5e7] px-6 py-5">
          <h2 className="text-lg font-black text-[#321921]">نتائج الطلاب</h2>
          <p className="mt-1 text-xs text-[#9b858c]">
            وقت الدخول ومدة الحل والدرجة والأخطاء لكل طالب
          </p>
        </div>
        {attempts.docs.length === 0 ? (
          <div className="py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#f5edef] text-[#721b3b]">
              <Icon name="users" className="size-8" />
            </span>
            <h3 className="mt-5 font-black text-[#321921]">لم يدخل أي طالب بعد</h3>
            <p className="mt-2 text-sm text-[#927d84]">
              انسخ رابط الامتحان وأرسله للطلاب، وستظهر النتائج هنا فور التسليم.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-[#faf7f4] text-xs text-[#927d84]">
                <tr>
                  <th className="px-6 py-4 font-bold">الطالب</th>
                  <th className="px-6 py-4 font-bold">وقت الدخول</th>
                  <th className="px-6 py-4 font-bold">مدة الحل</th>
                  <th className="px-6 py-4 font-bold">الدرجة</th>
                  <th className="px-6 py-4 font-bold">الأخطاء</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e8ea]">
                {attempts.docs.map((attempt) => {
                  const percent = attempt.maxScore
                    ? Math.round((attempt.score / attempt.maxScore) * 100)
                    : 0
                  return (
                    <tr key={attempt.id} className="text-[#4c363d]">
                      <td className="px-6 py-4">
                        <strong className="font-black text-[#321921]">{attempt.studentName}</strong>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#7f6b72]">
                        {formatDateTime(attempt.startedAt)}
                      </td>
                      <td className="px-6 py-4 font-bold" dir="ltr">
                        {formatDuration(attempt.durationSeconds)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-[#721b3b]">
                          {attempt.score}/{attempt.maxScore}
                        </span>
                        <span className="mr-2 text-xs text-[#a08a91]">({percent}%)</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600">{attempt.wrongCount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-[11px] font-black ${attempt.status === 'auto-submitted' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}
                        >
                          {attempt.status === 'auto-submitted' ? 'تلقائي' : 'تم التسليم'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
