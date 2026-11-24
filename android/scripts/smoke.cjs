const { chromium } = require('@playwright/test')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const assets = path.join(__dirname, '../app/src/main/assets')
;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
    // A real minimal PDF exercises PDF.js and its worker, not just iframe mounting.
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << >> >>', '<< /Length 0 >>\nstream\n\nendstream']
    let pdf = '%PDF-1.4\n', offsets = [0]
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
    const xref = Buffer.byteLength(pdf)
    pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(value => String(value).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
    await page.route('https://appassets.androidplatform.net/player-media?**', async route => {
      const url = new URL(route.request().url()).searchParams.get('url')
      if (url.includes('/pdf/')) return route.fulfill({ contentType: 'application/pdf', body: Buffer.from(pdf) })
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=', 'base64') })
    })
    await page.route('https://appassets.androidplatform.net/assets/**', async route => {
      const name = new URL(route.request().url()).pathname.slice('/assets/'.length)
      if (name === 'centrifuge.js') return route.fulfill({ contentType: 'text/javascript', body: `window.Centrifuge = class {
        constructor() { this.events = {}; window.testClient = this }
        on(name, callback) { this.events[name] = callback }
        newSubscription() { const sub = { events: {}, on(name, callback) { this.events[name] = callback }, subscribe() {} }; this.sub = sub; return sub }
        connect() { this.events.connecting({code:0}); this.sub.events.subscribed() }
        disconnect() {}
      }` })
      const file = path.join(assets, name)
      await route.fulfill({ path: file, contentType: name.endsWith('.html') ? 'text/html' : name.endsWith('.js') || name.endsWith('.mjs') ? 'text/javascript' : undefined })
    })
    await page.addInitScript(() => {
      if (window.top !== window.self) return
      window.testConfig = {}
      window.testRequests = []
      window.AndroidPlayer = { postMessage(raw) {
        const request = JSON.parse(raw)
        let result
        if (request.action === 'config') result = window.testConfig
        if (request.action === 'save') { window.testConfig = { serverUrl: request.serverUrl, screenId: request.screenId }; result = true }
        if (request.action === 'fetch') {
          window.testRequests.push(request.url)
          result = request.url.endsWith('/realtime') ? { url: 'ws://localhost:8000/connection/websocket', token: 'token', subscriptionToken: 'sub', channel: 'screen' } : request.url.endsWith('/controls') ? { revision: '001', assets: [] } : { code: '01234' }
        }
        queueMicrotask(() => this.onmessage({ data: JSON.stringify({ id: request.id, result }) }))
      } }
    })
    await page.goto('https://appassets.androidplatform.net/assets/index.html')
    await page.locator('#settings[open]').waitFor()
    await page.locator('#server').fill('192.168.1.10:3000/view/screen')
    await page.locator('#screen').fill('01234')
    await page.locator('#connect').click()
    await page.frameLocator('#stage').getByText('No media assigned to this screen.').waitFor()
    assert.deepEqual(await page.evaluate(() => window.testConfig), { serverUrl: 'http://192.168.1.10:3000', screenId: '01234' })
    assert.equal(await page.evaluate(() => window.testRequests.length), 3)
    const feed = number => ({ id: `simulation-${number}`, kind: 'website', controls: {}, document: { name: `Feed ${number}`, s3Url: '/unused', websiteUrl: `http://localhost:3007/screen${number}` } })
    await page.evaluate(snapshot => window.testClient.sub.events.publication({ data: { type: 'media.updated', snapshot } }), { revision: '002', assets: [feed(1), feed(2), feed(3)] })
    await page.frameLocator('#stage').locator('.panel').nth(2).waitFor()
    assert.equal(await page.frameLocator('#stage').locator('.panel').count(), 3)
    assert.equal(await page.frameLocator('#stage').locator('.panel iframe').first().getAttribute('src'), 'http://192.168.1.10:3007/screen1')
    await page.evaluate(() => window.testClient.sub.events.publication({ data: { type: 'controls.updated', snapshot: { revision: '003', assets: [] } } }))
    await page.frameLocator('#stage').getByText('No media assigned to this screen.').waitFor()
    await page.evaluate(() => window.testClient.sub.events.publication({ data: { type: 'media.updated', snapshot: { revision: '004', assets: [{ id: 'pdf', kind: 'pdf', controls: {}, document: { name: 'Test PDF', s3Url: 'http://192.168.1.10:3000/api/screens/01234/pdf/test', mimeType: 'application/pdf' } }] } } }))
    await page.frameLocator('#stage').locator('canvas').waitFor({ timeout: 20000 })
    assert.equal(await page.frameLocator('#stage').locator('canvas').evaluate(canvas => canvas.width > 0 && canvas.height > 0), true)
    await page.evaluate(() => window.testClient.sub.events.publication({ data: { type: 'media.updated', snapshot: { revision: '005', assets: [{ id: 'image', kind: 'image', controls: {}, document: { name: 'Test image', s3Url: 'http://192.168.1.10:3000/api/media/image', mimeType: 'image/png' } }] } } }))
    await page.frameLocator('#stage').locator('.panel img').waitFor()
    await page.waitForFunction(() => document.querySelector('#stage').contentDocument.querySelector('.panel img')?.naturalWidth > 0)
    await page.locator('#menu-button').click()
    await page.locator('#actions[open]').waitFor()
    await page.locator('#resume').click()
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.evaluate(() => window.testClient.events.disconnected())
    await page.getByText(/Realtime disconnected/).waitFor()
    console.log('Android host smoke passed: setup, persisted ID, shared renderer, three simulation feeds, restoration, real PDF canvas, image decode, touch menu, mobile sizing and disconnection')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
