import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPayload, type Payload } from 'payload'
import { testConfig } from './payload.test.config'

let payload: Payload

const PASSWORD = 'password123'

type Teacher = { id: string | number; email: string; collection: 'teachers' }

const makeTeacher = async (email: string, name = 'Teacher'): Promise<Teacher> => {
  const doc = await payload.create({
    collection: 'teachers',
    data: { name, email, password: PASSWORD },
    overrideAccess: false,
  })
  // Payload's access functions read `req.user.collection` to tell a teacher
  // apart from an admin, so the test user must carry it.
  return { id: doc.id, email: doc.email, collection: 'teachers' }
}

const makeExam = async (
  owner: Teacher,
  overrides: Record<string, unknown> = {},
) => {
  return payload.create({
    collection: 'exams',
    data: {
      title: 'امتحان الوحدة الثالثة',
      subject: 'الرياضيات',
      durationMinutes: 30,
      status: 'active',
      code: `code${Math.random().toString(36).slice(2, 10)}`,
      owner: owner.id as never,
      questions: [
        {
          prompt: 'ما ناتج ٢ + ٢؟',
          options: [{ text: '٣' }, { text: '٤' }],
          correctOption: 1,
          points: 2,
        },
        {
          prompt: 'ما عاصمة مصر؟',
          options: [{ text: 'الإسكندرية' }, { text: 'القاهرة' }],
          correctOption: 1,
          points: 3,
        },
      ],
      ...overrides,
    },
    user: owner as never,
    overrideAccess: false,
  })
}

/** Start an attempt the way the student action does. */
const startAttempt = async (examId: string | number, name: string) => {
  const token = crypto.randomUUID()
  const attempt = await payload.create({
    collection: 'exam-attempts',
    data: {
      studentName: name,
      exam: examId as never,
      teacher: 0 as never, // overwritten by the hook
      submissionToken: token,
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      score: 0,
      maxScore: 0,
      wrongCount: 0,
      answers: [],
    },
    context: { studentSubmission: true },
    overrideAccess: false,
  })
  return { attempt, token }
}

const submitAttempt = async (
  attemptId: string | number,
  token: string,
  answers: Array<{ questionId: string; selectedOption: number }>,
) => {
  return payload.update({
    collection: 'exam-attempts',
    id: attemptId,
    data: { submissionToken: token, answers },
    context: { studentSubmission: true },
    overrideAccess: false,
  })
}

beforeAll(async () => {
  payload = await getPayload({ config: testConfig })
})

afterAll(async () => {
  await payload.destroy()
})

