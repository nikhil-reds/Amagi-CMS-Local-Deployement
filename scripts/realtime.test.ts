import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test, mock } from 'node:test'
import { connectScreen } from '../lib/screen-realtime'
import { signRealtimeToken, validControlSession, CONTROL_SESSION_MS } from '../lib/realtime-token'
import { createRequire } from 'node:module'
import type { Centrifuge } from 'centrifuge'
const require = createRequire(import.meta.url)
const { connectScreen: desktopConnect } = require('../desktop/screen-connection.cjs')

class Subscription extends EventEmitter { subscribe() {} }
class Client extends EventEmitter {
  static latest: Client
  sub = new Subscription()
  stopped = false
  constructor() { super(); Client.latest = this }
  newSubscription() { return this.sub }
  connect() { this.emit('connecting', { code: 0 }); this.sub.emit('subscribed') }
  disconnect() { this.stopped = true; this.emit('disconnected') }
}
const snapshot = (revision: number, name = 'First') => ({ id: 'screen', code: '12345', name, revision: new Date(revision).toISOString(), assets: [{ id: 'asset', kind: 'image', controls: {}, document: { id: 'doc', name: 'Image', s3Url: '/image.png', mimeType: 'image/png' } }] })
const credentials = { url: 'ws://localhost:8000/connection/websocket', token: 'token', subscriptionToken: 'sub', channel: 'screen-screen' }
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }

for (const target of ['browser', 'desktop']) {
  test(`${target}: publications update state; idle, failures and cleanup never poll`, async () => {
    mock.timers.enable({ apis: ['setTimeout', 'Date'] })
    const requests: string[] = [], updates: unknown[] = [], failures: string[] = []
    const oldFetch = globalThis.fetch
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'http://cms:3001', hostname: 'cms' } } })
    const read = async (url: string) => { requests.push(url); return url.endsWith('/realtime') ? credentials : snapshot(1000) }
    globalThis.fetch = (async (url: string) => ({ ok: true, json: () => read(url) })) as typeof fetch
    const callbacks = { onSnapshot: (value: unknown) => updates.push(value), onConnected() {}, onDisconnected: (reason: string) => failures.push(reason) }
    let stop: () => void = () => {}
    try {
      stop = target === 'browser' ? connectScreen('12345', callbacks, Client as unknown as typeof Centrifuge) : desktopConnect({ serverUrl: 'http://cms:3001', screenId: '12345', ...callbacks, fetchJson: read, Client })
      await flush()
      assert.equal(requests.length, 2, 'only credentials and one initial snapshot')
      const client = Client.latest
      client.sub.emit('publication', { data: { type: 'controls.updated', snapshot: snapshot(2000) } })
      client.sub.emit('publication', { data: { type: 'media.updated', snapshot: snapshot(3000, 'New') } })
      client.sub.emit('publication', { data: { type: 'controls.updated', snapshot: snapshot(2000) } })
      assert.equal(updates.length, 3, 'stale/duplicate revisions ignored')
      mock.timers.tick(10 * 60 * 1000); await flush()
      assert.equal(requests.length, 2, 'ten idle minutes produce no requests')
      client.emit('connecting', { code: 1 })
      assert.equal(client.stopped, true)
      assert.equal(failures.length, 1)
      mock.timers.tick(10 * 60 * 1000); await flush()
      assert.equal(requests.length, 2, 'outage produces no fallback or retry requests')
      client.sub.emit('publication', { data: { type: 'media.updated', snapshot: snapshot(4000) } })
      assert.equal(updates.length, 3, 'closed connection ignores late events')
    } finally {
      stop(); globalThis.fetch = oldFetch
      if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window')
      mock.timers.reset()
    }
  })
  test(`${target}: publication during initial snapshot cannot be overwritten`, async () => {
    const oldFetch = globalThis.fetch
    const oldWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'http://cms:3001', hostname: 'cms' } } })
    let resolveSnapshot!: (value: unknown) => void
    const read = async (url: string) => url.endsWith('/realtime') ? credentials : new Promise(resolve => { resolveSnapshot = resolve })
    globalThis.fetch = (async (url: string) => ({ ok: true, json: () => read(url) })) as typeof fetch
    const updates: unknown[] = []
    const callbacks = { onSnapshot: (value: unknown) => updates.push(value), onConnected() {}, onDisconnected() {} }
    const stop = target === 'browser' ? connectScreen('12345', callbacks, Client as unknown as typeof Centrifuge) : desktopConnect({ serverUrl: 'http://cms:3001', screenId: '12345', ...callbacks, fetchJson: read, Client })
    try {
      await flush()
      Client.latest.sub.emit('publication', { data: { type: 'media.updated', snapshot: snapshot(3000) } })
      resolveSnapshot(snapshot(1000)); await flush()
      assert.equal(updates.length, 1)
      Client.latest.sub.emit('publication', { data: { type: 'screen.deleted', snapshot: null } })
      assert.equal(Client.latest.stopped, true, 'deletion ends connection')
    } finally {
      stop(); globalThis.fetch = oldFetch
      if (oldWindow) Object.defineProperty(globalThis, 'window', oldWindow); else Reflect.deleteProperty(globalThis, 'window')
    }
  })
}
test('five-minute control credential expires and cannot cross users/screens or be tampered with', () => {
  process.env.CENTRIFUGO_TOKEN_SECRET = 'test-only-secret'
  mock.timers.enable({ apis: ['Date'], now: 1000000 })
  try {
    const token = signRealtimeToken({ purpose: 'controls', sub: 'admin', screenId: 'screen', exp: (Date.now() + CONTROL_SESSION_MS) / 1000 })
    assert.equal(validControlSession(token, 'admin', 'screen'), true)
    assert.equal(validControlSession(token, 'other', 'screen'), false)
    assert.equal(validControlSession(token, 'admin', 'other'), false)
    assert.equal(validControlSession(`${token}x`, 'admin', 'screen'), false)
    mock.timers.tick(CONTROL_SESSION_MS - 1)
    assert.equal(validControlSession(token, 'admin', 'screen'), true)
    mock.timers.tick(1)
    assert.equal(validControlSession(token, 'admin', 'screen'), false)
  } finally { mock.timers.reset() }
})

test('publication failure reports saved-but-not-delivered and never queues a retry', async () => {
  const { publishScreenChanged } = await import('../lib/realtime')
  const keys = ['CENTRIFUGO_HTTP_URL', 'CENTRIFUGO_PUBLIC_URL', 'CENTRIFUGO_API_KEY', 'CENTRIFUGO_TOKEN_SECRET']
  const saved = keys.map(key => process.env[key])
  const oldFetch = globalThis.fetch
  let calls = 0
  const errors = mock.method(console, 'error', () => {})
  mock.timers.enable({ apis: ['setTimeout'] })
  try {
    for (const key of keys) process.env[key] = 'test-only'
    globalThis.fetch = async () => { calls++; return Response.json({ error: { code: 100, message: 'unavailable' } }) }
    const result = await publishScreenChanged('test-screen', 'screen.deleted')
    assert.equal(result.delivered, false)
    assert.match(result.error!, /Saved, but live delivery failed/)
    mock.timers.tick(10 * 60 * 1000)
    assert.equal(calls, 1)
  } finally {
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index] })
    globalThis.fetch = oldFetch; errors.mock.restore(); mock.timers.reset()
  }
})
