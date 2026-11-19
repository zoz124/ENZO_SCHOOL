'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { loginTeacher, logoutTeacher } from '@/lib/teacher-auth'

export type AuthState = {
  ok: boolean
  message?: string
  pendingApproval?: boolean
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Payload throws several unrelated errors from `create`/`login`. Only a real
 * duplicate (or a unique-index violation) may be reported to the user as
 * "email already used"; everything else must stay a server error so a broken
 * database is never disguised as an existing account.
 */
const isDuplicateEmailError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const err = error as {
    name?: string
    message?: string
    data?: { errors?: { path?: string; message?: string }[] }
  }

  const fieldErrors = err.data?.errors
  if (Array.isArray(fieldErrors)) {
    return fieldErrors.some((fieldError) => fieldError?.path === 'email')
  }

  const text = `${err.name ?? ''} ${err.message ?? ''}`.toLowerCase()
  return text.includes('duplicate key') || text.includes('unique constraint')
}

const validationMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null
  const err = error as { name?: string; data?: { errors?: { message?: string }[] } }
  if (err.name !== 'ValidationError') return null

  const details = (err.data?.errors ?? [])
    .map((fieldError) => fieldError?.message)
    .filter((message): message is string => Boolean(message))

  return details.length > 0 ? `تحقق من البيانات: ${details.join('، ')}` : null
}

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
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    const msg = err instanceof Error ? err.message : ''

    // Messages raised by our own teacher-auth helpers are already user-facing Arabic.
    if (name === 'Error' && /[\u0600-\u06FF]/.test(msg)) {
      return { ok: false, message: msg }
    }
    if (name === 'LockedAuth') {
      return { ok: false, message: 'تم إيقاف الحساب مؤقتًا بسبب محاولات دخول خاطئة متكررة. حاول بعد قليل.' }
    }
    if (name === 'AuthenticationError' || name === 'Forbidden' || name === 'UnauthorizedError') {
      return { ok: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' }
    }

    console.error('[login] unexpected error', err)
    return { ok: false, message: 'تعذر تسجيل الدخول حاليًا بسبب خطأ في الخادم. حاول مرة أخرى بعد قليل.' }
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

    const existing = await payload.count({
      collection: 'teachers',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      return { ok: false, message: 'هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول أو استخدم بريدًا آخر.' }
    }

    await payload.create({
      collection: 'teachers',
      data: { name, subject: subject || undefined, email, password, status: 'pending' },
      overrideAccess: false,
    })
    return {
      ok: true,
      pendingApproval: true,
      message: 'تم تسجيل حسابك بنجاح وهو الآن قيد مراجعة الإدارة للتفعيل. ستتمكن من تسجيل الدخول فور اعتماده.',
    }
  } catch (err) {
    if (isDuplicateEmailError(err)) {
      return { ok: false, message: 'هذا البريد الإلكتروني مسجل بالفعل. سجّل الدخول أو استخدم بريدًا آخر.' }
    }

    const validation = validationMessage(err)
    if (validation) return { ok: false, message: validation }

    console.error('[signup] unexpected error', err)
    return {
      ok: false,
      message: 'تعذر إنشاء الحساب حاليًا بسبب خطأ في الخادم. حاول مرة أخرى بعد قليل.',
    }
  }
}

export async function logoutAction() {
  await logoutTeacher()
}
