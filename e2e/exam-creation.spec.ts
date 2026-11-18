import { expect, test } from '@playwright/test'
import { createExam, signUp } from './helpers'

test.describe('exam creation', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page)
  })

  test('creates an exam and shows a shareable link', async ({ page }) => {
    const { code } = await createExam(page)
    expect(code).toHaveLength(10)
    await expect(page.locator('code').first()).toContainText(`/exam/${code}`)
  })

  test('gives every exam a different code', async ({ page }) => {
    const first = await createExam(page, { title: 'امتحان أول' })
    const second = await createExam(page, { title: 'امتحان ثانٍ' })
    expect(first.code).not.toBe(second.code)
  })

  test('blocks an empty title', async ({ page }) => {
    await page.goto('/dashboard/exams/new')
    await page.getByLabel('المادة').fill('الرياضيات')
    await page.getByLabel('مدة الامتحان بالدقائق').fill('30')
    await page.getByRole('button', { name: /إنشاء الامتحان والرابط/ }).click()
    // HTML required blocks it; we must stay on the builder.
    await expect(page).toHaveURL(/\/dashboard\/exams\/new/)
  })

  test('blocks duration 0', async ({ page }) => {
    await page.goto('/dashboard/exams/new')
    await page.getByLabel('اسم الامتحان').fill('امتحان مدة صفر')
    await page.getByLabel('المادة').fill('الرياضيات')
    await page.getByLabel('مدة الامتحان بالدقائق').fill('0')
    await page.getByRole('button', { name: /إنشاء الامتحان والرابط/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/exams\/new/)
  })

  test('blocks a negative duration', async ({ page }) => {
    await page.goto('/dashboard/exams/new')
    await page.getByLabel('اسم الامتحان').fill('امتحان مدة سالبة')
    await page.getByLabel('المادة').fill('الرياضيات')
    await page.getByLabel('مدة الامتحان بالدقائق').fill('-5')
    await page.getByRole('button', { name: /إنشاء الامتحان والرابط/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/exams\/new/)
  })

  test('rejects a question with empty text on the server', async ({ page }) => {
    await page.goto('/dashboard/exams/new')
    await page.getByLabel('اسم الامتحان').fill('امتحان بسؤال فارغ')
    await page.getByLabel('المادة').fill('الرياضيات')
    await page.getByLabel('مدة الامتحان بالدقائق').fill('30')
    const card = page.locator('article').first()
    await card.locator('input.input-field').nth(0).fill('أ')
    await card.locator('input.input-field').nth(1).fill('ب')
    await page.getByRole('button', { name: /إنشاء الامتحان والرابط/ }).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard\/exams\/new/)
  })

  test('rejects an empty option on the server', async ({ page }) => {
    await page.goto('/dashboard/exams/new')
    await page.getByLabel('اسم الامتحان').fill('امتحان باختيار فارغ')
    await page.getByLabel('المادة').fill('الرياضيات')
    await page.getByLabel('مدة الامتحان بالدقائق').fill('30')
    const card = page.locator('article').first()
    await card.locator('textarea').first().fill('ما ناتج ٢ + ٢؟')
    await card.locator('input.input-field').nth(0).fill('٤')
    await page.getByRole('button', { name: /إنشاء الامتحان والرابط/ }).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/dashboard\/exams\/new/)
  })

  test('accepts Arabic text and emoji', async ({ page }) => {
    const { code } = await createExam(page, {
      title: 'امتحان 😀 العلوم',
      questions: [{ prompt: 'ما معنى 🌙 في العربية؟', options: ['القمر', 'الشمس'], correctIndex: 0 }],
    })
    await page.goto(`/exam/${code}`)
    await expect(page.getByRole('heading', { name: 'امتحان 😀 العلوم' })).toBeVisible()
  })

  test('escapes HTML/script injection instead of executing it', async ({ page }) => {
    const injected = '<img src=x onerror="window.__xss=1">'
    const { code } = await createExam(page, {
      title: 'امتحان حقن',
      questions: [{ prompt: injected, options: ['أ', 'ب'], correctIndex: 0 }],
    })

    // The question prompt is only rendered once the attempt starts.
    await page.goto(`/exam/${code}`)
    await page.getByPlaceholder('الاسم الثلاثي').fill('طالب حقن')
    await page.getByRole('button', { name: /ابدأ الامتحان/ }).click()
    await expect(page.getByText('تقدمك')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1500)

    // The payload must be rendered as inert text, never executed.
    const xss = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)
    expect(xss).toBeUndefined()

    // It must survive verbatim as text content of the question heading.
    const questionText = await page.locator('article h2').first().innerText()
    expect(questionText).toContain(injected)

    // And no injected <img> element may exist in the DOM.
    const injectedImages = await page.locator('img[src="x"]').count()
    expect(injectedImages).toBe(0)
  })

  test('shows an empty state on a fresh dashboard', async ({ page }) => {
    await expect(page.getByText('لا توجد امتحانات بعد')).toBeVisible()
  })

  test('opens the exam details page with an empty results state', async ({ page }) => {
    await createExam(page)
    await expect(page.getByText('لم يدخل أي طالب بعد')).toBeVisible()
  })
})
