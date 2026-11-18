import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getPayload, type Payload } from 'payload'
import { testConfig } from './payload.test.config'

/**
 * These tests exercise the real server-action logic against a real Payload
 * instance. The actions import `@payload-config` (the Figma Cloud config) and
 * `next/headers`, so both are mocked to point at the local test database and a
 * simple in-memory cookie jar.
 */

let payload: Payload
const cookieJar = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name)
      return value ? { name, value } : undefined
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value)
    },
    delete: (name: string) => {
      cookieJar.delete(name)
    },
  }),
}))

// `@payload-config` is aliased to tests/payload.test.config.ts in
// vitest.config.ts, so the actions talk to the same local database as the
// assertions below. No `payload` module mock is needed.

// Imported after the mocks are registered.
const { createExamAction, startAttemptAction, submitAttemptAction } = await import(
  '@/app/(frontend)/actions/exams'
)
const { loginAction, signupAction, logoutAction } = await import('@/app/(frontend)/actions/auth')

const PASSWORD = 'password123'

const formData = (entries: Record<string, string>): FormData => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

const signUpTeacher = async (email: string, name = 'أ/ محمد أحمد', approve = true) => {
  const result = await signupAction({ ok: false }, formData({ name, email, password: PASSWORD }))
  if (result.ok && approve) {
    await payload.update({
      collection: 'teachers',
      where: { email: { equals: email } },
      data: { status: 'approved' },
      overrideAccess: true,
    })
    await loginAction({ ok: false }, formData({ email, password: PASSWORD }))
  }
  return result
}

const validExam = {
  title: 'امتحان الوحدة الثالثة',
  subject: 'الرياضيات',
  description: 'اختبار قصير',
  durationMinutes: 30,
  questions: [
    {
      prompt: 'ما ناتج ٢ + ٢؟',
      options: ['٣', '٤'],
      correctOption: 1,
      points: 2,
    },
  ],
}

beforeAll(async () => {
  payload = await getPayload({ config: testConfig })
})

afterAll(async () => {
  await payload.destroy()
})

