/**
 * Pure validation for exam creation.
 *
 * Extracted from the server action so the same rules can be unit-tested and so
 * malformed client payloads are rejected with a structured error instead of
 * throwing (which previously produced an unhandled 500).
 */

export const LIMITS = {
  titleMin: 3,
  titleMax: 120,
  subjectMin: 2,
  subjectMax: 80,
  descriptionMax: 500,
  durationMin: 1,
  durationMax: 300,
  questionsMin: 1,
  questionsMax: 100,
  promptMin: 2,
  promptMax: 500,
  optionsMin: 2,
  optionsMax: 8,
  optionMax: 250,
  pointsMin: 1,
  pointsMax: 100,
  nameMin: 2,
  nameMax: 80,
} as const

export type RawQuestion = {
  prompt?: unknown
  options?: unknown
  correctOption?: unknown
  points?: unknown
}

export type NormalizedQuestion = {
  prompt: string
  options: Array<{ text: string }>
  correctOption: number
  points: number
}

export type NormalizedExam = {
  title: string
  subject: string
  description: string
  durationMinutes: number
  questions: NormalizedQuestion[]
}

export type ValidationResult =
  | { ok: true; data: NormalizedExam }
  | { ok: false; message: string }

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return Number.NaN
}

/**
 * Validate and normalise an exam payload.
 * Never throws: every rejection is returned as `{ ok: false, message }`.
 */
export function validateExamInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'بيانات الامتحان غير صحيحة.' }
  }

  const raw = input as Record<string, unknown>
  const title = asString(raw.title).trim()
  const subject = asString(raw.subject).trim()
  const description = asString(raw.description).trim()
  const durationMinutes = asNumber(raw.durationMinutes)

  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) {
    return { ok: false, message: 'اسم الامتحان يجب أن يكون بين 3 و120 حرفًا.' }
  }
  if (subject.length < LIMITS.subjectMin || subject.length > LIMITS.subjectMax) {
    return { ok: false, message: 'اسم المادة يجب أن يكون بين حرفين و80 حرفًا.' }
  }
  if (description.length > LIMITS.descriptionMax) {
    return { ok: false, message: 'الوصف يجب ألا يزيد عن 500 حرف.' }
  }
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < LIMITS.durationMin ||
    durationMinutes > LIMITS.durationMax
  ) {
    return { ok: false, message: 'مدة الامتحان يجب أن تكون بين دقيقة و300 دقيقة.' }
  }

  if (!Array.isArray(raw.questions)) {
    return { ok: false, message: 'قائمة الأسئلة غير صحيحة.' }
  }
  if (raw.questions.length < LIMITS.questionsMin) {
    return { ok: false, message: 'أضف سؤالًا واحدًا على الأقل.' }
  }
  if (raw.questions.length > LIMITS.questionsMax) {
    return {
      ok: false,
      message: `لا يمكن إضافة أكثر من ${LIMITS.questionsMax} سؤالًا في الامتحان الواحد.`,
    }
  }

  const questions: NormalizedQuestion[] = []

  for (let index = 0; index < raw.questions.length; index += 1) {
    const question = raw.questions[index] as RawQuestion | null
    if (!question || typeof question !== 'object') {
      return { ok: false, message: `السؤال رقم ${index + 1} غير صحيح.` }
    }

    const prompt = asString(question.prompt).trim()
    if (prompt.length < LIMITS.promptMin || prompt.length > LIMITS.promptMax) {
      return {
        ok: false,
        message: `نص السؤال رقم ${index + 1} يجب أن يكون بين حرفين و500 حرف.`,
      }
    }

    if (!Array.isArray(question.options)) {
      return { ok: false, message: `اختيارات السؤال رقم ${index + 1} غير صحيحة.` }
    }
    if (
      question.options.length < LIMITS.optionsMin ||
      question.options.length > LIMITS.optionsMax
    ) {
      return {
        ok: false,
        message: `السؤال رقم ${index + 1} يجب أن يحتوي على اختيارين على الأقل و8 كحد أقصى.`,
      }
    }

    const options: Array<{ text: string }> = []
    for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
      const text = asString(question.options[optionIndex]).trim()
      if (!text) {
        return {
          ok: false,
          message: `الاختيار رقم ${optionIndex + 1} في السؤال رقم ${index + 1} فارغ.`,
        }
      }
      if (text.length > LIMITS.optionMax) {
        return {
          ok: false,
          message: `الاختيار رقم ${optionIndex + 1} في السؤال رقم ${index + 1} أطول من 250 حرفًا.`,
        }
      }
      options.push({ text })
    }

    const correctOption = asNumber(question.correctOption)
    if (
      !Number.isInteger(correctOption) ||
      correctOption < 0 ||
      correctOption >= options.length
    ) {
      return {
        ok: false,
        message: `حدد الإجابة الصحيحة للسؤال رقم ${index + 1}.`,
      }
    }

    const rawPoints = question.points === undefined || question.points === null ? 1 : asNumber(question.points)
    if (!Number.isInteger(rawPoints) || rawPoints < LIMITS.pointsMin || rawPoints > LIMITS.pointsMax) {
      return {
        ok: false,
        message: `درجة السؤال رقم ${index + 1} يجب أن تكون بين 1 و100.`,
      }
    }

    questions.push({ prompt, options, correctOption, points: rawPoints })
  }

  return {
    ok: true,
    data: { title, subject, description, durationMinutes, questions },
  }
}

/**
 * Validate a student's display name.
 * Whitespace-only names collapse to '' and are rejected.
 */
export function validateStudentName(value: unknown): { ok: true; name: string } | { ok: false; message: string } {
  const name = asString(value).trim()
  if (name.length < LIMITS.nameMin) return { ok: false, message: 'اكتب اسمك كاملًا.' }
  if (name.length > LIMITS.nameMax) {
    return { ok: false, message: `الاسم يجب ألا يزيد عن ${LIMITS.nameMax} حرفًا.` }
  }
  return { ok: true, name }
}

/** Validate a teacher signup / login credential pair. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCredentials(email: unknown, password: unknown) {
  const cleanEmail = asString(email).trim().toLowerCase()
  const cleanPassword = asString(password)
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    return { ok: false as const, message: 'اكتب بريدًا إلكترونيًا صحيحًا.' }
  }
  if (cleanPassword.length < 8) {
    return { ok: false as const, message: 'كلمة المرور يجب ألا تقل عن 8 أحرف.' }
  }
  return { ok: true as const, email: cleanEmail, password: cleanPassword }
}
