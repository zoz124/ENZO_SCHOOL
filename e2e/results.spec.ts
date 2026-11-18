import { expect, test } from '@playwright/test'
import { PASSWORD, createExam, logIn, signUp, startAttempt } from './helpers'

test.describe('results and dashboard', () => {
  let code: string
  let teacherEmail: string

  test.beforeEach(async ({ page }) => {
    const teacher = await signUp(page)
    teacherEmail = teacher.email
    const exam = await createExam(page, {
      questions: [
        { prompt: 'ما ناتج ٢ + ٢؟', options: ['٣', '٤'], correctIndex: 1 },
        { prompt: 'ما عاصمة مصر؟', options: ['الإسكندرية', 'القاهرة'], correctIndex: 1 },
      ],
    })
    code = exam.code
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click()
    await page.waitForURL('/')
  })

  const openResults = async (page: import('@playwright/test').Page) => {
    await page.goto('/login')
    await logIn(page, teacherEmail, PASSWORD)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await page.getByRole('link', { name: /امتحان اختبار/ }).first().click()
    await page.waitForURL(/\/dashboard\/exams\/\d+/)
  }

  test('shows an empty state when nobody has taken the exam', async ({ page }) => {
    await openResults(page)
    await expect(page.getByText('لم يدخل أي طالب بعد')).toBeVisible()
  })

  test('records score, percentage, errors and time for an all-correct attempt', async ({ page }) => {
    await startAttempt(page, code, 'طالب كامل')
    const options = page.locator('article button')
    await options.nth(1).click()
    await options.nth(3).click()
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await openResults(page)
    const row = page.locator('tbody tr').filter({ hasText: 'طالب كامل' })
    await expect(row).toContainText('2/2')
    await expect(row).toContainText('100%')
    await expect(row).toContainText('0')
  })

  test('records an all-wrong attempt with a zero score', async ({ page }) => {
    await startAttempt(page, code, 'طالب خاطئ')
    const options = page.locator('article button')
    await options.nth(0).click()
    await options.nth(2).click()
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await openResults(page)
    const row = page.locator('tbody tr').filter({ hasText: 'طالب خاطئ' })
    await expect(row).toContainText('0/2')
    await expect(row).toContainText('0%')
    await expect(row).toContainText('2')
  })

  test('computes the average across attempts', async ({ page }) => {
    // Attempt 1: all correct (100%).
    await startAttempt(page, code, 'طالب أول')
    let options = page.locator('article button')
    await options.nth(1).click()
    await options.nth(3).click()
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    // Attempt 2: all wrong (0%). Average must be 50%.
    await page.goto(`/exam/${code}`)
    await page.getByPlaceholder('الاسم الثلاثي').fill('طالب ثانٍ')
    await page.getByRole('button', { name: /ابدأ الامتحان/ }).click()
    await expect(page.getByText('تقدمك')).toBeVisible({ timeout: 30_000 })
    options = page.locator('article button')
    await options.nth(0).click()
    await options.nth(2).click()
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await openResults(page)
    await expect(page.getByText('50%')).toBeVisible()
  })

  test('counts students on the dashboard summary', async ({ page }) => {
    await startAttempt(page, code, 'طالب العد')
    await page.getByRole('button', { name: /تسليم الامتحان/ }).click()
    await expect(page.getByRole('heading', { name: 'تم تسليم الامتحان' })).toBeVisible({
      timeout: 30_000,
    })

    await page.goto('/login')
    await logIn(page, teacherEmail, PASSWORD)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await expect(page.getByText('إجمالي الطلاب')).toBeVisible()
  })
})
