import 'server-only'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

const SESSION_COOKIE = 'app-session'

export async function getCurrentTeacher() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const payload = await getPayload({ config })
  const authHeaders = new Headers({ Authorization: `JWT ${token}` })
  const { user } = await payload.auth({ headers: authHeaders })

  if (!user || user.collection !== 'teachers') return null

  // Ensure teacher is approved
  const teacher = user as unknown as { status?: string }
  if (teacher.status && teacher.status !== 'approved') return null

  return user
}

export async function loginTeacher(email: string, password: string) {
  const payload = await getPayload({ config })
  const result = await payload.login({
    collection: 'teachers',
    data: { email, password },
    overrideAccess: false,
  })

  if (!result.token || !result.user) throw new Error('تعذر تسجيل الدخول.')

  // Check approval status
  const teacher = result.user as unknown as { status?: string }
  if (teacher.status === 'pending') {
    throw new Error('حسابك قيد المراجعة من قِبل إدارة المدرسة. يرجى الانتظار حتى اعتماده.')
  }
  if (teacher.status === 'rejected') {
    throw new Error('تم رفض هذا الحساب من قِبل إدارة المدرسة.')
  }

  ;(await cookies()).set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return result.user
}

export async function logoutTeacher() {
  ;(await cookies()).delete(SESSION_COOKIE)
}
