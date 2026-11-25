const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { test } = require('node:test')
const path = require('node:path')
const { connectScreen: windows } = require('../../desktop/screen-connection.cjs')
function android() {
  const context = { window: { Centrifuge: null }, URL, AbortController, setTimeout, clearTimeout }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/src/main/assets/screen-connection.js'), 'utf8'), context)
  return context.window.connectScreen
}
class Subscription extends EventEmitter { subscribe() {} }
class Client extends EventEmitter {
  static latest
  constructor(url) { super(); this.url = url; this.sub = new Subscription(); Client.latest = this }
  newSubscription() { return this.sub }
  connect() { this.emit('connecting', { code: 0 }); this.sub.emit('subscribed') }
  disconnect() { this.stopped = true; this.emit('disconnected') }
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve() }
for (const [name, connect] of [['Windows', windows], ['Android', android()]]) {
  test(`${name}: same snapshots, simulation URLs, revision ordering and manual reconnect`, async () => {
    const updates = [], errors = [], requests = []
    const snapshot = revision => ({ revision, assets: [ { id: 'simulation-1', document: { s3Url: '/api/media/feed', websiteUrl: 'http://localhost:3007/screen1' } } ] })
    const stop = connect({ serverUrl: 'http://192.168.1.10:3000', screenId: '01234', Client,
      fetchJson: async url => { requests.push(url); return url.endsWith('/realtime') ? { url: 'ws://localhost:8000/connection/websocket', token: 'a', subscriptionToken: 'b', channel: 'screen' } : snapshot('001') },
      onSnapshot: value => updates.push(value), onDisconnected: value => errors.push(value)
    })
    try {
      await flush()
      assert.equal(requests.length, 2)
      assert.equal(Client.latest.url, 'ws://192.168.1.10:8000/connection/websocket')
      assert.equal(updates[0].assets[0].document.websiteUrl, 'http://192.168.1.10:3007/screen1')
      Client.latest.sub.emit('publication', { data: { type: 'controls.updated', snapshot: snapshot('003') } })
      Client.latest.sub.emit('publication', { data: { type: 'media.updated', snapshot: snapshot('002') } })
      assert.equal(updates.length, 2)
      Client.latest.sub.emit('publication', { data: { type: 'screen.deleted' } })
      assert.equal(Client.latest.stopped, true)
      assert.equal(errors.length, 1)
      Client.latest.sub.emit('publication', { data: { type: 'media.updated', snapshot: snapshot('004') } })
      assert.equal(updates.length, 2)
      assert.equal(requests.length, 2)
    } finally { stop() }
  })
}
test('Android packages identical renderer and compatible PDF runtime', () => {
  const assets = path.join(__dirname, '../app/src/main/assets')
  assert.equal(fs.readFileSync(path.join(assets, 'media-runtime.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../../public/media-runtime.js'), 'utf8'))
  assert.equal(fs.readFileSync(path.join(assets, 'pdfjs/pdf.mjs'), 'utf8'), fs.readFileSync(path.join(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.mjs'), 'utf8'))
  assert.ok(fs.existsSync(path.join(assets, 'pdfjs/pdf.worker.mjs')))
  const player = fs.readFileSync(path.join(assets, 'player.html'), 'utf8')
  assert.ok(player.includes('window.MediaRuntime.mount(panel, item, { kiosk: true })'))
})
