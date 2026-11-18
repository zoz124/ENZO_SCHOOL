'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { loginTeacher, logoutTeacher } from '@/lib/teacher-auth'

export type AuthState = {
  ok: boolean
  message?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!emailPattern.test(email) || password.length < 8) {
    return { ok: false, message: 'راجع البريد الإلكتروني وكلمة المرور.' }
  }

  try {
    await loginTeacher(email, password)
    return { ok: true }
  } catch {
    return { ok: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' }
  }
}

export async function signupAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get('name') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (name.length < 2) return { ok: false, message: 'اكتب الاسم كاملًا.' }
  if (!emailPattern.test(email)) return { ok: false, message: 'اكتب بريدًا إلكترونيًا صحيحًا.' }
  if (password.length < 8) return { ok: false, message: 'كلمة المرور يجب ألا تقل عن 8 أحرف.' }

  try {
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'teachers',
      data: { name, subject: subject || undefined, email, password },
      overrideAccess: false,
    })
    await loginTeacher(email, password)
    return { ok: true }
  } catch {
    return { ok: false, message: 'تعذر إنشاء الحساب. قد يكون البريد مستخدمًا بالفعل.' }
  }
}

export async function logoutAction() {
  await logoutTeacher()
}
