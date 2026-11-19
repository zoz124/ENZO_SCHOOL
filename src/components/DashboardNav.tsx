import Link from 'next/link'
import { Brand } from './Brand'
import { Icon } from './Icon'
import { LogoutButton } from './LogoutButton'

export function DashboardNav({ teacherName }: { teacherName: string }) {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 flex-col border-l border-[#eadfe1] bg-white p-6 lg:flex">
      <Brand />
      <nav className="mt-12 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl bg-[#721b3b] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#721b3b]/15"
        >
          <Icon name="home" className="size-5" />
          الرئيسية
        </Link>
        <Link
          href="/dashboard/exams/new"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-[#766269] transition hover:bg-[#f7f1f0] hover:text-[#721b3b]"
        >
          <Icon name="plus" className="size-5" />
          إنشاء امتحان
        </Link>
        <Link
          href="/exam-generator"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-[#766269] transition hover:bg-[#f7f1f0] hover:text-[#721b3b]"
        >
          <Icon name="sparkle" className="size-5" />
          مولّد AI
        </Link>
      </nav>
      <div className="mt-auto rounded-2xl bg-[#f8f3f1] p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#721b3b] font-black text-white">
            {teacherName.trim().charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm text-[#321921]">{teacherName}</strong>
            <span className="text-[11px] text-[#9a858b]">حساب مدرس</span>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  )
}
