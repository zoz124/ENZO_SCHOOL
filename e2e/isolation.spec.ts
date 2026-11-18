import { expect, test } from '@playwright/test'
import { PASSWORD, createExam, logIn, signUp } from './helpers'

test.describe('teacher isolation (IDOR)', () => {
  test('teacher B cannot open teacher A exam by direct URL', async ({ page, context }) => {
    await signUp(page)
    const exam = await createExam(page)
    const detailsUrl = page.url()

    // Teacher B in a clean session.
    await context.clearCookies()
    await signUp(page, { name: 'أ/ سارة علي' })

    const response = await page.goto(detailsUrl)
    // Payload denies the read, the page calls notFound() -> 404.
    expect([404, 200]).toContain(response?.status())
    await expect(page.getByRole('heading', { name: 'الرابط غير صالح' })).toBeVisible()
  })

  test('teacher B does not see teacher A exams on the dashboard', async ({ page, context }) => {
    await signUp(page)
    await createExam(page, { title: 'امتحان المدرس الأول' })

    await context.clearCookies()
    await signUp(page, { name: 'أ/ سارة علي' })

    await page.goto('/dashboard')
    await expect(page.getByText('لا توجد امتحانات بعد')).toBeVisible()
    await expect(page.getByText('امتحان المدرس الأول')).toHaveCount(0)
  })

  test('unauthenticated API access to exams is denied', async ({ request }) => {
    const response = await request.post('/api/exams', {
      data: {
        title: 'محاولة غير مصرح بها',
        subject: 'الرياضيات',
        durationMinutes: 10,
        status: 'active',
        code: 'hack123456',
        questions: [
          { prompt: 'سؤال؟', options: [{ text: 'أ' }, { text: 'ب' }], correctOption: 0, points: 1 },
        ],
      },
    })
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('unauthenticated API cannot read exam attempts', async ({ request }) => {
    const response = await request.get('/api/exam-attempts')
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('unauthenticated API cannot read teachers', async ({ request }) => {
    const response = await request.get('/api/teachers')
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })
})

test.describe('RTL and theme', () => {
  test('renders the dashboard right-to-left', async ({ page }) => {
    await signUp(page)
    const dir = await page.locator('div[dir="rtl"]').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('renders the student exam right-to-left', async ({ page }) => {
    await signUp(page)
    const { code } = await createExam(page)
    await page.goto(`/exam/${code}`)
    const dir = await page.locator('main[dir="rtl"]').first().getAttribute('dir')
    expect(dir).toBe('rtl')
  })

  test('uses the burgundy/off-white theme on the landing page', async ({ page }) => {
    await page.goto('/')
    const body = page.locator('body')
    const background = await body.evaluate((el) => getComputedStyle(el).backgroundColor)
    // #fbf8f2 off-white
    expect(background).toBe('rgb(251, 248, 242)')

    const primary = await page
      .getByRole('link', { name: /ابدأ مجانًا/ })
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    // #721b3b burgundy
    expect(primary).toBe('rgb(114, 27, 59)')
  })

  test('keeps the exam runner usable on a phone viewport', async ({ page }) => {
    await signUp(page)
    const { code } = await createExam(page)
    await page.goto(`/exam/${code}`)

    // The start form must be visible and tappable without horizontal scroll.
    await expect(page.getByPlaceholder('الاسم الثلاثي')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(2)
  })

  test('keeps the login page usable on a phone viewport', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(2)
  })
})
