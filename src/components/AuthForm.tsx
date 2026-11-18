'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'
import { loginAction, signupAction, type AuthState } from '@/app/(frontend)/actions/auth'
import { Icon } from './Icon'

const initialState: AuthState = { ok: false }

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const action = mode === 'login' ? loginAction : signupAction
  const [state, formAction, pending] = useActionState(action, initialState)

  useEffect(() => {
    if (state.ok) {
      router.replace('/dashboard')
      router.refresh()
    }
  }, [router, state.ok])

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {mode === 'signup' && (
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">الاسم</span>
            <input
              name="name"
              required
              minLength={2}
              autoComplete="name"
              placeholder="أ/ محمد أحمد"
              className="input-field"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#503a41]">المادة</span>
            <input
              name="subject"
              autoComplete="organization-title"
              placeholder="الرياضيات"
              className="input-field"
            />
          </label>
        </div>
      )}
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[#503a41]">البريد الإلكتروني</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="teacher@example.com"
          dir="ltr"
          className="input-field text-left"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-[#503a41]">كلمة المرور</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="8 أحرف على الأقل"
          dir="ltr"
          className="input-field text-left"
        />
      </label>
      {state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#721b3b] px-5 py-4 font-bold text-white shadow-lg shadow-[#721b3b]/15 transition hover:bg-[#5d1530] disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? 'جاري التنفيذ...'
          : mode === 'login'
            ? 'دخول إلى لوحة التحكم'
            : 'إنشاء حساب المدرس'}
        {!pending && <Icon name="arrow-left" className="size-5" />}
      </button>
      <p className="text-center text-sm text-[#846f76]">
        {mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
        <Link
          href={mode === 'login' ? '/signup' : '/login'}
          className="font-black text-[#721b3b] hover:underline"
        >
          {mode === 'login' ? 'أنشئ حسابًا' : 'سجل الدخول'}
        </Link>
      </p>
    </form>
  )
}
