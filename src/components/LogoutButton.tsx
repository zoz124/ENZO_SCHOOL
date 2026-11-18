'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { logoutAction } from '@/app/(frontend)/actions/auth'
import { Icon } from './Icon'

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await logoutAction()
          router.replace('/')
          router.refresh()
        })
      }
      className={`${compact ? '' : 'mt-4 w-full'} flex items-center justify-center gap-2 rounded-xl border border-[#e8dbde] bg-white px-3 py-2.5 text-xs font-bold text-[#806a71] transition hover:border-[#721b3b]/20 hover:text-[#721b3b] disabled:opacity-50`}
    >
      <Icon name="logout" className="size-4" />
      {pending ? 'جاري الخروج...' : compact ? 'خروج' : 'تسجيل الخروج'}
    </button>
  )
}
