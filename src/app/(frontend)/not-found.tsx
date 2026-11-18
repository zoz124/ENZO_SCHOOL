import Link from 'next/link'

/**
 * Frontend not-found page.
 *
 * Reached when a student opens an invalid, deleted, archived, or mistyped exam
 * link (`/exam/[code]` calls `notFound()`), or any other missing route. It is
 * written in Arabic to match the rest of the product and gives the student a
 * clear next step instead of a dead end.
 */
export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="grid min-h-screen place-items-center bg-[#fbf8f2] px-5 py-16 text-center"
    >
      <div className="w-full max-w-lg rounded-[2rem] border border-[#eadfe1] bg-white p-8 shadow-xl shadow-[#5d2d3b]/5 sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f3e7eb] text-[#721b3b]">
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            className="size-8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        </span>

        <h1 className="mt-6 text-2xl font-black text-[#321921]">الرابط غير صالح</h1>
        <p className="mt-3 text-sm leading-7 text-[#8f7a81]">
          هذا الامتحان غير موجود أو تم حذفه أو لم يعد متاحًا. تأكد من الرابط الذي أرسله لك
          المدرس، أو اطلب منه رابطًا جديدًا.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-[#721b3b] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#721b3b]/15 transition hover:bg-[#5d1530]"
          >
            العودة للصفحة الرئيسية
          </Link>
        </div>

        <p className="mt-6 text-xs text-[#a08a91]">
          إن كنت مدرسًا، سجّل الدخول للوصول إلى لوحة التحكم.
        </p>
      </div>
    </main>
  )
}
