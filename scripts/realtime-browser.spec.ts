import { test, expect } from '@playwright/test'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { Pool } from 'pg'

// Uses isolated records and the locally running CMS + Centrifugo; never touches existing content.
test('Connect gates controls, pushes changes without reload, expires after five minutes and does not poll', async ({ browser, baseURL }) => {
  const origin = baseURL!
  const token = randomBytes(32).toString('base64url')
  const db = new Pool({ connectionString: process.env.DATABASE_URL })
  const user = { id: randomUUID() }
  await db.query('INSERT INTO "User" (id, name, email, "passwordHash", role, "updatedAt") VALUES ($1, $2, $3, $4, $5, now())', [user.id, 'Realtime browser test', `browser-test-${randomBytes(6).toString('hex')}@example.invalid`, 'test-only-no-login', 'ADMIN'])
  let screenId = '', sessionId = ''
  const context = await browser.newContext({ baseURL: origin })
  await context.addCookies([{ name: 'tr-cms-session', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }])
  await db.query('INSERT INTO "UserSession" (id, "userId", "tokenHash", "expiresAt") VALUES ($1, $2, $3, $4)', [randomUUID(), user.id, createHash('sha256').update(token).digest('hex'), new Date(Date.now() + 600000)])
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=', 'base64')
  await context.route('https://example.com/**', route => route.fulfill({ contentType: 'image/png', body: pixel }))
  try {
    const created = await context.request.post('/api/screens', { data: {} })
    expect(created.status()).toBe(201)
    const screen = await created.json(); screenId = screen.id
    sessionId = randomUUID()
    await db.query('INSERT INTO "Session" (id, status, "updatedAt") VALUES ($1, $2, now())', [sessionId, 'COMPLETED'])
    const doc = { id: randomUUID(), name: 'Browser realtime image' }
    await db.query('INSERT INTO "Document" (id, "sessionId", name, "mimeType", size, "s3Url", status, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, now())', [doc.id, sessionId, doc.name, 'image/png', 68, 'https://example.com/realtime.png', 'UPLOADED'])
    const control = await context.newPage()
    await control.clock.install()
    const reads: string[] = []
    control.on('request', request => { if (request.method() === 'GET' && /\/controls(?:\?|$)/.test(request.url())) reads.push(request.url()) })
    await control.goto('/control')
    await control.getByRole('combobox', { name: 'Target screen' }).selectOption(screen.code)
    await expect(control.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled()
    expect(reads.length).toBe(0)
    await control.getByRole('button', { name: 'Connect', exact: true }).click()
    await expect(control.getByRole('button', { name: 'Disconnect', exact: true })).toBeVisible()
    await expect(control.getByLabel('Control session time remaining')).toHaveText(/^[45]:[0-5][0-9]$/)
    const player = await context.newPage()
    let playerReads = 0
    player.on('request', request => { if (request.method() === 'GET' && /\/controls(?:\?|$)/.test(request.url())) playerReads++ })
    await player.goto(`/view/screen/${screen.code}`)
    await expect(player.getByText('Assign media from Main Screen to start playback.')).toBeVisible()
    const assigned = await context.request.post(`/api/screens/${screen.code}/assets`, { data: { documentId: doc.id } })
    expect(assigned.status()).toBe(201)
    await expect(control.getByRole('heading', { name: doc.name, exact: true })).toBeVisible()
    const image = player.getByRole('img', { name: doc.name })
    await expect(image).toBeVisible()
    await image.evaluate(element => { element.setAttribute('data-kept', 'yes') })
    await control.getByRole('button', { name: 'Rotate image', exact: true }).click()
    await expect(image).toHaveCSS('transform', /matrix\(0, 1, -1, 0,/)
    await expect(image).toHaveAttribute('data-kept', 'yes')
    expect(reads.length).toBe(1)
    expect(playerReads).toBe(1)
    await control.screenshot({ path: 'test-results/control-connected.png', fullPage: true })
    await control.clock.setSystemTime(new Date(Date.now() + 301000))
    await control.clock.runFor(1100)
    await expect(control.getByRole('button', { name: 'Connect', exact: true })).toBeVisible()
    await expect(control.getByRole('button', { name: 'Rotate image', exact: true })).toBeDisabled()
    await expect(control.getByText(/Five-minute control session ended/)).toBeVisible()
    // Control expiry must not disconnect the player.
    await expect(image).toBeVisible()
    await control.screenshot({ path: 'test-results/control-expired.png', fullPage: true })
    await player.waitForTimeout(3500)
    expect(reads.length).toBe(1)
    expect(playerReads).toBe(1)
  } finally {
    await context.close()
    if (screenId) await db.query('DELETE FROM "Screen" WHERE id = $1', [screenId])
    if (sessionId) await db.query('DELETE FROM "Session" WHERE id = $1', [sessionId])
    await db.query('DELETE FROM "User" WHERE id = $1', [user.id])
    await db.end()
  }
})

test('desktop renderer updates controls in place and disposes removed media', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { player: { onScreen(callback: (snapshot: unknown) => void) { Object.assign(window, { applyScreenSnapshot: callback }) }, reset() {} } })
  })
  const { pathToFileURL } = await import('node:url')
  const { resolve } = await import('node:path')
  await page.goto(`${pathToFileURL(resolve('desktop/player.html')).href}?kind=layout`)
  const asset = { id: 'image', kind: 'image', document: { name: 'Desktop image', s3Url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=' }, controls: { rotation: 0 } }
  const apply = async (assets: unknown[]) => page.evaluate(assets => (window as unknown as { applyScreenSnapshot: (snapshot: unknown) => void }).applyScreenSnapshot({ assets }), assets)
  await apply([asset])
  const image = page.getByRole('img')
  await expect(image).toBeVisible()
  await image.evaluate(element => element.setAttribute('data-kept', 'yes'))
  await apply([{ ...asset, controls: { rotation: 90 } }])
  await expect(image).toHaveCSS('transform', /matrix\(0, 1, -1, 0,/)
  await expect(image).toHaveAttribute('data-kept', 'yes')
  await apply([])
  await expect(page.getByRole('img')).toHaveCount(0)
  await expect(page.getByText('No media assigned to this screen.')).toBeVisible()
})

test('unavailable WebSocket stops once, with no fallback reads or reconnect loop', async ({ page }) => {
  const db = new Pool({ connectionString: process.env.DATABASE_URL })
  const id = randomUUID()
  const code = String(10000 + Math.floor(Math.random() * 90000))
  let attempts = 0, snapshotReads = 0
  try {
    await db.query('INSERT INTO "Screen" (id, code, name, "updatedAt") VALUES ($1, $2, $3, now())', [id, code, 'Realtime failure test'])
    await page.routeWebSocket('**/connection/websocket', socket => { attempts++; socket.close({ code: 1011, reason: 'Test service unavailable' }) })
    page.on('request', request => { if (request.method() === 'GET' && /\/controls(?:\?|$)/.test(request.url())) snapshotReads++ })
    await page.goto(`/view/screen/${code}`)
    await expect(page.getByRole('button', { name: 'Reconnect', exact: true })).toBeVisible()
    await page.waitForTimeout(3500)
    expect(attempts).toBe(1)
    expect(snapshotReads).toBe(0)
  } finally {
    await page.close()
    await db.query('DELETE FROM "Screen" WHERE id = $1', [id])
    await db.end()
  }
})
