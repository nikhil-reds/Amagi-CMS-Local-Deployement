import { Centrifuge } from 'centrifuge'
import type { ControlledAsset } from '@/components/ControlledMedia'

export type ScreenSnapshot = { id: string; code: string; name: string; revision: string; assets: ControlledAsset[] }
export type ScreenEvent = { type: 'media.updated' | 'controls.updated' | 'screen.deleted'; snapshot: ScreenSnapshot | null }
export type ConnectionInfo = { url: string; token: string; subscriptionToken: string; channel: string; expiresAt: number | null; sessionToken: string | null }

export function resolveSnapshot(snapshot: ScreenSnapshot, origin: string): ScreenSnapshot {
  return { ...snapshot, assets: snapshot.assets.map(asset => {
    const url = new URL(asset.document.s3Url, origin)
    if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)) url.hostname = new URL(origin).hostname
    return { ...asset, document: { ...asset.document, s3Url: url.href } }
  }) }
}

// One credential request, one snapshot after subscription, then publications only.
// Any transport/subscription failure closes the SDK, preventing automatic retry loops.
export function connectScreen(screenId: string, options: {
  controls?: boolean
  onSnapshot: (snapshot: ScreenSnapshot) => void
  onConnected: (info: ConnectionInfo) => void
  onDisconnected: (reason: string) => void
  onDeleted?: () => void
}, Client = Centrifuge) {
  const abort = new AbortController()
  let client: Centrifuge | undefined
  let disposed = false
  let revision = ''
  let deleted = false
  let initial = true
  const timer = setTimeout(() => fail('Connection timed out. Click Connect to try again.'), 15000)
  function dispose() {
    if (disposed) return
    disposed = true
    clearTimeout(timer)
    abort.abort()
    client?.disconnect()
  }
  function fail(message: string) {
    if (disposed) return
    dispose()
    options.onDisconnected(message)
  }
  function accept(snapshot: ScreenSnapshot) {
    if (disposed || deleted || snapshot.revision <= revision) return
    revision = snapshot.revision
    options.onSnapshot(resolveSnapshot(snapshot, window.location.origin))
  }
  async function setup() {
    try {
      const response = await fetch(`/api/screens/${encodeURIComponent(screenId)}/realtime`, { method: options.controls ? 'POST' : 'GET', cache: 'no-store', signal: abort.signal })
      const info: ConnectionInfo & { error?: string } = await response.json()
      if (!response.ok || !info.url || !info.token || !info.subscriptionToken) throw new Error(info.error || 'Centrifugo is unavailable')
      if (disposed) return
      if (!/^wss?:\/\//.test(info.url)) throw new Error('Centrifugo requires a WebSocket URL')
      const url = new URL(info.url)
      if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)) url.hostname = window.location.hostname
      client = new Client(url.href, { token: info.token })
      client.on('connecting', context => { if (context.code !== 0) fail('Realtime disconnected. Click Connect to reconnect.') })
      client.on('disconnected', () => fail('Realtime disconnected. Click Connect to reconnect.'))
      client.on('error', () => fail('Realtime connection failed. Click Connect to reconnect.'))
      const sub = client.newSubscription(info.channel, { token: info.subscriptionToken })
      sub.on('error', () => fail('Screen subscription failed. Click Connect to reconnect.'))
      sub.on('unsubscribed', () => fail('Screen subscription ended. Click Connect to reconnect.'))
      sub.on('subscribing', context => { if (context.code !== 0) fail('Screen subscription interrupted. Click Connect to reconnect.') })
      sub.on('publication', context => {
        const event = context.data as ScreenEvent
        if (event.type === 'screen.deleted') { deleted = true; options.onDeleted?.(); fail('This screen was deleted.'); return }
        if (event.snapshot && ['media.updated', 'controls.updated'].includes(event.type)) accept(event.snapshot)
      })
      sub.on('subscribed', async () => {
        if (!initial || disposed) return
        initial = false
        try {
          const result = await fetch(`/api/screens/${encodeURIComponent(screenId)}/controls`, { cache: 'no-store', signal: abort.signal })
          const snapshot = await result.json()
          if (!result.ok) throw new Error(snapshot.error || 'Unable to load screen')
          if (disposed) return
          accept(snapshot)
          clearTimeout(timer)
          options.onConnected(info)
        } catch (error) { if (!disposed) fail(error instanceof Error ? error.message : 'Unable to load screen') }
      })
      sub.subscribe()
      client.connect()
    } catch (error) { if (!disposed) fail(error instanceof Error ? error.message : 'Realtime unavailable') }
  }
  void setup()
  return dispose
}
