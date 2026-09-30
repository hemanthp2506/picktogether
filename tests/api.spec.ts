import { test, expect } from '@playwright/test'
import { test as userTest, loadAllTestAccounts } from 'deepspace/testing'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    // /home is a dynamic page (under src/pages/(app)/), so mounting it boots
    // the providers and auto-connects the records WebSocket. The static
    // landing at '/' deliberately does neither — see smoke.spec.ts.
    await page.goto('/home')
    // Wait for the app to connect its WebSocket (it auto-connects on mount)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 15000 })
    // If the app loaded and connected, the WS endpoint works
  })
})

test.describe('summarizeRoom action', () => {
  test('refuses a signed-out caller', async ({ request }) => {
    const res = await request.post('/api/actions/summarizeRoom', { data: { roomId: 'anything' } })
    expect(res.status()).toBe(401)
  })
})

userTest.describe('summarizeRoom action (signed in)', () => {
  const usable = loadAllTestAccounts().length
  userTest.skip(
    usable < 1,
    `Needs 1 usable test account, found ${usable}. Create one with ` +
      '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" --password-stdin`.',
  )

  // These never reach the AI: a room with no votes, and a room that doesn't exist.
  userTest('returns "No votes yet." without calling the AI, and refuses unknown rooms', async ({ users }) => {
    const [a] = await users(1)
    const question = `__test-${Date.now()}__ Summary with no votes`

    await a.page.goto('/home')
    await a.page.getByLabel('Your question').fill(question)
    await a.page.getByRole('button', { name: 'Create room' }).click()
    await a.page.waitForURL(/\/room\/[^/]+$/, { timeout: 15_000 })
    const roomId = new URL(a.page.url()).pathname.split('/').pop()!

    await a.page.getByLabel('New option').fill('Thai')
    await a.page.getByRole('button', { name: 'Add' }).click()
    await expect(a.page.getByTestId('option')).toHaveCount(1)

    // The UI skips the request entirely when there are no votes.
    await a.page.getByRole('button', { name: 'Summarize with AI' }).click()
    await expect(a.page.getByTestId('ai-summary')).toHaveText('No votes yet.')

    // The server enforces the same rule on its own.
    const tokenRes = await a.page.request.post('/api/auth/token')
    const { token } = (await tokenRes.json()) as { token: string }
    const call = (body: unknown) =>
      a.page.request.post('/api/actions/summarizeRoom', {
        headers: { Authorization: `Bearer ${token}` },
        data: body,
      })

    const noVotes = await call({ roomId })
    expect(await noVotes.json()).toEqual({ success: true, data: { summary: 'No votes yet.' } })

    const unknown = await call({ roomId: 'no-such-room' })
    expect(await unknown.json()).toMatchObject({ success: false, error: 'Room not found.' })

    const missing = await call({})
    expect(await missing.json()).toMatchObject({ success: false, error: 'Missing room id.' })
  })
})
