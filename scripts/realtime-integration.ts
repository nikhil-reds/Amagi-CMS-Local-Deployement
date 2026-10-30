import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { prisma } from '../lib/prisma'
import { connectScreen, type ScreenSnapshot } from '../lib/screen-realtime'
const require = createRequire(import.meta.url)
const { connectScreen: connectDesktop } = require('../desktop/screen-connection.cjs')
const origin = process.env.REALTIME_TEST_ORIGIN || 'http://localhost:3001'
const rawFetch = globalThis.fetch
const token = randomBytes(32).toString('base64url')
const cookie = `tr-cms-session=${token}`
const docIds: string[] = [], sessionIds: string[] = []
let userId = '', screenId = '', screenCode = ''
let stopBrowser: (() => void) | undefined, stopDesktop: (() => void) | undefined
let browserReads = 0, desktopReads = 0
async function api(path: string, method = 'GET', body?: object, controlToken?: string) {
  const response = await rawFetch(`${origin}${path}`, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json', ...(controlToken ? { 'x-control-session': controlToken } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: response.status, body: await response.json() }
}
async function until(condition: () => boolean, label: string) {
  const end = Date.now() + 12000
  while (!condition()) { if (Date.now() > end) throw new Error(`Timed out: ${label}`); await new Promise(resolve => setTimeout(resolve, 25)) }
}
async function main() {
 try {
  const user = await prisma.user.create({ data: { email: `realtime-test-${randomBytes(6).toString('hex')}@example.invalid`, name: 'Realtime integration test', passwordHash: 'test-only-no-login', role: 'ADMIN' } })
  userId = user.id
  await prisma.userSession.create({ data: { userId, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } })
  const created = await api('/api/screens', 'POST', {})
  assert.equal(created.status, 201); screenId = created.body.id; screenCode = created.body.code
  const doc = await api('/api/documents', 'POST', { url: 'https://example.com/realtime-validation.png', name: 'Realtime validation image' })
  assert.equal(doc.status, 201); docIds.push(doc.body.id); sessionIds.push(doc.body.sessionId)
  const connected = await api(`/api/screens/${screenCode}/realtime`, 'POST')
  assert.equal(connected.status, 200)
  assert.ok(connected.body.expiresAt - Date.now() > 290000 && connected.body.expiresAt - Date.now() <= 300000)
  const controllerToken = connected.body.sessionToken
  let browser: ScreenSnapshot | null = null, desktop: ScreenSnapshot | null = null
  let browserReady = false, desktopReady = false
  let browserFailure = '', desktopFailure = ''
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin, hostname: new URL(origin).hostname } } })
  globalThis.fetch = ((url: string, init: RequestInit) => { browserReads++; return rawFetch(new URL(url, origin), init) }) as typeof fetch
  stopBrowser = connectScreen(screenCode, { onSnapshot: value => { browser = value }, onConnected: () => { browserReady = true }, onDisconnected: reason => { browserFailure = reason } })
  stopDesktop = connectDesktop({ serverUrl: origin, screenId: screenCode, fetchJson: async (url: string, signal: AbortSignal) => { desktopReads++; const response = await rawFetch(url, { signal }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() }, onSnapshot: (value: ScreenSnapshot) => { desktop = value }, onConnected: () => { desktopReady = true }, onDisconnected: (reason: string) => { desktopFailure = reason } })
  await until(() => browserReady && desktopReady || !!browserFailure || !!desktopFailure, 'player subscriptions')
  assert.equal(browserFailure, ''); assert.equal(desktopFailure, '')
  const renamed = await api(`/api/screens/${screenCode}`, 'PATCH', { name: 'Realtime renamed screen' })
  assert.equal(renamed.status, 200); assert.equal(renamed.body.realtime.delivered, true)
  await until(() => browser?.name === 'Realtime renamed screen' && desktop?.name === 'Realtime renamed screen', 'screen metadata push')
  console.log('PASS: screen metadata pushed to both players')
  const assigned = await api(`/api/screens/${screenCode}/assets`, 'POST', { documentId: doc.body.id })
  assert.equal(assigned.status, 201); assert.equal(assigned.body.realtime.delivered, true)
  await until(() => browser?.assets.length === 1 && desktop?.assets.length === 1, 'media push reaches both players')
  console.log('PASS: media assignment pushed to browser and desktop')
  const denied = await api(`/api/screens/${screenCode}/controls`, 'PATCH', { assetId: assigned.body.id, patch: { zoom: 125 } })
  assert.equal(denied.status, 403)
  const changed = await api(`/api/screens/${screenCode}/controls`, 'PATCH', { assetId: assigned.body.id, patch: { zoom: 125 } }, controllerToken)
  assert.equal(changed.status, 200); assert.equal(changed.body.realtime.delivered, true)
  await until(() => browser?.assets[0]?.controls.zoom === 125 && desktop?.assets[0]?.controls.zoom === 125, 'control push reaches both players')
  console.log('PASS: control push reaches both players; disconnected controller rejected')
  const reads = [browserReads, desktopReads]
  await new Promise(resolve => setTimeout(resolve, 5500))
  assert.deepEqual([browserReads, desktopReads], reads)
  assert.deepEqual(reads, [2, 2])
  console.log('PASS: zero recurring HTTP reads while idle (two bootstrap reads per player)')
  for (const fixture of [
    { name: 'PDF', mime: 'application/pdf', patch: { page: 2, zoom: 125, rotation: 90, toolbar: true, thumbnails: true } },
    { name: 'Video', mime: 'video/mp4', patch: { paused: true, volume: 35, rate: 1.5, fit: 'cover', position: 12, loop: false, autoplay: false } },
    { name: 'Image', mime: 'image/png', patch: { rotation: 180, fit: 'cover', background: 'white' } },
    { name: 'Audio', mime: 'audio/mpeg', patch: { paused: true, volume: 40, rate: 1.5, position: 10, loop: false } },
  ]) {
    const fixtureDoc = await prisma.document.create({ data: { sessionId: doc.body.sessionId, name: fixture.name, mimeType: fixture.mime, size: 1, status: 'UPLOADED', s3Url: 'https://example.com/test-media' } })
    docIds.push(fixtureDoc.id)
    const assignedFixture = await api(`/api/screens/${screenCode}/assets`, 'POST', { documentId: fixtureDoc.id })
    assert.equal(assignedFixture.status, 201)
    const updated = await api(`/api/screens/${screenCode}/controls`, 'PATCH', { assetId: assignedFixture.body.id, patch: fixture.patch }, controllerToken)
    assert.equal(updated.status, 200); assert.equal(updated.body.realtime.delivered, true)
    await until(() => [browser, desktop].every(snapshot => {
      const asset = snapshot?.assets.find(asset => asset.id === assignedFixture.body.id)
      return !!asset && Object.entries(fixture.patch).every(([key, value]) => asset.controls[key as keyof typeof asset.controls] === value)
    }), `${fixture.name} control push`)
    const unassigned = await api(`/api/screens/${screenCode}/assets/${assignedFixture.body.id}`, 'DELETE')
    assert.equal(unassigned.status, 200); assert.equal(unassigned.body.realtime.delivered, true)
    await until(() => [browser, desktop].every(snapshot => !snapshot?.assets.some(asset => asset.id === assignedFixture.body.id)), `${fixture.name} removal push`)
    console.log(`PASS: ${fixture.name} controls and assignment removal pushed to both players`)
  }
  const removed = await api(`/api/documents/${doc.body.id}`, 'DELETE')
  assert.equal(removed.status, 200); assert.equal(removed.body.realtime.delivered, true)
  await until(() => browser?.assets.length === 0 && desktop?.assets.length === 0, 'cascade deletion push')
  console.log('PASS: document deletion updates both players')
  const deleted = await api(`/api/screens/${screenCode}`, 'DELETE')
  assert.equal(deleted.status, 200); assert.equal(deleted.body.realtime.delivered, true)
  await until(() => !!browserFailure && !!desktopFailure, 'screen deletion disconnects players')
  console.log('PASS: screen deletion disconnects both players')
 } finally {
  stopBrowser?.(); stopDesktop?.(); globalThis.fetch = rawFetch; Reflect.deleteProperty(globalThis, 'window')
  if (screenId) await prisma.screen.deleteMany({ where: { id: screenId } })
  if (docIds.length) await prisma.document.deleteMany({ where: { id: { in: docIds } } })
  if (sessionIds.length) await prisma.session.deleteMany({ where: { id: { in: sessionIds } } })
  if (userId) await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
 }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
