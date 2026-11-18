import { expect, test } from '@playwright/test'
import { PASSWORD, createExam, logIn, signUp, startAttempt } from './helpers'

test.describe('student flow', () => {
  let code: string
  let teacherEmail: string

  test.beforeEach(async ({ page }) => {
    const teacher = await signUp(page)
    teacherEmail = teacher.email
    const exam = await createExam(page, {
      durationMinutes: 30,
      questions: [
        { prompt: 'ما ناتج ٢ + ٢؟', options: ['٣', '٤'], correctIndex: 1 },
        { prompt: 'ما عاصمة مصر؟', options: ['الإسكندرية', 'القاهرة'], correctIndex: 1 },
      ],
    })
    code = exam.code
    // Sign the teacher out so the student flow is genuinely anonymous.
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click()
    await page.waitForURL('/')
  })

  test('shows a clear error page for an invalid code', async ({ page }) => {
    const response = await page.goto('/exam/doesnotexist')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'الرابط غير صالح' })).toBeVisible()
  })

  test('shows the exam details before starting', async ({ page }) => {
    await page.goto(`/exam/${code}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByPlaceholder('الاسم الثلاثي')).toBeVisible()
  })

  test('never exposes correct answers before submission', async ({ page }) => {
    const response = await page.goto(`/exam/${code}`)
    const html = (await response?.text()) ?? ''
    expect(html).not.toContain('correctOption')
  })

  test('rejects an empty student name', async ({ page }) => {
    await page.goto(`/exam/${code}`)
    await page.getByRole('button', { name: /ابدأ الامتحان/ }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
  })

  test('rejects a whitespace-only student name', async ({ page }) => {
    await page.goto(`/exam/${code}`)
    await page.getByPlaceholder('الاسم الثلاثي').fill('     ')
    await page.getByRole('button', { name: /ابدأ الامتحان/ }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
  })

  test('accepts an Arabic name and starts the timer', async ({ page }) => {
    await startAttempt(page, code, 'عبد الرحمن محمود')
    await expect(page.locator('span').filter({ hasText: /^\d{2}:\d{2}$/ }).first()).toBeVisible()
  })

  test('counts the timer down', async ({ page }) => {
    await startAttempt(page, code)
    const timer = page.locator('span').filter({ hasText: /^\d{2}:\d{2}$/ }).first()
    const first = await timer.innerText()
    await page.waitForTimeout(2500)
    const second = await timer.innerText()
    expect(second).not.toBe(first)
  })

  test('submits manually and reveals the model answers only afterwards', async ({ page }) => {
    await startAttempt(page, code)

    const options = page.locator('article button')
    await options.nth(1).click()
    await options.nth(3).click()

    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()

    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('نموذج الإجابة')).toBeVisible()
    await expect(page.getByText('4/4')).toBeVisible()
  })

  test('scores an all-wrong submission as zero', async ({ page }) => {
    await startAttempt(page, code)
    const options = page.locator('article button')
    await options.nth(0).click()
    await options.nth(2).click()
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()

    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('0/4')).toBeVisible()
  })

  test('submits with no answers and marks every question wrong', async ({ page }) => {
    await startAttempt(page, code)
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()

    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('0/4')).toBeVisible()
    await expect(page.getByText('بدون إجابة').first()).toBeVisible()
  })

  test('records exactly ONE result when submit is double-clicked', async ({ page }) => {
    await startAttempt(page, code, 'طالب مكرر النقر')
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click({ clickCount: 2, delay: 20 })

    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    // Verify in the teacher dashboard that only one attempt was stored.
    await page.goto('/login')
    await logIn(page, teacherEmail, PASSWORD)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await page.goto(`/dashboard`)
    await page.getByRole('link', { name: /امتحان اختبار/ }).first().click()
    await page.waitForURL(/\/dashboard\/exams\/\d+/)

    const rows = page.locator('tbody tr').filter({ hasText: 'طالب مكرر النقر' })
    await expect(rows).toHaveCount(1)
  })

  test('shows the student result on the teacher dashboard', async ({ page }) => {
    await startAttempt(page, code, 'طالب النتائج')
    const options = page.locator('article button')
    await options.nth(1).click()
    await options.nth(3).click()
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await page.goto('/login')
    await logIn(page, teacherEmail, PASSWORD)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await page.getByRole('link', { name: /امتحان اختبار/ }).first().click()
    await page.waitForURL(/\/dashboard\/exams\/\d+/)

    const row = page.locator('tbody tr').filter({ hasText: 'طالب النتائج' })
    await expect(row).toHaveCount(1)
    await expect(row).toContainText('4/4')
    await expect(row).toContainText('100%')
  })

  test('stores two students with the same name as separate attempts', async ({ page }) => {
    await startAttempt(page, code, 'محمد أحمد')
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await page.goto(`/exam/${code}`)
    await page.getByPlaceholder('الاسم الثلاثي').fill('محمد أحمد')
    await page.getByRole('button', { name: /ابدأ الامتحان/ }).click()
    await expect(page.getByText('تقدمك')).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await page.goto('/login')
    await logIn(page, teacherEmail, PASSWORD)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await page.getByRole('link', { name: /امتحان اختبار/ }).first().click()
    await page.waitForURL(/\/dashboard\/exams\/\d+/)

    const rows = page.locator('tbody tr').filter({ hasText: 'محمد أحمد' })
    await expect(rows).toHaveCount(2)
  })
})
