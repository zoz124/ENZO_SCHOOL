'use server'

import config from '@payload-config'
import { getPayload } from 'payload'
import { getCurrentTeacher } from '@/lib/teacher-auth'
import { validateExamInput, validateStudentName } from '@/lib/exam-validation'

export type ExamActionState = {
  ok: boolean
  message?: string
  examId?: string
}

export async function createExamAction(input: unknown): Promise<ExamActionState> {
  const teacher = await getCurrentTeacher()
  if (!teacher) return { ok: false, message: 'انتهت الجلسة. سجل الدخول مرة أخرى.' }

  const validated = validateExamInput(input)
  if (!validated.ok) return { ok: false, message: validated.message }

  const { title, subject, description, durationMinutes, questions } = validated.data

  try {
    const payload = await getPayload({ config })
    const exam = await payload.create({
      collection: 'exams',
      data: {
        title,
        subject,
        description,
        durationMinutes,
        status: 'active',
        code: crypto.randomUUID().replaceAll('-', '').slice(0, 10),
        owner: teacher.id,
        questions,
      },
      user: teacher,
      overrideAccess: false,
      draft: false,
    })
    return { ok: true, examId: String(exam.id) }
  } catch {
    return { ok: false, message: 'تعذر حفظ الامتحان. حاول مرة أخرى.' }
  }
}

export type AttemptSession = {
  ok: boolean
  message?: string
  attemptId?: string
  token?: string
  startedAt?: string
  /** Absolute server time when the attempt must end, in ms since epoch. */
  deadline?: number
  /** Remaining seconds the server says the student has right now. */
  remainingSeconds?: number
}