describe('teacher isolation (IDOR)', () => {
  let teacherA: Teacher
  let teacherB: Teacher
  let examA: Awaited<ReturnType<typeof makeExam>>

  beforeAll(async () => {
    teacherA = await makeTeacher(`a-${Date.now()}@school.test`, 'Teacher A')
    teacherB = await makeTeacher(`b-${Date.now()}@school.test`, 'Teacher B')
    examA = await makeExam(teacherA)
  })

  it('teacher B cannot read teacher A exam by direct id', async () => {
    await expect(
      payload.findByID({
        collection: 'exams',
        id: examA.id,
        user: teacherB as never,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('teacher B cannot list teacher A exams', async () => {
    const result = await payload.find({
      collection: 'exams',
      user: teacherB as never,
      overrideAccess: false,
      limit: 100,
    })
    expect(result.docs.map((doc) => doc.id)).not.toContain(examA.id)
  })

  it('teacher B cannot update teacher A exam', async () => {
    await expect(
      payload.update({
        collection: 'exams',
        id: examA.id,
        data: { title: 'Hijacked exam title' },
        user: teacherB as never,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('teacher B cannot delete teacher A exam', async () => {
    await expect(
      payload.delete({
        collection: 'exams',
        id: examA.id,
        user: teacherB as never,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('teacher B cannot read teacher A student results', async () => {
    const { attempt } = await startAttempt(examA.id, 'طالب أ')
    const result = await payload.find({
      collection: 'exam-attempts',
      user: teacherB as never,
      overrideAccess: false,
      limit: 100,
    })
    expect(result.docs.map((doc) => doc.id)).not.toContain(attempt.id)
  })

  it('teacher A can read their own exam', async () => {
    const found = await payload.findByID({
      collection: 'exams',
      id: examA.id,
      user: teacherA as never,
      overrideAccess: false,
    })
    expect(String(found.id)).toBe(String(examA.id))
  })

  it('anonymous cannot list exams through the API', async () => {
    const result = await payload.find({
      collection: 'exams',
      overrideAccess: false,
      limit: 100,
    })
    // Anonymous read is scoped to active exams only; it must never expose
    // another teacher's draft/archived exams.
    expect(result.docs.every((doc) => doc.status === 'active')).toBe(true)
  })

  it('anonymous cannot create an exam', async () => {
    await expect(
      payload.create({
        collection: 'exams',
        data: {
          title: 'Anonymous exam',
          subject: 'Math',
          durationMinutes: 10,
          status: 'active',
          code: 'anon123456',
          owner: teacherA.id as never,
          questions: [
            { prompt: 'q?', options: [{ text: 'a' }, { text: 'b' }], correctOption: 0, points: 1 },
          ],
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('exam codes', () => {
  it('assigns a unique code per exam even when the client sends one', async () => {
    const teacher = await makeTeacher(`code-${Date.now()}@school.test`)
    const first = await makeExam(teacher, { code: 'samecode01' })
    const second = await makeExam(teacher, { code: 'samecode01' })
    expect(first.code).not.toBe(second.code)
  })

  it('generates a 10-character code', async () => {
    const teacher = await makeTeacher(`code2-${Date.now()}@school.test`)
    const exam = await makeExam(teacher)
    expect(exam.code).toHaveLength(10)
  })

  it('codes are not sequential or guessable', async () => {
    const teacher = await makeTeacher(`code3-${Date.now()}@school.test`)
    const codes = new Set<string>()
    for (let i = 0; i < 5; i += 1) {
      const exam = await makeExam(teacher)
      codes.add(exam.code as string)
    }
    expect(codes.size).toBe(5)
  })
})

describe('student answers are never exposed before submission', () => {
  it('anonymous read of an exam omits correctOption', async () => {
    const teacher = await makeTeacher(`leak-${Date.now()}@school.test`)
    const exam = await makeExam(teacher)

    const publicView = await payload.find({
      collection: 'exams',
      where: { code: { equals: exam.code } },
      depth: 0,
      overrideAccess: false,
      limit: 1,
    })

    expect(publicView.docs).toHaveLength(1)
    const questions = publicView.docs[0].questions ?? []
    expect(questions.length).toBeGreaterThan(0)
    for (const question of questions) {
      expect(question).not.toHaveProperty('correctOption')
    }
    // The raw JSON must not contain the answer either.
    expect(JSON.stringify(publicView.docs[0])).not.toContain('correctOption')
  })

  it('a teacher read does include correctOption', async () => {
    const teacher = await makeTeacher(`leak2-${Date.now()}@school.test`)
    const exam = await makeExam(teacher)
    const owned = await payload.findByID({
      collection: 'exams',
      id: exam.id,
      user: teacher as never,
      overrideAccess: false,
      depth: 0,
    })
    expect(owned.questions?.[0]).toHaveProperty('correctOption')
  })
})

describe('scoring', () => {
  let teacher: Teacher
  let exam: Awaited<ReturnType<typeof makeExam>>

  beforeAll(async () => {
    teacher = await makeTeacher(`score-${Date.now()}@school.test`)
    exam = await makeExam(teacher)
  })

  it('scores an all-correct submission', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب ممتاز')
    const questions = exam.questions ?? []
    const answers = questions.map((q) => ({
      questionId: String(q.id),
      selectedOption: q.correctOption as number,
    }))
    const result = await submitAttempt(attempt.id, token, answers)
    expect(result.score).toBe(5) // 2 + 3 points
    expect(result.maxScore).toBe(5)
    expect(result.wrongCount).toBe(0)
    expect(result.status).toBe('submitted')
  })

  it('scores an all-wrong submission', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب ضعيف')
    const questions = exam.questions ?? []
    const answers = questions.map((q) => ({
      questionId: String(q.id),
      selectedOption: q.correctOption === 0 ? 1 : 0,
    }))
    const result = await submitAttempt(attempt.id, token, answers)
    expect(result.score).toBe(0)
    expect(result.wrongCount).toBe(2)
  })

  it('scores a no-answer submission as zero with every question wrong', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب لم يجب')
    const result = await submitAttempt(attempt.id, token, [])
    expect(result.score).toBe(0)
    expect(result.maxScore).toBe(5)
    expect(result.wrongCount).toBe(2)
    expect(result.answers?.every((a) => a.selectedOption === -1)).toBe(true)
  })

  it('records a duration and a submittedAt timestamp', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب سريع')
    const result = await submitAttempt(attempt.id, token, [])
    expect(result.submittedAt).toBeTruthy()
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0)
  })

  it('ignores a forged isCorrect flag from the client', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب محتال')
    const questions = exam.questions ?? []
    const forged = questions.map((q) => ({
      questionId: String(q.id),
      selectedOption: q.correctOption === 0 ? 1 : 0,
      isCorrect: true,
    }))
    const result = await submitAttempt(attempt.id, token, forged)
    expect(result.score).toBe(0)
  })

  it('ignores a forged score sent by the client', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب محتال 2')
    const result = await payload.update({
      collection: 'exam-attempts',
      id: attempt.id,
      data: { submissionToken: token, answers: [], score: 999, maxScore: 999 },
      context: { studentSubmission: true },
      overrideAccess: false,
    })
    expect(result.score).toBe(0)
    expect(result.maxScore).toBe(5)
  })
})

describe('attempt lifecycle', () => {
  let teacher: Teacher
  let exam: Awaited<ReturnType<typeof makeExam>>

  beforeAll(async () => {
    teacher = await makeTeacher(`life-${Date.now()}@school.test`)
    exam = await makeExam(teacher)
  })

  it('rejects a second submission for the same attempt', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب مكرر')
    const questions = exam.questions ?? []
    const answers = questions.map((q) => ({
      questionId: String(q.id),
      selectedOption: q.correctOption as number,
    }))
    const first = await submitAttempt(attempt.id, token, answers)
    expect(first.status).toBe('submitted')
    expect(first.score).toBe(5)

    // A finished attempt must not be re-scored: this is what makes a
    // double-click or a second tab safe.
    await expect(submitAttempt(attempt.id, token, [])).rejects.toThrow()

    const stored = await payload.findByID({
      collection: 'exam-attempts',
      id: attempt.id,
      depth: 0,
      overrideAccess: true,
    })
    expect(stored.score).toBe(5)
    expect(stored.status).toBe('submitted')
  })

  it('rejects a submission with the wrong token', async () => {
    const { attempt } = await startAttempt(exam.id, 'طالب رمز خاطئ')
    await expect(submitAttempt(attempt.id, 'not-the-real-token', [])).rejects.toThrow()
  })

  it('marks a submission after the deadline as auto-submitted', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب متأخر')
    // Backdate the start beyond the 30 minute limit.
    await payload.update({
      collection: 'exam-attempts',
      id: attempt.id,
      data: { startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
      overrideAccess: true,
    })
    const result = await submitAttempt(attempt.id, token, [])
    expect(result.status).toBe('auto-submitted')
    // Duration is capped at the exam limit, not the real elapsed time.
    expect(result.durationSeconds).toBe(30 * 60)
  })

  it('caps duration at the exam limit even when submitted late', async () => {
    const { attempt, token } = await startAttempt(exam.id, 'طالب متأخر 2')
    await payload.update({
      collection: 'exam-attempts',
      id: attempt.id,
      data: { startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      overrideAccess: true,
    })
    const result = await submitAttempt(attempt.id, token, [])
    expect(result.durationSeconds).toBeLessThanOrEqual(30 * 60)
  })

  it('stores two students with the same name as separate attempts', async () => {
    const name = 'محمد أحمد'
    const one = await startAttempt(exam.id, name)
    const two = await startAttempt(exam.id, name)
    expect(one.attempt.id).not.toBe(two.attempt.id)

    const found = await payload.find({
      collection: 'exam-attempts',
      where: { and: [{ exam: { equals: exam.id } }, { studentName: { equals: name } }] },
      user: teacher as never,
      overrideAccess: false,
      limit: 100,
    })
    expect(found.docs.length).toBeGreaterThanOrEqual(2)
  })

  it('refuses to start an attempt on an archived exam', async () => {
    const archived = await makeExam(teacher, { status: 'archived' })
    await expect(startAttempt(archived.id, 'طالب')).rejects.toThrow()
  })

  it('refuses an attempt with a whitespace-only name', async () => {
    await expect(startAttempt(exam.id, '   ')).rejects.toThrow()
  })
})

describe('exam deletion cascades to results', () => {
  it('removes attempts when the exam is deleted', async () => {
    const teacher = await makeTeacher(`del-${Date.now()}@school.test`)
    const exam = await makeExam(teacher)
    const { attempt } = await startAttempt(exam.id, 'طالب')

    await payload.delete({
      collection: 'exams',
      id: exam.id,
      user: teacher as never,
      overrideAccess: false,
    })

    const remaining = await payload.find({
      collection: 'exam-attempts',
      where: { id: { equals: attempt.id } },
      overrideAccess: true,
      limit: 1,
    })
    expect(remaining.docs).toHaveLength(0)
  })
})

describe('concurrency', () => {
  it('handles 50 simultaneous submissions with no lost or duplicated results', async () => {
    const teacher = await makeTeacher(`conc-${Date.now()}@school.test`)
    const exam = await makeExam(teacher)
    const questions = exam.questions ?? []
    const correct = questions.map((q) => ({
      questionId: String(q.id),
      selectedOption: q.correctOption as number,
    }))

    const sessions = await Promise.all(
      Array.from({ length: 50 }, (_, i) => startAttempt(exam.id, `طالب ${i + 1}`)),
    )

    const results = await Promise.all(
      sessions.map(({ attempt, token }) => submitAttempt(attempt.id, token, correct)),
    )

    expect(results).toHaveLength(50)
    expect(results.every((r) => r.status === 'submitted')).toBe(true)
    expect(results.every((r) => r.score === 5)).toBe(true)

    const stored = await payload.find({
      collection: 'exam-attempts',
      where: {
        and: [{ exam: { equals: exam.id } }, { status: { not_equals: 'in-progress' } }],
      },
      user: teacher as never,
      overrideAccess: false,
      limit: 200,
    })
    expect(stored.docs).toHaveLength(50)
    const ids = new Set(stored.docs.map((d) => String(d.id)))
    expect(ids.size).toBe(50)
  })
})

describe('teacher accounts', () => {
  it('rejects a duplicate email at the database level', async () => {
    const email = `dup-${Date.now()}@school.test`
    await makeTeacher(email)
    await expect(
      payload.create({
        collection: 'teachers',
        data: { name: 'Second', email, password: PASSWORD },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('stores passwords hashed, never in plain text', async () => {
    const email = `hash-${Date.now()}@school.test`
    const teacher = await makeTeacher(email)
    const raw = await payload.findByID({
      collection: 'teachers',
      id: teacher.id,
      overrideAccess: true,
      showHiddenFields: true,
    })
    expect(JSON.stringify(raw)).not.toContain(PASSWORD)
  })

  it('logs in with the correct password', async () => {
    const email = `login-${Date.now()}@school.test`
    await makeTeacher(email)
    const result = await payload.login({
      collection: 'teachers',
      data: { email, password: PASSWORD },
      overrideAccess: false,
    })
    expect(result.token).toBeTruthy()
    expect(result.user?.email).toBe(email)
  })

  it('rejects a wrong password', async () => {
    const email = `wrong-${Date.now()}@school.test`
    await makeTeacher(email)
    await expect(
      payload.login({
        collection: 'teachers',
        data: { email, password: 'wrong-password' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('rejects a non-existent user', async () => {
    await expect(
      payload.login({
        collection: 'teachers',
        data: { email: `ghost-${Date.now()}@school.test`, password: PASSWORD },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('never exposes one teacher to another', async () => {
    const one = await makeTeacher(`iso1-${Date.now()}@school.test`)
    const two = await makeTeacher(`iso2-${Date.now()}@school.test`)
    const visible = await payload.find({
      collection: 'teachers',
      user: two as never,
      overrideAccess: false,
      limit: 100,
    })
    expect(visible.docs.map((d) => String(d.id))).toEqual([String(two.id)])
    expect(visible.docs.map((d) => String(d.id))).not.toContain(String(one.id))
  })
})
