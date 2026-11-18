import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/AuthForm'
import { Brand } from '@/components/Brand'
import { Icon } from '@/components/Icon'
import { getCurrentTeacher } from '@/lib/teacher-auth'

export default async function SignupPage() {
  if (await getCurrentTeacher()) redirect('/dashboard')

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]" dir="rtl">
      <section className="flex items-center justify-center bg-[#fbf8f2] px-5 py-12">
        <div className="w-full max-w-lg">
          <Brand />
          <div className="mt-12">
            <span className="text-sm font-black text-[#721b3b]">ابدأ الآن</span>
            <h1 className="mt-3 text-4xl font-black text-[#321921]">أنشئ حساب المدرس</h1>
            <p className="mt-3 text-sm leading-7 text-[#846f76]">
              دقائق قليلة وتكون جاهزًا لإنشاء أول امتحان ومشاركته.
            </p>
          </div>
          <AuthForm mode="signup" />
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#321921] p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="absolute -bottom-40 -right-40 size-[32rem] rounded-full bg-[#721b3b]/50 blur-3xl" />
        <div className="relative z-10">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/10">
            <Icon name="sparkle" className="size-8" />
          </span>
          <h2 className="mt-8 text-4xl font-black leading-[1.5]">
            ابدأ بفكرة السؤال،
            <br />
            <span className="text-[#e4b9c7]">ونحن نهتم بالباقي.</span>
          </h2>
          <div className="mt-10 space-y-5">
            {[
              'رابط جاهز للمشاركة فورًا',
              'تسليم تلقائي عند انتهاء الوقت',
              'نموذج إجابة يظهر بعد التسليم',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/75">
                <span className="grid size-7 place-items-center rounded-full bg-white/10">
                  <Icon name="check" className="size-4" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  )
}
