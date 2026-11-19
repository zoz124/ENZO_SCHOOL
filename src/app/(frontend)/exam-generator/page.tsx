import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AiExamGenerator } from '@/components/AiExamGenerator'
import { Icon } from '@/components/Icon'
import { getCurrentTeacher } from '@/lib/teacher-auth'

export const metadata = {
  title: 'مولّد الأسئلة بالذكاء الاصطناعي – ENZO SCHOOL',
  description: 'أنشئ أسئلة اختيار من متعدد تلقائيًا من مواد تعليمية أو أسئلة مع إجاباتها.',
}

export default async function ExamGeneratorPage() {
  const teacher = await getCurrentTeacher()
  if (!teacher) redirect('/login')

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 lg:px-10 lg:py-10" dir="rtl">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#8b767d] transition hover:text-[#721b3b]"
      >
        <Icon name="arrow-left" className="size-4 rotate-180" />
        العودة للوحة التحكم
      </Link>

      {/* Header */}
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#f3e7eb] text-[#721b3b]">
            <Icon name="sparkle" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-black text-[#721b3b]">ذكاء اصطناعي</p>
            <h1 className="text-2xl font-black text-[#321921]">مولّد الأسئلة</h1>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#8f7a81]">
          ارفع صور من كتبك أو شرائحك، أو ألصق أسئلة مع إجاباتها، وسيُنشئ الذكاء الاصطناعي أسئلة اختيار
          من متعدد جاهزة للاستخدام.
        </p>
      </div>

      {/* Info banner */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
        <Icon name="eye" className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p className="text-sm leading-6 text-amber-800">
          راجع الأسئلة المُوّلدة قبل إضافتها لامتحان رسمي. الذكاء الاصطناعي قد يُخطئ أحيانًا.
        </p>
      </div>

      <AiExamGenerator />
    </main>
  )
}
