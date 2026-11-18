import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'
import { Icon } from '@/components/Icon'
import { getCurrentTeacher } from '@/lib/teacher-auth'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  )

export default async function DashboardPage() {
  const teacher = await getCurrentTeacher()
  if (!teacher) return null

  const payload = await getPayload({ config })
  const [examsResult, attemptsResult] = await Promise.all([
    payload.find({
      collection: 'exams',
      user: teacher,
      overrideAccess: false,
      depth: 0,
      limit: 50,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'exam-attempts',
      user: teacher,
      overrideAccess: false,
      depth: 0,
      limit: 200,
      sort: '-submittedAt',
    }),
  ])

  const submittedAttempts = attemptsResult.docs.filter(
    (attempt) => attempt.status !== 'in-progress',
  )
  const average =
    submittedAttempts.length > 0
      ? Math.round(
          submittedAttempts.reduce(
            (sum, attempt) =>
              sum + (attempt.maxScore ? (attempt.score / attempt.maxScore) * 100 : 0),
            0,
          ) / submittedAttempts.length,
        )
      : 0

  const attemptsByExam = new Map<string, typeof submittedAttempts>()
  for (const attempt of submittedAttempts) {
    const examId = typeof attempt.exam === 'object' && attempt.exam !== null ? String(attempt.exam.id) : String(attempt.exam)
    attemptsByExam.set(examId, [...(attemptsByExam.get(examId) ?? []), attempt])
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-[#9c858d]">أهلًا، {teacher.name.split(' ')[0]}</p>
          <h1 className="mt-2 text-3xl font-black text-[#321921]">لوحة التحكم</h1>
        </div>
        <Link
          href="/dashboard/exams/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#721b3b] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#721b3b]/15 transition hover:-translate-y-0.5"
        >
          <Icon name="plus" className="size-5" />
          إنشاء امتحان جديد
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'إجمالي الامتحانات',
            value: examsResult.totalDocs,
            icon: 'file' as const,
            tone: 'bg-[#f2e5e9] text-[#721b3b]',
          },
          {
            label: 'إجمالي الطلاب',
            value: submittedAttempts.length,
            icon: 'users' as const,
            tone: 'bg-[#e5eee8] text-[#3d704d]',
          },
          {
            label: 'متوسط النتائج',
            value: `${average}%`,
            icon: 'target' as const,
            tone: 'bg-[#eee8dc] text-[#80622a]',
          },
          {
            label: 'امتحانات نشطة',
            value: examsResult.docs.filter((exam) => exam.status === 'active').length,
            icon: 'clock' as const,
            tone: 'bg-[#e8e8f1] text-[#505385]',
          },
        ].map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-[#eadfe1] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <span className={`grid size-11 place-items-center rounded-2xl ${stat.tone}`}>
                <Icon name={stat.icon} className="size-5" />
              </span>
              <span className="text-3xl font-black text-[#321921]">{stat.value}</span>
            </div>
            <p className="mt-5 text-sm font-bold text-[#927d84]">{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-[#eadfe1] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#eee5e7] px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-[#321921]">امتحاناتي</h2>
            <p className="mt-1 text-xs text-[#9b858c]">تابع الروابط والنتائج وتفاصيل كل امتحان</p>
          </div>
          <span className="rounded-full bg-[#f5edef] px-3 py-1.5 text-xs font-black text-[#721b3b]">
            {examsResult.totalDocs} امتحان
          </span>
        </div>

        {examsResult.docs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#f5edef] text-[#721b3b]">
              <Icon name="file" className="size-8" />
            </span>
            <h3 className="mt-5 text-lg font-black text-[#321921]">لا توجد امتحانات بعد</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[#927d84]">
              أنشئ امتحانك الأول، أضف الأسئلة، ثم شارك الرابط مع طلابك.
            </p>
            <Link
              href="/dashboard/exams/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#721b3b] px-5 py-3 text-sm font-bold text-white"
            >
              <Icon name="plus" className="size-4" />
              إنشاء أول امتحان
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#f0e8ea]">
            {examsResult.docs.map((exam) => {
              const attempts = attemptsByExam.get(String(exam.id)) ?? []
              const examAverage = attempts.length
                ? Math.round(
                    attempts.reduce(
                      (sum, attempt) =>
                        sum + (attempt.maxScore ? (attempt.score / attempt.maxScore) * 100 : 0),
                      0,
                    ) / attempts.length,
                  )
                : 0
              return (
                <Link
                  key={exam.id}
                  href={`/dashboard/exams/${exam.id}`}
                  className="grid gap-4 px-6 py-5 transition hover:bg-[#fdfaf8] md:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(90px,.5fr))_30px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f3e7eb] text-[#721b3b]">
                      <Icon name="file" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-[#321921]">{exam.title}</h3>
                      <p className="mt-1 text-xs text-[#9a858b]">
                        {exam.subject} · {formatDate(exam.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a18d93]">الطلاب</span>
                    <strong className="mt-1 block text-sm text-[#4c363d]">{attempts.length}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a18d93]">المتوسط</span>
                    <strong className="mt-1 block text-sm text-[#4c363d]">{examAverage}%</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a18d93]">المدة</span>
                    <strong className="mt-1 block text-sm text-[#4c363d]">
                      {exam.durationMinutes} دقيقة
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#a18d93]">الحالة</span>
                    <span
                      className={`mt-1 block w-fit rounded-full px-2.5 py-1 text-[11px] font-black ${exam.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-600'}`}
                    >
                      {exam.status === 'active' ? 'نشط' : 'مؤرشف'}
                    </span>
                  </div>
                  <Icon name="arrow-left" className="hidden size-5 text-[#b4a2a7] md:block" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
