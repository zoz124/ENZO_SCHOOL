import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { Brand } from '@/components/Brand'
import { Icon } from '@/components/Icon'
import { getCurrentTeacher } from '@/lib/teacher-auth'

export default async function LoginPage() {
  if (await getCurrentTeacher()) redirect('/dashboard')

  return (
    <main className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]" dir="rtl">
      <section className="flex items-center justify-center bg-[#fbf8f2] px-5 py-12">
        <div className="w-full max-w-md">
          <Brand />
          <div className="mt-14">
            <span className="text-sm font-black text-[#721b3b]">مرحبًا بعودتك</span>
            <h1 className="mt-3 text-4xl font-black text-[#321921]">ادخل إلى مساحتك</h1>
            <p className="mt-3 text-sm leading-7 text-[#846f76]">
              تابع امتحاناتك ونتائج طلابك من مكان واحد.
            </p>
          </div>
          <AuthForm mode="login" />
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#721b3b] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 size-96 rounded-full border-[70px] border-white/5" />
        <div className="relative z-10 flex justify-end">
          <span className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/70">
            للـمدرسين فقط
          </span>
        </div>
        <div className="relative z-10 max-w-xl">
          <div className="grid size-16 place-items-center rounded-2xl bg-white/10">
            <Icon name="chart" className="size-8" />
          </div>
          <blockquote className="mt-8 text-3xl font-black leading-[1.65]">
            كل نتيجة واضحة.
            <br />
            كل دقيقة محسوبة.
            <br />
            كل امتحان أسهل.
          </blockquote>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/60">
            ENZO SCHOOL يساعدك على التركيز في التدريس، ونترك التنظيم والتصحيح لنا.
          </p>
        </div>
        <p className="relative z-10 text-xs text-white/35">
          ENZO SCHOOL · منصة امتحانات بسيطة وذكية
        </p>
      </aside>
    </main>
  )
}
