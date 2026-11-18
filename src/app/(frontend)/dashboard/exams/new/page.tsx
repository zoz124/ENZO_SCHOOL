import Link from 'next/link'
import { ExamBuilder } from '@/components/ExamBuilder'
import { Icon } from '@/components/Icon'

export default function NewExamPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 lg:px-10 lg:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#8b767d] transition hover:text-[#721b3b]"
      >
        <Icon name="arrow-left" className="size-4 rotate-180" />
        العودة للوحة التحكم
      </Link>
      <div className="mt-6">
        <p className="text-sm font-black text-[#721b3b]">امتحان جديد</p>
        <h1 className="mt-2 text-3xl font-black text-[#321921]">أنشئ امتحانك</h1>
        <p className="mt-3 text-sm leading-7 text-[#8f7a81]">
          أضف البيانات والأسئلة، وسننشئ لك رابطًا جاهزًا لإرساله للطلاب.
        </p>
      </div>
      <ExamBuilder />
    </main>
  )
}
