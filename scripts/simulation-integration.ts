import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { prisma } from '../lib/prisma'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

async function main() {
const origin = process.env.SIMULATION_TEST_ORIGIN || 'http://localhost:3001'
const token = randomBytes(32).toString('hex')
const fixture = `simulation-test-${Date.now()}`
const state = await prisma.newsSimulationState.findUniqueOrThrow({ where: { id: 'global' } })
assert.equal(state.active, false, 'End the current simulation before running this integration test')
const feeds = await prisma.newsSimulationScreen.findMany({ where: { screenNumber: { lte: 12 } } })
const user = await prisma.user.create({ data: { name: fixture, email: `${fixture}@example.invalid`, passwordHash: 'unused', role: 'ADMIN' } })
const session = await prisma.session.create({ data: { status: 'COMPLETED' } })
const ids: string[] = []
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  await prisma.userSession.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) } })
  const document = await prisma.document.create({ data: { sessionId: session.id, name: fixture, mimeType: 'image/svg+xml', size: 1, status: 'UPLOADED', s3Url: `${origin}/amagi-logo-white.svg` } })
  for (let index = 0; index < 4; index++) {
    const screen = await prisma.screen.create({ data: { code: String(70000 + Math.floor(Math.random() * 29000)), name: `${fixture}-${index}`, assets: { create: { documentId: document.id } } } })
    ids.push(screen.id)
  }
  const screens = await prisma.screen.findMany({ where: { id: { in: ids } }, include: { assets: true } })
  const originals = JSON.stringify(screens.map(screen => screen.assets))
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(`${origin}${path}`, { method: body ? 'POST' : 'GET', headers: { Cookie: `tr-cms-session=${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
    const data = await response.json()
    assert.equal(response.status, 200, JSON.stringify(data))
    return data
  }
  assert.equal((await fetch(`${origin}/api/news-simulation/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"end"}' })).status, 401)
  await prisma.newsSimulationScreen.updateMany({ where: { screenNumber: { lte: 12 } }, data: { port: 3001, sourceDocumentId: null } })
  for (const feed of feeds) await prisma.newsSimulationScreen.update({ where: { screenNumber: feed.screenNumber }, data: { url: `${origin}/screen${feed.screenNumber}` } })
  const start = { action: 'start', targetScreenIds: ids }
  assert.equal((await request('/api/news-simulation/session', start)).active, true)
  assert.equal((await request('/api/news-simulation/session', start)).active, true)
  assert.equal((await request('/api/news-simulation/session')).active, true)
  for (let index = 0; index < 4; index++) {
    const screen = screens.find(item => item.id === ids[index])!
    const snapshot = await request(`/api/screens/${screen.code}/controls`)
    assert.deepEqual(snapshot.assets.map((asset: { id: string }) => asset.id), [1, 2, 3].map(number => `simulation-${index * 3 + number}`))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  // Stand in for the independent simulation service; CMS must open these exact URLs.
  await context.route(/\/screen(?:[1-9]|1[0-2])$/, route => {
    const number = new URL(route.request().url()).pathname.slice(7)
    return route.fulfill({ contentType: 'text/html', body: `<html><body style="background:#18233a;color:white"><h1>External simulation ${number}</h1></body></html>` })
  })
  await context.addCookies([{ name: 'tr-cms-session', value: token, url: origin }])
  const page = await context.newPage()
  await page.goto(`${origin}/news-simulation`)
  await page.getByText('Simulation: Active', { exact: true }).waitFor()
  assert.equal(await page.getByRole('columnheader', { name: 'Simulation content', exact: true }).count(), 0)
  assert.equal(await page.getByRole('combobox', { name: /Content for simulation/ }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Start New Simulation' }).isDisabled(), true)
  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/simulation-controls.png', fullPage: true })
  const player = await context.newPage()
  await player.goto(`${origin}/view/screen/${screens.find(item => item.id === ids[0])!.code}?kiosk=1`)
  await player.locator('iframe').nth(2).waitFor({ timeout: 30000 })
  for (let index = 0; index < 3; index++) {
    const heading = player.frameLocator('iframe').nth(index).getByRole('heading', { name: `External simulation ${index + 1}`, exact: true })
    await heading.waitFor({ timeout: 30000 })
  }
  const boxes = await player.locator('iframe').evaluateAll(frames => frames.map(frame => { const box = frame.getBoundingClientRect(); return { y: box.y, height: box.height } }))
  assert.equal(boxes.length, 3)
  assert(boxes[0].y < boxes[1].y && boxes[1].y < boxes[2].y)
  assert(boxes.every(box => Math.abs(box.height - 1000 / 3) < 2))
  await player.screenshot({ path: 'artifacts/simulation-player.png' })
  await player.reload()
  await player.locator('iframe').nth(2).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'End Simulation', exact: true }).click()
  await page.getByText('Simulation: Inactive', { exact: true }).waitFor()
  await player.locator('img').waitFor({ timeout: 30000 })
  assert.equal(await player.locator('iframe').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Start New Simulation', exact: true }).isEnabled(), true)
  // A connected player must switch in both directions without a page reload.
  await page.getByRole('button', { name: 'Start New Simulation', exact: true }).click()
  await page.getByText('Simulation: Active', { exact: true }).waitFor()
  await player.locator('iframe').nth(2).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'End Simulation', exact: true }).click()
  await page.getByText('Simulation: Inactive', { exact: true }).waitFor()
  await player.locator('img').waitFor({ timeout: 30000 })
  assert.equal((await request('/api/news-simulation/session', { action: 'end' })).active, false)
  const restored = await prisma.screen.findMany({ where: { id: { in: ids } }, include: { assets: true } })
  assert.equal(JSON.stringify(restored.map(screen => screen.assets)), originals)
  console.log('PASS: authenticated start/end, repeated clicks, four mappings, persisted state, three vertical feeds, reconnect, live restoration, original assignments preserved')
} finally {
  await browser?.close()
  await prisma.newsSimulationState.update({ where: { id: 'global' }, data: { active: state.active, targetScreenIds: state.targetScreenIds } })
  for (const feed of feeds) await prisma.newsSimulationScreen.update({ where: { screenNumber: feed.screenNumber }, data: { port: feed.port, url: feed.url, sourceDocumentId: feed.sourceDocumentId } })
  await prisma.screen.deleteMany({ where: { id: { in: ids } } })
  await prisma.session.delete({ where: { id: session.id } })
  await prisma.userSession.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
  await prisma.$disconnect()
}
}
main().catch(error => { console.error(error); process.exitCode = 1 })
