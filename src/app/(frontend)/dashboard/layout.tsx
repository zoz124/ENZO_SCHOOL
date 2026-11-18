import { redirect } from 'next/navigation'
import { Brand } from '@/components/Brand'
import { DashboardNav } from '@/components/DashboardNav'
import { LogoutButton } from '@/components/LogoutButton'
import { getCurrentTeacher } from '@/lib/teacher-auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) redirect('/login')

  return (
    <div className="min-h-screen bg-[#fbf8f2]" dir="rtl">
      <div className="flex min-h-screen">
        <DashboardNav teacherName={teacher.name} />
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-[#eadfe1] bg-white px-5 py-4 lg:hidden">
            <Brand />
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-[#f5edef] font-black text-[#721b3b]">
                {teacher.name.charAt(0)}
              </span>
              <LogoutButton compact />
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}
