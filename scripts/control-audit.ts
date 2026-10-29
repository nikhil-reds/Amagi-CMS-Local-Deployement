import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { randomBytes, scryptSync } from 'node:crypto'
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const base = process.env.CONTROL_TEST_URL || 'http://localhost:3001'
const file = 'test-results/control-fixture.json'
async function cleanup(fixture: { screenIds: string[]; sessionId: string; userId: string }) {
  await db.screen.deleteMany({ where: { id: { in: fixture.screenIds } } })
  await db.session.deleteMany({ where: { id: fixture.sessionId } })
  await db.user.deleteMany({ where: { id: fixture.userId } })
}
async function main() {
  if (process.argv.includes('--cleanup')) { if (existsSync(file)) { await cleanup(JSON.parse(readFileSync(file, 'utf8'))); unlinkSync(file) }; console.log('Control audit fixtures removed'); return }
  const seed = readFileSync('prisma/seed.ts', 'utf8')
  const email = process.env.SEED_USER_EMAIL || seed.match(/SEED_USER_EMAIL \?\? "([^"]+)"/)![1]
  const password = process.env.SEED_USER_PASSWORD || seed.match(/SEED_USER_PASSWORD \?\? "([^"]+)"/)![1]
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  assert.equal(login.status, 200, 'Configured local account must sign in normally')
  const cookie = login.headers.get('set-cookie')!.split(';')[0]
  const session = await db.session.create({ data: { status: 'COMPLETED' } })
  const sample = await db.document.findMany({ where: { OR: [{ mimeType: 'application/pdf' }, { mimeType: { startsWith: 'video/' } }] } })
  const pdf = sample.find(x => x.mimeType === 'application/pdf')!, video = sample.find(x => x.mimeType.startsWith('video/'))!
  assert.ok(pdf && video, 'Real PDF and video fixtures available')
  const image = await db.document.create({ data: { sessionId: session.id, name: 'Control audit image.svg', mimeType: 'image/svg+xml', size: 1, status: 'UPLOADED', s3Url: `${base}/amagi-logo-white.svg` } })
  const website = await db.document.create({ data: { sessionId: session.id, name: 'Control audit website', mimeType: 'text/html', sourceType: 'WEBSITE', websiteUrl: `${base}/file.svg`, size: 0, status: 'UPLOADED' } })
  const codes = ['98991','98992']
  // Never replace a preexisting screen.
  for (const code of codes) assert.equal(await db.screen.count({ where: { code } }), 0, `Test screen ${code} must be unused`)
  const screens = await Promise.all(codes.map((code, i) => db.screen.create({ data: { code, name: `Control audit ${i + 1}` } })))
  const assets = []
  for (const [i, doc] of [pdf, video, image].entries()) assets.push(await db.screenAsset.create({ data: { screenId: screens[0].id, documentId: doc.id, position: i } }))
  const webAsset = await db.screenAsset.create({ data: { screenId: screens[1].id, documentId: website.id } })
  const testPassword = randomBytes(24).toString('hex'), salt = randomBytes(16)
  const user = await db.user.create({ data: { name: 'Control audit viewer', email: `control-audit-${Date.now()}@example.invalid`, role: 'VIEWER', passwordHash: `scrypt$${salt.toString('hex')}$${scryptSync(testPassword, salt, 64).toString('hex')}` } })
  mkdirSync('test-results', { recursive: true })
  writeFileSync(file, JSON.stringify({ screenIds: screens.map(x => x.id), sessionId: session.id, userId: user.id, assets: [...assets, webAsset].map(x => x.id), codes }))
  let passed = 0
  const pdfStream = await fetch(`${base}/api/screens/${codes[0]}/pdf/${assets[0].id}`, { headers: { Range: 'bytes=0-31' } })
  assert.ok([200,206].includes(pdfStream.status)); assert.equal(pdfStream.headers.get('content-type'), 'application/pdf'); assert.ok((await pdfStream.text()).startsWith('%PDF')); passed++
  assert.equal((await fetch(`${base}/api/screens/${codes[1]}/pdf/${assets[0].id}`)).status, 404); passed++
  async function patch(code: string, id: string, value: unknown, expected = 200, auth = cookie) {
    const response = await fetch(`${base}/api/screens/${code}/controls`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: auth } : {}) }, body: JSON.stringify({ assetId: id, patch: value }) })
    const data = await response.json(); assert.equal(response.status, expected, JSON.stringify(data)); passed++; return data
  }
  const pdfSettings = { page: 2, zoom: 125, scale: 'page', rotation: 90, toolbar: false, thumbnails: false }
  await patch(codes[0], assets[0].id, pdfSettings)
  const videoSettings = { paused: true, position: 5, volume: 35, rate: 1.5, loop: false, autoplay: true, fit: 'cover' }
  await patch(codes[0], assets[1].id, videoSettings)
  await patch(codes[0], assets[2].id, { rotation: 270, fit: 'contain', background: 'white' })
  await patch(codes[1], webAsset.id, { url: `${base}/globe.svg`, zoom: 125, refresh: 30, reload: Date.now() })
  const read = await fetch(`${base}/api/screens/${codes[0]}/controls`).then(r => r.json())
  assert.equal(read.assets.length, 3)
  for (const [key,value] of Object.entries(pdfSettings)) assert.equal(read.assets[0].controls[key], value)
  for (const [key,value] of Object.entries(videoSettings)) assert.equal(read.assets[1].controls[key], value)
  const byId = await fetch(`${base}/api/screens/${screens[0].id}/controls`).then(r => r.json()); assert.deepEqual(read, byId); passed++
  await patch(codes[0], assets[0].id, { page: 0 }, 400)
  await patch(codes[0], assets[0].id, { page: 1.5 }, 400)
  await patch(codes[0], assets[0].id, { unexpected: true }, 400)
  await patch(codes[0], assets[1].id, { volume: 101 }, 400)
  await patch(codes[0], assets[1].id, { paused: 'true' }, 400)
  await patch(codes[0], assets[1].id, { page: 3 }, 400)
  await patch(codes[1], webAsset.id, { url: 'javascript:alert(1)' }, 400)
  await patch(codes[1], webAsset.id, { url: 'https://user:secret@example.com' }, 400)
  await patch(codes[1], webAsset.id, { refresh: -1 }, 400)
  await patch(codes[0], webAsset.id, { zoom: 100 }, 404)
  await patch('00000', assets[0].id, { page: 2 }, 404)
  await patch(codes[0], assets[0].id, {}, 400)
  await patch(codes[0], assets[0].id, { page: 2 }, 401, '')
  await patch(codes[0], assets[0].id, { page: 2 }, 401, 'tr-cms-session=control-audit-invalid')
  const viewerLogin = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: testPassword }) })
  assert.equal(viewerLogin.status, 200)
  await patch(codes[0], assets[0].id, { page: 3 }, 403, viewerLogin.headers.get('set-cookie')!.split(';')[0])
  await Promise.all([patch(codes[0], assets[0].id, { page: 3 }), patch(codes[0], assets[0].id, { zoom: 150 })])
  const concurrent = await fetch(`${base}/api/screens/${codes[0]}/controls`).then(r => r.json()); assert.equal(concurrent.assets[0].controls.page,3); assert.equal(concurrent.assets[0].controls.zoom,150); passed++
  // Leave a predictable fixture for UI verification; the separate cleanup mode removes only these test records.
  await patch(codes[0], assets[0].id, { page: 1, zoom: 100, scale: 'width', rotation: 0 })
  await patch(codes[0], assets[1].id, { paused: true, position: 5, volume: 70, rate: 1, loop: true, fit: 'contain' })
  writeFileSync('test-results/control-api-summary.md', `Control API audit: ${passed} checks passed.\n\nCovers persistence for all four media types, screen code/internal ID parity, concurrent partial updates, validation, cross-screen isolation, and 401/403 authorization. Test fixtures are removed after UI checks.\n`)
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } })
  if (!process.argv.includes('--keep-fixtures')) { await cleanup(JSON.parse(readFileSync(file, 'utf8'))); unlinkSync(file) }
  console.log(`PASS: ${passed} controls API checks. ${process.argv.includes('--keep-fixtures') ? 'UI fixtures ready.' : 'Disposable fixtures removed.'}`)
}
main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
