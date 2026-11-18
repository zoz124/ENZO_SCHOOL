import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { computeTiming } from '@/lib/exam-timing'

type AppUser = { id: string; collection: string }

const teacherAttemptAccess: Access = ({ req }) => {
  const user = req.user as AppUser | null
  if (user?.collection === 'admins') return true
  if (user?.collection !== 'teachers') return false
  return { teacher: { equals: user.id } }
}

/**
 * Payload document IDs may be strings or numbers depending on the database
 * adapter. Always compare them as strings so ownership checks cannot silently
 * fail (or silently pass) on a type mismatch.
 */
const sameId = (a: unknown, b: unknown): boolean => {
  if (a === null || a === undefined || b === null || b === undefined) return false
  const left = typeof a === 'object' && a !== null && 'id' in a ? (a as { id: unknown }).id : a
  const right = typeof b === 'object' && b !== null && 'id' in b ? (b as { id: unknown }).id : b
  return String(left) === String(right)
}

const canUpdateAttempt: Access = async ({ req, id, data }) => {
  const user = req.user as AppUser | null
  if (user?.collection === 'admins') return true

  if (user?.collection === 'teachers' && id) {
    const attempt = await req.payload.findByID({
      collection: 'exam-attempts',
      id,
      depth: 0,
      overrideAccess: true,
    })
    return sameId(attempt.teacher, user.id)
  }

  if (!id || req.context.studentSubmission !== true || !data?.submissionToken) return false
  const attempt = await req.payload.findByID({
    collection: 'exam-attempts',
    id,
    depth: 0,
    overrideAccess: true,
    // submissionToken has field-level read:false, so it is stripped unless
    // hidden fields are explicitly requested. Without this the token check
    // below can never match and every student submission is rejected.
    showHiddenFields: true,
  })
  return attempt.status === 'in-progress' && sameId(attempt.submissionToken, data.submissionToken)
}

const prepareAttempt: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (req.context.studentSubmission !== true) return data

  const rawExam = operation === 'create' ? data.exam : (originalDoc?.exam ?? data.exam)
  // Relationship values arrive either as an id or as a populated document.
  const examId =
    rawExam && typeof rawExam === 'object' ? (rawExam as { id: unknown }).id : rawExam
  if (examId === null || examId === undefined || examId === '') {
    throw new Error('Invalid exam.')
  }

  const exam = await req.payload.findByID({
    collection: 'exams',
    id: examId,
    depth: 0,
    overrideAccess: true,
  })

  if (!exam || exam.status !== 'active') throw new Error('This exam is not available.')

  if (operation === 'create') {
    data.teacher =
      exam.owner && typeof exam.owner === 'object'
        ? (exam.owner as { id: unknown }).id
        : exam.owner
    data.startedAt = new Date().toISOString()
    data.status = 'in-progress'
    data.score = 0
    data.maxScore = (exam.questions ?? []).reduce(
      (sum, question) => sum + (question.points ?? 1),
      0,
    )
    data.wrongCount = 0
    return data
  }

  const timing = computeTiming(originalDoc.startedAt, exam.durationMinutes, Date.now())
  const durationSeconds = timing.elapsedSeconds
  const incoming = Array.isArray(data.answers) ? data.answers : []
  let score = 0
  let wrongCount = 0

  data.answers = (exam.questions ?? []).map((question, index) => {
    // Match by id only. A positional fallback would silently attribute one
    // student's answer to a different question when they answer out of order.
    const answer = incoming.find((item) => sameId(item.questionId, question.id))
    const selectedOption =
      answer && Number.isInteger(answer.selectedOption) ? answer.selectedOption : -1
    const isCorrect = selectedOption === question.correctOption
    if (isCorrect) score += question.points ?? 1
    else wrongCount += 1
    return {
      questionId: String(question.id ?? index),
      selectedOption,
      isCorrect,
    }
  })
  data.score = score
  data.maxScore = (exam.questions ?? []).reduce((sum, question) => sum + (question.points ?? 1), 0)
  data.wrongCount = wrongCount
  data.durationSeconds = durationSeconds
  data.submittedAt = new Date().toISOString()
  data.status = timing.expired ? 'auto-submitted' : 'submitted'
  return data
}

const serverManaged = ({ req }: { req: { context: Record<string, unknown> } }) =>
  req.context.studentSubmission === true

export const ExamAttempts: CollectionConfig = {
  slug: 'exam-attempts',
  labels: {
    singular: 'Exam attempt',
    plural: 'Exam attempts',
  },
  admin: {
    group: 'ENZO School',
    useAsTitle: 'studentName',
    defaultColumns: [
      'studentName',
      'exam',
      'score',
      'wrongCount',
      'durationSeconds',
      'submittedAt',
    ],
  },
  access: {
    create: ({ req }) => req.context.studentSubmission === true,
    read: teacherAttemptAccess,
    update: canUpdateAttempt,
    delete: teacherAttemptAccess,
  },
  hooks: {
    beforeChange: [prepareAttempt],
    beforeValidate: [
      ({ data }) => {
        // Trim the student name at the boundary so a whitespace-only name can
        // never be stored, regardless of which caller created the attempt.
        if (typeof data?.studentName === 'string') {
          data.studentName = data.studentName.trim()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'studentName',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 80,
    },
    {
      name: 'exam',
      type: 'relationship',
      relationTo: 'exams',
      required: true,
      index: true,
      access: { update: () => false },
    },
    {
      name: 'teacher',
      type: 'relationship',
      relationTo: 'teachers',
      required: true,
      index: true,
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'submissionToken',
      type: 'text',
      required: true,
      hidden: true,
      access: {
        create: serverManaged,
        read: () => false,
        update: serverManaged,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'in-progress',
      options: [
        { label: 'In progress', value: 'in-progress' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Auto submitted', value: 'auto-submitted' },
      ],
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'submittedAt',
      type: 'date',
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'durationSeconds',
      type: 'number',
      defaultValue: 0,
      min: 0,
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'score',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'maxScore',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'wrongCount',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      access: { create: serverManaged, update: serverManaged },
    },
    {
      name: 'answers',
      type: 'array',
      fields: [
        {
          name: 'questionId',
          type: 'text',
          required: true,
        },
        {
          name: 'selectedOption',
          type: 'number',
          required: true,
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          access: { create: serverManaged, update: serverManaged },
        },
      ],
    },
  ],
}
