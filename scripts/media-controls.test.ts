import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { controlsWithDefaults, validateControlPatch, mediaPosition } from '../lib/media-controls'

function renderer(kind: string, controls: Record<string, unknown> = {}, preview = false) {
  const timers: (() => void)[] = []
  class Element {
    tag: string; style: Record<string, unknown> = {}; children: Element[] = []; listeners: Record<string, () => void> = {}
    clientWidth = 1200; clientHeight = 300; paused = true; ended = false; duration = 120; readyState = 1; currentTime = 0; playCalls = 0; volume = 1; muted = false
    constructor(tag: string) { this.tag = tag }
    append(...nodes: Element[]) { this.children.push(...nodes) }
    replaceChildren(...nodes: Element[]) { this.children = nodes }
    addEventListener(name: string, callback: () => void) { this.listeners[name] = callback }
    removeEventListener(name: string) { delete this.listeners[name] }
    removeAttribute() {}; load() {}
    play() { this.playCalls++; this.paused = false; return Promise.resolve() }
    pause() { this.paused = true }
  }
  const context: Record<string, any> = { URL, location: { href: 'http://localhost:3001/' }, document: { currentScript: { src: 'http://localhost:3001/media-runtime.js' }, createElement: (tag: string) => new Element(tag) }, Date: { now: () => 100000 }, setInterval: (fn: () => void) => { timers.push(fn); return timers.length }, clearInterval: () => {} }
  context.window = context
  runInNewContext(readFileSync('public/media-runtime.js', 'utf8'), context)
  const host = new Element('section')
  const stage = context.MediaRuntime.mount(host, { kind, src: 'https://media.example/item', controls }, { kiosk: true, preview })
  return { stage, host, media: host.children[0] as any, timers }
}
test('validation rejects wrong media fields, invalid protocols, types and bounds', () => {
  for (const value of [{ page: 0 }, { page: 1.5 }, { zoom: 301 }, { toolbar: 'false' }, { rotation: 91 }, { volume: 50 }]) assert.throws(() => validateControlPatch('pdf', value))
  for (const url of ['javascript:alert(1)', 'file:///secret', 'data:text/html,test', 'https://user:pass@example.com']) assert.throws(() => validateControlPatch('website', { url }))
  assert.deepEqual(validateControlPatch('website', { url: 'https://example.com' }), { url: 'https://example.com' })
})
test('media clock respects pause, autoplay and playback speed', () => {
  const state = { ...controlsWithDefaults({}), position: 10, positionAt: 1000, rate: 2 }
  assert.equal(mediaPosition(state, 4000), 16)
  assert.equal(mediaPosition({ ...state, paused: true }, 4000), 10)
  assert.equal(mediaPosition({ ...state, autoplay: false }, 4000), 10)
})
test('volume/rate/fit updates preserve active media and current playback position', () => {
  const { stage, media } = renderer('video', { paused: true, position: 10 })
  assert.equal(media.currentTime, 10)
  media.currentTime = 37
  stage.update({ paused: true, position: 10, volume: 25, rate: 1.5, fit: 'cover' })
  assert.equal(stage.element, media)
  assert.equal(media.currentTime, 37)
  assert.equal(media.volume, 0.25)
  assert.equal(media.playbackRate, 1.5)
  assert.equal(media.style.objectFit, 'cover')
})
test('play, pause and seek commands update the player', () => {
  const { stage, media } = renderer('video', { paused: true, position: 10 })
  stage.update({ paused: false, position: 20, positionAt: 99000, autoplay: true })
  assert.equal(media.paused, false)
  assert.equal(media.currentTime, 21)
  stage.update({ paused: true, position: 30, positionAt: 100000 })
  assert.equal(media.paused, true)
  assert.equal(media.currentTime, 30)
  stage.destroy(); assert.equal(media.paused, true)
})
test('control previews stay muted and paused even when the remote player is playing', () => {
  const { stage, media } = renderer('video', { paused: false }, true)
  assert.equal(media.muted, true); assert.equal(media.paused, true); assert.equal(media.playCalls, 0)
  stage.update({ paused: false, volume: 100 }); assert.equal(media.playCalls, 0)
})
test('website updates support URL, zoom, timed refresh and reload without media recreation', () => {
  const { stage, media, timers } = renderer('website', { url: 'https://example.com', zoom: 125, refresh: 30 })
  assert.equal(media.src, 'https://example.com'); assert.equal(media.style.transform, 'scale(1.25)'); assert.equal(media.style.width, '80%'); assert.equal(timers.length, 1)
  stage.update({ url: 'https://example.org', zoom: 150, refresh: 60, reload: 1 })
  assert.equal(media.src, 'https://example.org'); assert.equal(media.style.transform, 'scale(1.5)'); assert.equal(timers.length, 2)
})
test('90-degree image rotation swaps dimensions to preserve fit inside the panel', () => {
  const { stage, media, host } = renderer('image', { rotation: 90, background: 'white', fit: 'contain' })
  assert.equal(media.style.width, '300px'); assert.equal(media.style.height, '1200px')
  assert.equal(media.style.transform, 'translate(-50%, -50%) rotate(90deg)'); assert.equal(host.style.background, 'white')
  stage.update({ rotation: 180, fit: 'cover', background: 'black' })
  assert.equal(media.style.width, '1200px'); assert.equal(media.style.height, '300px'); assert.equal(media.style.objectFit, 'cover')
})
