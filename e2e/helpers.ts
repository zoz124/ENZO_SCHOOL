import { expect, test } from '@playwright/test'

/**
 * Shared helpers for the E2E suite.
 *
 * Every teacher account is created through the real signup form so the tests
 * exercise the same path a user takes.
 */

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@school.test`

export const PASSWORD = 'password123'

export async function signUp(
  page: import('@playwright/test').Page,
  options: { name?: string; email?: string; password?: string } = {},
) {
  const email = options.email ?? uniqueEmail('teacher')
  await page.goto('/signup')
  await page.getByLabel('الاسم').fill(options.name ?? 'أ/ محمد أحمد')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(options.password ?? PASSWORD)
  await page.getByRole('button', { name: /إنشاء حساب المدرس/ }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  return { email, password: options.password ?? PASSWORD }
}

export async function logIn(
  page: import('@playwright/test').Page,
  email: string,
  password = PASSWORD,
) {
  await page.goto('/login')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(password)
  await page.getByRole('button', { name: /دخول إلى لوحة التحكم/ }).click()
}

/** Create an exam through the builder UI and return its student link. */
export async function createExam(
  page: import('@playwright/test').Page,
  options: {
    title?: string
    subject?: string
    durationMinutes?: number
    questions?: Array<{ prompt: string; options: string[]; correctIndex: number }>
  } = {},
) {
  const title = options.title ?? `امتحان اختبار ${Date.now()}`
  const subject = options.subject ?? 'الرياضيات'
  const questions = options.questions ?? [
    { prompt: 'ما ناتج ٢ + ٢؟', options: ['٣', '٤'], correctIndex: 1 },
  ]

  await page.goto('/dashboard/exams/new')
  await page.getByLabel('اسم الامتحان').fill(title)
  await page.getByLabel('المادة').fill(subject)
  await page.getByLabel('مدة الامتحان بالدقائق').fill(String(options.durationMinutes ?? 30))

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]
    if (index > 0) {
      await page.getByRole('button', { name: /إضافة سؤال/ }).click()
    }
    const card = page.locator('article').filter({ hasText: `السؤال ${index + 1}` }).first()
    await card.locator('textarea').first().fill(question.prompt)

    for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
      if (optionIndex >= 2) {
        await card.getByRole('button', { name: /إضافة اختيار/ }).click()
      }
      await card.locator('input.input-field').nth(optionIndex).fill(question.options[optionIndex])
    }

    await card
      .getByRole('button', { name: `تعيين الاختيار ${question.correctIndex + 1} كإجابة صحيحة` })
      .click()
  }

  await page.getByRole('button', { name: /إنشاء الامتحان والرابط/ }).click()
  await page.waitForURL(/\/dashboard\/exams\/\d+/, { timeout: 30_000 })

  const code = await page.locator('code').first().innerText()
  return { title, code: code.replace('/exam/', '').trim() }
}

/** Start an attempt as a student from the public exam link. */
export async function startAttempt(
  page: import('@playwright/test').Page,
  code: string,
  name = 'محمد أحمد',
) {
  await page.goto(`/exam/${code}`)
  await page.getByPlaceholder('الاسم الثلاثي').fill(name)
  await page.getByRole('button', { name: /ابدأ الامتحان/ }).click()
  await expect(page.getByText('تقدمك')).toBeVisible({ timeout: 30_000 })
}