describe('auth actions', () => {
  it('signs up a valid teacher with pending status', async () => {
    cookieJar.clear()
    const email = `signup-${Date.now()}@school.test`
    const result = await signUpTeacher(email, 'أ/ محمد أحمد', false)
    expect(result.ok).toBe(true)
    expect(result.pendingApproval).toBe(true)
    expect(cookieJar.has('app-session')).toBe(false)
  })

  it('rejects login when teacher status is pending', async () => {
    cookieJar.clear()
    const email = `pending-${Date.now()}@school.test`
    await signUpTeacher(email, 'أ/ محمد أحمد', false)
    const result = await loginAction({ ok: false }, formData({ email, password: PASSWORD }))
    expect(result.ok).toBe(false)
    expect(result.message).toContain('قيد المراجعة')
  })

  it('rejects a duplicate email', async () => {
    const email = `dup-action-${Date.now()}@school.test`
    expect((await signUpTeacher(email)).ok).toBe(true)
    cookieJar.clear()
    const second = await signUpTeacher(email)
    expect(second.ok).toBe(false)
    expect(second.message).toBeTruthy()
  })

  it('rejects an empty password', async () => {
    const result = await signupAction(
      { ok: false },
      formData({ name: 'أ/ محمد', email: `empty-${Date.now()}@school.test`, password: '' }),
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a 7-character password', async () => {
    const result = await signupAction(
      { ok: false },
      formData({ name: 'أ/ محمد', email: `weak-${Date.now()}@school.test`, password: '1234567' }),
    )
    expect(result.ok).toBe(false)
  })

  it('rejects an invalid email', async () => {
    const result = await signupAction(
      { ok: false },
      formData({ name: 'أ/ محمد', email: 'not-an-email', password: PASSWORD }),
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a too-short name', async () => {
    const result = await signupAction(
      { ok: false },
      formData({ name: 'م', email: `short-${Date.now()}@school.test`, password: PASSWORD }),
    )
    expect(result.ok).toBe(false)
  })

  it('logs in with correct credentials', async () => {
    cookieJar.clear()
    const email = `login-ok-${Date.now()}@school.test`
    await signUpTeacher(email)
    cookieJar.clear()
    const result = await loginAction({ ok: false }, formData({ email, password: PASSWORD }))
    expect(result.ok).toBe(true)
    expect(cookieJar.has('app-session')).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const email = `login-bad-${Date.now()}@school.test`
    await signUpTeacher(email)
    cookieJar.clear()
    const result = await loginAction(
      { ok: false },
      formData({ email, password: 'totally-wrong-pass' }),
    )
    expect(result.ok).toBe(false)
    expect(cookieJar.has('app-session')).toBe(false)
  })

  it('rejects a non-existent user', async () => {
    cookieJar.clear()
    const result = await loginAction(
      { ok: false },
      formData({ email: `ghost-${Date.now()}@school.test`, password: PASSWORD }),
    )
    expect(result.ok).toBe(false)
  })

  it('logs out by clearing the session cookie', async () => {
    const email = `logout-${Date.now()}@school.test`
    await signUpTeacher(email)
    expect(cookieJar.has('app-session')).toBe(true)
    await logoutAction()
    expect(cookieJar.has('app-session')).toBe(false)
  })
})

describe('createExamAction', () => {
  beforeAll(async () => {
    cookieJar.clear()
    await signUpTeacher(`create-${Date.now()}@school.test`)
  })

  it('creates a valid exam and returns its id', async () => {
    const result = await createExamAction(validExam)
    expect(result.ok).toBe(true)
    expect(result.examId).toBeTruthy()
  })

  it('rejects an empty title', async () => {
    expect((await createExamAction({ ...validExam, title: '' })).ok).toBe(false)
  })

  it('rejects duration 0', async () => {
    expect((await createExamAction({ ...validExam, durationMinutes: 0 })).ok).toBe(false)
  })

  it('rejects a negative duration', async () => {
    expect((await createExamAction({ ...validExam, durationMinutes: -10 })).ok).toBe(false)
  })

  it('rejects a decimal duration', async () => {
    expect((await createExamAction({ ...validExam, durationMinutes: 1.5 })).ok).toBe(false)
  })

  it('rejects a huge duration', async () => {
    expect((await createExamAction({ ...validExam, durationMinutes: 99999 })).ok).toBe(false)
  })

  it('rejects zero questions', async () => {
    expect((await createExamAction({ ...validExam, questions: [] })).ok).toBe(false)
  })

  it('rejects a question with empty text', async () => {
    const result = await createExamAction({
      ...validExam,
      questions: [{ ...validExam.questions[0], prompt: '' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects fewer than 2 options', async () => {
    const result = await createExamAction({
      ...validExam,
      questions: [{ ...validExam.questions[0], options: ['٣'], correctOption: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects an empty option', async () => {
    const result = await createExamAction({
      ...validExam,
      questions: [{ ...validExam.questions[0], options: ['٣', '  '], correctOption: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a question with no correct answer marked', async () => {
    const result = await createExamAction({
      ...validExam,
      questions: [{ ...validExam.questions[0], correctOption: -1 }],
    })
    expect(result.ok).toBe(false)
  })

  it('accepts 100 questions', async () => {
    const questions = Array.from({ length: 100 }, (_, i) => ({
      prompt: `سؤال رقم ${i + 1}`,
      options: ['أ', 'ب'],
      correctOption: 0,
      points: 1,
    }))
    const result = await createExamAction({ ...validExam, questions })
    expect(result.ok).toBe(true)
  })

  it('rejects 101 questions', async () => {
    const questions = Array.from({ length: 101 }, (_, i) => ({
      prompt: `سؤال رقم ${i + 1}`,
      options: ['أ', 'ب'],
      correctOption: 0,
      points: 1,
    }))
    expect((await createExamAction({ ...validExam, questions })).ok).toBe(false)
  })

  it('stores very long text truncated to the schema limit', async () => {
    const result = await createExamAction({
      ...validExam,
      title: 'ا'.repeat(120),
      questions: [{ ...validExam.questions[0], prompt: 'ب'.repeat(500) }],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects text beyond the schema limit instead of silently storing it', async () => {
    const result = await createExamAction({ ...validExam, title: 'ا'.repeat(121) })
    expect(result.ok).toBe(false)
  })

  it('accepts Arabic text and emoji', async () => {
    const result = await createExamAction({
      ...validExam,
      title: 'امتحان 😀 العلوم',
      questions: [{ ...validExam.questions[0], prompt: 'ما معنى 🌙؟' }],
    })
    expect(result.ok).toBe(true)
  })

  it('stores HTML/script injection as inert text', async () => {
    const payloadText = '<script>alert(1)</script>'
    const result = await createExamAction({
      ...validExam,
      title: '<img src=x onerror=alert(1)>',
      questions: [{ ...validExam.questions[0], prompt: payloadText }],
    })
    expect(result.ok).toBe(true)

    const stored = await payload.findByID({
      collection: 'exams',
      id: result.examId as string,
      depth: 0,
      overrideAccess: true,
    })
    expect(stored.questions?.[0].prompt).toBe(payloadText)
  })

  it('rejects a malformed payload without throwing', async () => {
    await expect(createExamAction(null)).resolves.toMatchObject({ ok: false })
    await expect(createExamAction('nonsense')).resolves.toMatchObject({ ok: false })
  })

  it('rejects creation when logged out', async () => {
    cookieJar.clear()
    const result = await createExamAction(validExam)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('الجلسة')
    // Restore the session for later tests.
    await signUpTeacher(`restore-${Date.now()}@school.test`)
  })

  it('gives each exam a unique code', async () => {
    const one = await createExamAction(validExam)
    const two = await createExamAction(validExam)
    const first = await payload.findByID({
      collection: 'exams',
      id: one.examId as string,
      depth: 0,
      overrideAccess: true,
    })
    const second = await payload.findByID({
      collection: 'exams',
      id: two.examId as string,
      depth: 0,
      overrideAccess: true,
    })
    expect(first.code).not.toBe(second.code)
  })
})

describe('student flow actions', () => {
  let examId: string
  let examCode: string

  beforeAll(async () => {
    cookieJar.clear()
    await signUpTeacher(`student-${Date.now()}@school.test`)
    const created = await createExamAction(validExam)
    examId = created.examId as string
    const exam = await payload.findByID({
      collection: 'exams',
      id: examId,
      depth: 0,
      overrideAccess: true,
    })
    examCode = exam.code as string
  })

  it('starts an attempt with a valid name', async () => {
    const result = await startAttemptAction(examId, 'محمد أحمد')
    expect(result.ok).toBe(true)
    expect(result.attemptId).toBeTruthy()
    expect(result.token).toBeTruthy()
  })

  it('rejects an empty name', async () => {
    expect((await startAttemptAction(examId, '')).ok).toBe(false)
  })

  it('rejects a whitespace-only name', async () => {
    expect((await startAttemptAction(examId, '     ')).ok).toBe(false)
  })

  it('rejects a name longer than 80 characters', async () => {
    expect((await startAttemptAction(examId, 'ا'.repeat(81))).ok).toBe(false)
  })

  it('accepts an Arabic name', async () => {
    const result = await startAttemptAction(examId, 'عبد الرحمن محمود')
    expect(result.ok).toBe(true)
  })

  it('rejects an invalid exam id', async () => {
    expect((await startAttemptAction('999999', 'طالب')).ok).toBe(false)
  })

  it('returns a server-owned deadline and remaining time', async () => {
    const result = await startAttemptAction(examId, 'طالب الوقت')
    expect(result.ok).toBe(true)
    expect(result.deadline).toBeGreaterThan(Date.now())
    expect(result.remainingSeconds).toBeGreaterThan(29 * 60)
    expect(result.remainingSeconds).toBeLessThanOrEqual(30 * 60)
  })

  it('never returns correct answers when starting an attempt', async () => {
    const result = await startAttemptAction(examId, 'طالب فضولي')
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('correctOption')
  })

  it('scores a submission and reveals model answers only afterwards', async () => {
    const started = await startAttemptAction(examId, 'طالب مجتهد')
    const exam = await payload.findByID({
      collection: 'exams',
      id: examId,
      depth: 0,
      overrideAccess: true,
    })
    const answers = (exam.questions ?? []).map((q) => ({
      questionId: String(q.id),
      selectedOption: q.correctOption as number,
    }))

    const result = await submitAttemptAction({
      attemptId: started.attemptId as string,
      token: started.token as string,
      answers,
    })

    expect(result.ok).toBe(true)
    expect(result.score).toBe(2)
    expect(result.modelAnswers).toHaveLength(1)
    expect(result.modelAnswers?.[0].correctOption).toBe(1)
  })

  it('rejects a submission with a bad token', async () => {
    const started = await startAttemptAction(examId, 'طالب رمز')
    const result = await submitAttemptAction({
      attemptId: started.attemptId as string,
      token: 'wrong-token',
      answers: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects an incomplete submission payload', async () => {
    const result = await submitAttemptAction({
      attemptId: '',
      token: '',
      answers: [],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a second submission of the same attempt', async () => {
    const started = await startAttemptAction(examId, 'طالب مكرر')
    const first = await submitAttemptAction({
      attemptId: started.attemptId as string,
      token: started.token as string,
      answers: [],
    })
    expect(first.ok).toBe(true)

    const second = await submitAttemptAction({
      attemptId: started.attemptId as string,
      token: started.token as string,
      answers: [],
    })
    expect(second.ok).toBe(false)
    expect(second.message).toContain('بالفعل')
  })

  it('marks a late submission as auto-submitted', async () => {
    const started = await startAttemptAction(examId, 'طالب متأخر')
    await payload.update({
      collection: 'exam-attempts',
      id: started.attemptId as string,
      data: { startedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
      overrideAccess: true,
    })
    const result = await submitAttemptAction({
      attemptId: started.attemptId as string,
      token: started.token as string,
      answers: [],
    })
    expect(result.ok).toBe(true)
    expect(result.late).toBe(true)
    expect(result.durationSeconds).toBe(30 * 60)
  })

  it('refuses an attempt on a deleted exam', async () => {
    cookieJar.clear()
    await signUpTeacher(`deleted-${Date.now()}@school.test`)
    const created = await createExamAction(validExam)
    const id = created.examId as string
    const teacherDoc = await payload.findByID({
      collection: 'exams',
      id,
      depth: 0,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'exams',
      id,
      overrideAccess: true,
    })
    expect(teacherDoc).toBeTruthy()
    expect((await startAttemptAction(id, 'طالب')).ok).toBe(false)
  })
})
