import Link from 'next/link'
import { Brand } from '@/components/Brand'
import { Icon } from '@/components/Icon'

const features = [
  {
    icon: 'file' as const,
    title: 'إنشاء امتحان بسهولة',
    text: 'أضف أسئلتك واختياراتها وحدد الإجابة الصحيحة والدرجة من فورم بسيط وواضح.',
  },
  {
    icon: 'clock' as const,
    title: 'تسليم تلقائي',
    text: 'حدد مدة الامتحان وسيظهر مؤقت للطالب، وعند انتهائه يتم التسليم تلقائيًا.',
  },
  {
    icon: 'chart' as const,
    title: 'نتائج لحظية',
    text: 'تابع من دخل الامتحان ودرجته ومدة الحل وعدد الأخطاء من لوحة واحدة.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf8f2] text-[#2b1e22]" dir="rtl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
        <Brand />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-xl px-5 py-3 text-sm font-bold text-[#721b3b] transition hover:bg-[#721b3b]/5 sm:block"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[#721b3b] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#721b3b]/15 transition hover:-translate-y-0.5 hover:bg-[#5d1530]"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-32 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#721b3b]/10 bg-white px-4 py-2 text-xs font-bold text-[#721b3b] shadow-sm">
            <Icon name="sparkle" className="size-4" />
            منصة الامتحانات المصممة للمدرس
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.18] tracking-tight text-[#321921] sm:text-6xl lg:text-7xl">
            امتحاناتك أذكى،
            <span className="mt-2 block text-[#721b3b]">ووقتك ليك.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-9 text-[#75656a]">
            أنشئ امتحانك في دقائق، شارك الرابط مع طلابك، واترك ENZO SCHOOL يتولى التوقيت والتصحيح
            وعرض النتائج.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-3 rounded-2xl bg-[#721b3b] px-7 py-4 text-sm font-bold text-white shadow-xl shadow-[#721b3b]/20 transition hover:-translate-y-1"
            >
              أنشئ أول امتحان
              <Icon name="arrow-left" className="size-5" />
            </Link>
            <a
              href="#features"
              className="rounded-2xl border border-[#d9ccd0] bg-white px-7 py-4 text-sm font-bold text-[#4c363d] transition hover:border-[#721b3b]/40"
            >
              اعرف أكثر
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[#7f6d72]">
            {['بدون حساب للطالب', 'تصحيح فوري', 'نتائج منظمة'].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-[#dce9dd] text-[#31683d]">
                  <Icon name="check" className="size-3.5" />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[510px]">
          <div className="absolute inset-5 rotate-3 rounded-[2.5rem] bg-[#e9d9de]" />
          <div className="absolute inset-0 -rotate-2 rounded-[2.5rem] border border-[#721b3b]/10 bg-white p-6 shadow-2xl shadow-[#53303b]/15 sm:p-8">
            <div className="flex items-center justify-between border-b border-[#eee5e7] pb-5">
              <div>
                <p className="text-xs font-bold text-[#a1848d]">نظرة سريعة</p>
                <h2 className="mt-1 text-xl font-black text-[#321921]">لوحة امتحاناتك</h2>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-[#721b3b]/8 text-[#721b3b]">
                <Icon name="chart" className="size-6" />
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ['12', 'امتحان'],
                ['348', 'طالب'],
                ['82%', 'متوسط'],
              ].map(([value, label], index) => (
                <div
                  key={label}
                  className={`rounded-2xl p-4 ${index === 0 ? 'bg-[#721b3b] text-white' : 'bg-[#f7f1f0] text-[#321921]'}`}
                >
                  <strong className="block text-2xl font-black">{value}</strong>
                  <span
                    className={`mt-1 block text-xs ${index === 0 ? 'text-white/65' : 'text-[#927a82]'}`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-black">آخر الامتحانات</h3>
                <span className="text-xs font-bold text-[#721b3b]">عرض الكل</span>
              </div>
              <div className="space-y-3">
                {[
                  ['امتحان الوحدة الثالثة', 'الرياضيات', '24 طالب', '86%'],
                  ['اختبار العلوم الأسبوعي', 'العلوم', '31 طالب', '78%'],
                  ['مراجعة نصف العام', 'اللغة العربية', '19 طالب', '91%'],
                ].map(([title, subject, students, score], index) => (
                  <div
                    key={title}
                    className="flex items-center gap-4 rounded-2xl border border-[#eee5e7] p-4"
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-xl ${index === 1 ? 'bg-[#e8eee2] text-[#557045]' : 'bg-[#f4e8ec] text-[#721b3b]'}`}
                    >
                      <Icon name="file" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-black">{title}</h4>
                      <p className="mt-1 text-xs text-[#9b858c]">
                        {subject} · {students}
                      </p>
                    </div>
                    <strong className="text-sm text-[#721b3b]">{score}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -right-5 flex items-center gap-3 rounded-2xl bg-[#321921] px-5 py-4 text-white shadow-xl">
            <span className="grid size-9 place-items-center rounded-xl bg-white/10">
              <Icon name="check" className="size-5" />
            </span>
            <div>
              <strong className="block text-sm">تم تسليم الامتحان</strong>
              <span className="text-[11px] text-white/55">منذ ثوانٍ</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-[#eadfe1] bg-white py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-black text-[#721b3b]">كل ما تحتاجه، بدون تعقيد</span>
            <h2 className="mt-4 text-3xl font-black text-[#321921] sm:text-4xl">
              من إنشاء السؤال إلى قراءة النتيجة
            </h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="group rounded-[2rem] border border-[#eee5e7] bg-[#fdfbf8] p-7 transition hover:-translate-y-1 hover:border-[#721b3b]/25 hover:shadow-xl hover:shadow-[#5c2838]/5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#721b3b] text-white">
                    <Icon name={feature.icon} className="size-6" />
                  </span>
                  <span className="text-sm font-black text-[#d8c9cd]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 text-xl font-black text-[#321921]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#7f6d72]">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