export async function startAttemptAction(
  examId: string,
  studentName: string,
): Promise<AttemptSession> {
  const nameCheck = validateStudentName(studentName)
  if (!nameCheck.ok) return { ok: false, message: nameCheck.message }

  if (typeof examId !== 'string' || !examId) {
    return { ok: false, message: 'الامتحان غير متاح حاليًا.' }
  }

  try {
    const payload = await getPayload({ config })
    const exam = await payload.findByID({
      collection: 'exams',
      id: examId,
      depth: 0,
      overrideAccess: true,
    })
    if (!exam || exam.status !== 'active') {
      return { ok: false, message: 'الامتحان غير متاح حاليًا.' }
    }

    const token = crypto.randomUUID()
    const attempt = await payload.create({
      collection: 'exam-attempts',
      data: {
        studentName: nameCheck.name,
        exam: exam.id,
        teacher: exam.owner && typeof exam.owner === 'object' ? exam.owner.id : exam.owner,
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
      showHiddenFields: false,
      draft: false,
    })

    // The server owns the clock. The client mirrors these values but can never
    // extend its own time: submitAttemptAction recomputes elapsed time from
    // startedAt and caps it at the exam duration.
    const startedAtMs = new Date(attempt.startedAt as string).getTime()
    const deadline = startedAtMs + exam.durationMinutes * 60 * 1000

    return {
      ok: true,
      attemptId: String(attempt.id),
      token,
      startedAt: attempt.startedAt as string,
      deadline,
      remainingSeconds: Math.max(0, Math.round((deadline - Date.now()) / 1000)),
    }
  } catch {
    return { ok: false, message: 'تعذر بدء الامتحان. حاول مرة أخرى.' }
  }
}

export type SubmissionResult = {
  ok: boolean
  message?: string
  score?: number
  maxScore?: number
  wrongCount?: number
  durationSeconds?: number
  late?: boolean
  modelAnswers?: Array<{
    prompt: string
    selectedOption: number
    correctOption: number
    options: string[]
    isCorrect: boolean
  }>
}

export async function submitAttemptAction(input: {
  attemptId: string
  token: string
  answers: Array<{ questionId: string; selectedOption: number }>
}): Promise<SubmissionResult> {
  if (
    !input ||
    !input.attemptId ||
    !input.token ||
    !Array.isArray(input.answers)
  ) {
    return { ok: false, message: 'بيانات التسليم غير مكتملة.' }
  }

  try {
    const payload = await getPayload({ config })

    // Reject a second submission for an attempt that is already finished.
    // This is what makes double-click and two-tab submits safe.
    const existing = await payload.findByID({
      collection: 'exam-attempts',
      id: input.attemptId,
      depth: 0,
      overrideAccess: true,
      // submissionToken is a hidden field with field-level read:false; it is
      // stripped unless hidden fields are explicitly requested.
      showHiddenFields: true,
    })
    if (!existing) return { ok: false, message: 'محاولة غير موجودة.' }
    if (existing.status !== 'in-progress') {
      return { ok: false, message: 'تم تسليم هذا الامتحان بالفعل.' }
    }
    if (existing.submissionToken !== input.token) {
      return { ok: false, message: 'بيانات التسليم غير صحيحة.' }
    }

    const updated = await payload.update({
      collection: 'exam-attempts',
      id: input.attemptId,
      data: {
        submissionToken: input.token,
        answers: input.answers.slice(0, 100),
      },
      context: { studentSubmission: true },
      overrideAccess: false,
    })

    const examId = typeof updated.exam === 'object' && updated.exam !== null ? updated.exam.id : updated.exam
    const exam = await payload.findByID({
      collection: 'exams',
      id: examId,
      depth: 0,
      overrideAccess: true,
    })

    return {
      ok: true,
      score: updated.score,
      maxScore: updated.maxScore,
      wrongCount: updated.wrongCount,
      durationSeconds: updated.durationSeconds ?? 0,
      late: updated.status === 'auto-submitted',
      modelAnswers: (exam.questions ?? []).map((question, index) => {
        const answer = (updated.answers ?? [])[index]
        return {
          prompt: question.prompt,
          selectedOption: answer?.selectedOption ?? -1,
          correctOption: question.correctOption,
          options: (question.options ?? []).map((option) => option.text),
          isCorrect: Boolean(answer?.isCorrect),
        }
      }),
    }
  } catch {
    return { ok: false, message: 'تعذر تسليم الامتحان. تحقق من الاتصال وحاول مرة أخرى.' }
  }
}

export async function toggleExamStatusAction(
  examId: string,
): Promise<{ ok: boolean; status?: 'active' | 'archived'; message?: string }> {
  const teacher = await getCurrentTeacher()
  if (!teacher) return { ok: false, message: 'انتهت الجلسة. سجل الدخول مرة أخرى.' }

  if (!examId || typeof examId !== 'string') {
    return { ok: false, message: 'معرف الامتحان غير صحيح.' }
  }

  try {
    const payload = await getPayload({ config })
    const exam = await payload.findByID({
      collection: 'exams',
      id: examId,
      user: teacher,
      overrideAccess: false,
      depth: 0,
    })

    if (!exam) return { ok: false, message: 'الامتحان غير موجود أو لا تملك صلاحية تعديله.' }

    const newStatus: 'active' | 'archived' = exam.status === 'active' ? 'archived' : 'active'
    await payload.update({
      collection: 'exams',
      id: examId,
      data: { status: newStatus },
      user: teacher,
      overrideAccess: false,
    })

    return { ok: true, status: newStatus }
  } catch {
    return { ok: false, message: 'تعذر تعديل حالة الامتحان.' }
  }
}

export async function deleteExamAction(
  examId: string,
): Promise<{ ok: boolean; message?: string }> {
  const teacher = await getCurrentTeacher()
  if (!teacher) return { ok: false, message: 'انتهت الجلسة. سجل الدخول مرة أخرى.' }

  if (!examId || typeof examId !== 'string') {
    return { ok: false, message: 'معرف الامتحان غير صحيح.' }
  }

  try {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'exams',
      id: examId,
      user: teacher,
      overrideAccess: false,
    })

    return { ok: true }
  } catch {
    return { ok: false, message: 'تعذر حذف الامتحان.' }
  }
}
