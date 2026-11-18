import { expect, test } from '@playwright/test'
import { PASSWORD, logIn, signUp, uniqueEmail } from './helpers'

test.describe('teacher auth', () => {
  test('signs up with valid details and lands on the dashboard', async ({ page }) => {
    await signUp(page)
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
  })

  test('rejects a duplicate email', async ({ page }) => {
    const { email } = await signUp(page)
    // Sign out, then try the same email again.
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click()
    await page.waitForURL('/')

    await page.goto('/signup')
    await page.getByLabel('الاسم').fill('أ/ سارة علي')
    await page.getByLabel('البريد الإلكتروني').fill(email)
    await page.getByLabel('كلمة المرور').fill(PASSWORD)
    await page.getByRole('button', { name: /إنشاء حساب المدرس/ }).click()

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/signup/)
  })

  test('rejects an empty password', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('الاسم').fill('أ/ محمد أحمد')
    await page.getByLabel('البريد الإلكتروني').fill(uniqueEmail('empty'))
    await page.getByLabel('كلمة المرور').fill('')
    await page.getByRole('button', { name: /إنشاء حساب المدرس/ }).click()

    // The browser blocks the submit (required + minLength), so we stay on signup.
    await expect(page).toHaveURL(/\/signup/)
  })

  test('rejects a weak 7-character password', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('الاسم').fill('أ/ محمد أحمد')
    await page.getByLabel('البريد الإلكتروني').fill(uniqueEmail('weak'))
    await page.getByLabel('كلمة المرور').fill('1234567')
    await page.getByRole('button', { name: /إنشاء حساب المدرس/ }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('rejects an invalid email', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel('الاسم').fill('أ/ محمد أحمد')
    await page.getByLabel('البريد الإلكتروني').fill('not-an-email')
    await page.getByLabel('كلمة المرور').fill(PASSWORD)
    await page.getByRole('button', { name: /إنشاء حساب المدرس/ }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('logs in with correct credentials', async ({ page }) => {
    const { email } = await signUp(page)
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click()
    await page.waitForURL('/')

    await logIn(page, email)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
  })

  test('rejects a wrong password', async ({ page }) => {
    const { email } = await signUp(page)
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click()
    await page.waitForURL('/')

    await logIn(page, email, 'wrong-password-123')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('rejects a non-existent user', async ({ page }) => {
    await logIn(page, uniqueEmail('ghost'))
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('logs out and cannot reach the dashboard afterwards', async ({ page }) => {
    await signUp(page)
    await page.getByRole('button', { name: /تسجيل الخروج/ }).click()
    await page.waitForURL('/')

    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 20_000 })
  })

  test('keeps the session after a page refresh', async ({ page }) => {
    await signUp(page)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('redirects /dashboard to /login when logged out', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 20_000 })
  })

  test('redirects /dashboard/exams/new to /login when logged out', async ({ page }) => {
    await page.goto('/dashboard/exams/new')
    await page.waitForURL(/\/login/, { timeout: 20_000 })
  })

  test('redirects /dashboard/exams/1 to /login when logged out', async ({ page }) => {
    await page.goto('/dashboard/exams/1')
    await page.waitForURL(/\/login/, { timeout: 20_000 })
  })

  test('does not set a session cookie on a failed login', async ({ page, context }) => {
    await logIn(page, uniqueEmail('nouser'), 'whatever-123')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 20_000 })
    const cookies = await context.cookies()
    expect(cookies.find((cookie) => cookie.name === 'app-session')).toBeUndefined()
  })
})
