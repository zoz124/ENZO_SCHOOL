import { describe, expect, it } from 'vitest'
import {
  EMAIL_PATTERN,
  LIMITS,
  validateCredentials,
  validateExamInput,
  validateStudentName,
} from '@/lib/exam-validation'

const validQuestion = {
  prompt: 'ما هو ناتج ٢ + ٢؟',
  options: ['٣', '٤'],
  correctOption: 1,
  points: 1,
}

const validExam = {
  title: 'امتحان الوحدة الثالثة',
  subject: 'الرياضيات',
  description: 'اختبار قصير',
  durationMinutes: 30,
  questions: [validQuestion],
}

describe('validateExamInput — exam metadata', () => {
  it('accepts a well-formed exam', () => {
    const result = validateExamInput(validExam)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.title).toBe('امتحان الوحدة الثالثة')
      expect(result.data.questions).toHaveLength(1)
    }
  })

  it('rejects an empty title', () => {
    const result = validateExamInput({ ...validExam, title: '' })
    expect(result.ok).toBe(false)
  })

  it('rejects a whitespace-only title', () => {
    const result = validateExamInput({ ...validExam, title: '   ' })
    expect(result.ok).toBe(false)
  })

  it('rejects a title shorter than 3 characters', () => {
    expect(validateExamInput({ ...validExam, title: 'ab' }).ok).toBe(false)
  })

  it('rejects a title longer than 120 characters', () => {
    expect(validateExamInput({ ...validExam, title: 'x'.repeat(121) }).ok).toBe(false)
  })

  it('rejects an empty subject', () => {
    expect(validateExamInput({ ...validExam, subject: '' }).ok).toBe(false)
  })

  it('rejects a description longer than 500 characters', () => {
    expect(validateExamInput({ ...validExam, description: 'x'.repeat(501) }).ok).toBe(false)
  })

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['decimal', 1.5],
    ['huge', 100000],
    ['NaN', Number.NaN],
    ['string garbage', 'abc'],
  ])('rejects duration %s', (_label, durationMinutes) => {
    expect(validateExamInput({ ...validExam, durationMinutes }).ok).toBe(false)
  })

  it('accepts the duration boundaries (1 and 300)', () => {
    expect(validateExamInput({ ...validExam, durationMinutes: 1 }).ok).toBe(true)
    expect(validateExamInput({ ...validExam, durationMinutes: 300 }).ok).toBe(true)
  })

  it('rejects a non-object payload', () => {
    expect(validateExamInput(null).ok).toBe(false)
    expect(validateExamInput('nope').ok).toBe(false)
  })
})

describe('validateExamInput — questions', () => {
  it('rejects an exam with zero questions', () => {
    expect(validateExamInput({ ...validExam, questions: [] }).ok).toBe(false)
  })

  it('rejects a missing questions array', () => {
    expect(validateExamInput({ ...validExam, questions: undefined }).ok).toBe(false)
  })

  it('rejects a question with empty text', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, prompt: '' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a question with whitespace-only text', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, prompt: '   ' }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a question with fewer than 2 options', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, options: ['only one'], correctOption: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a question with more than 8 options', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [
        { ...validQuestion, options: Array.from({ length: 9 }, (_, i) => `opt ${i}`) },
      ],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a question with an empty option', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, options: ['٣', '  '], correctOption: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a question with no correct answer marked', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, correctOption: -1 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a correctOption outside the option range', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, correctOption: 5 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a non-integer correctOption', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, correctOption: 0.5 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects points of 0, negative, or above 100', () => {
    for (const points of [0, -1, 101]) {
      expect(
        validateExamInput({ ...validExam, questions: [{ ...validQuestion, points }] }).ok,
      ).toBe(false)
    }
  })

  it('accepts 100 questions', () => {
    const questions = Array.from({ length: 100 }, (_, i) => ({
      ...validQuestion,
      prompt: `سؤال رقم ${i + 1}`,
    }))
    expect(validateExamInput({ ...validExam, questions }).ok).toBe(true)
  })

  it('rejects more than 100 questions', () => {
    const questions = Array.from({ length: 101 }, (_, i) => ({
      ...validQuestion,
      prompt: `سؤال رقم ${i + 1}`,
    }))
    expect(validateExamInput({ ...validExam, questions }).ok).toBe(false)
  })

  it('preserves Arabic text and emoji verbatim', () => {
    const result = validateExamInput({
      ...validExam,
      questions: [{ ...validQuestion, prompt: 'ما معنى 😀 في العربية؟' }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.questions[0].prompt).toBe('ما معنى 😀 في العربية؟')
  })

  it('keeps HTML/script text as inert data (no stripping, no execution)', () => {
    const payload = '<script>alert(1)</script>'
    const result = validateExamInput({
      ...validExam,
      title: `<img src=x onerror=alert(1)>`,
      questions: [{ ...validQuestion, prompt: payload }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      // Stored verbatim; escaping is React's job at render time.
      expect(result.data.questions[0].prompt).toBe(payload)
    }
  })
})

describe('validateStudentName', () => {
  it('rejects an empty name', () => {
    expect(validateStudentName('').ok).toBe(false)
  })

  it('rejects a whitespace-only name', () => {
    expect(validateStudentName('     ').ok).toBe(false)
    expect(validateStudentName('\t\n ').ok).toBe(false)
  })

  it('rejects a single-character name', () => {
    expect(validateStudentName('أ').ok).toBe(false)
  })

  it('rejects a name longer than 80 characters', () => {
    expect(validateStudentName('ا'.repeat(81)).ok).toBe(false)
  })

  it('accepts and trims an Arabic name', () => {
    const result = validateStudentName('  محمد أحمد علي  ')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.name).toBe('محمد أحمد علي')
  })

  it('accepts exactly 80 characters', () => {
    expect(validateStudentName('ا'.repeat(80)).ok).toBe(true)
  })
})

describe('validateCredentials', () => {
  it('accepts a valid email and 8-char password', () => {
    const result = validateCredentials('Teacher@Example.COM ', 'password123')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.email).toBe('teacher@example.com')
  })

  it.each(['', 'no-at-sign', 'a@b', 'a b@c.com', '@example.com'])(
    'rejects invalid email %s',
    (email) => {
      expect(validateCredentials(email, 'password123').ok).toBe(false)
    },
  )

  it('rejects an empty password', () => {
    expect(validateCredentials('a@b.com', '').ok).toBe(false)
  })

  it('rejects a 7-character password', () => {
    expect(validateCredentials('a@b.com', '1234567').ok).toBe(false)
  })

  it('accepts exactly 8 characters', () => {
    expect(validateCredentials('a@b.com', '12345678').ok).toBe(true)
  })

  it('EMAIL_PATTERN matches a normal address', () => {
    expect(EMAIL_PATTERN.test('teacher@school.edu.eg')).toBe(true)
  })
})

describe('LIMITS', () => {
  it('keeps question and option caps aligned with the schema', () => {
    expect(LIMITS.questionsMax).toBe(100)
    expect(LIMITS.optionsMax).toBe(8)
    expect(LIMITS.durationMax).toBe(300)
  })
})
