// WebSocket-only screen subscription. No retries, polling, disk cache or transport fallback.
const { Centrifuge } = require('centrifuge')
function connectScreen({ serverUrl, screenId, onSnapshot, onConnected, onDisconnected, fetchJson, Client = Centrifuge }) {
  const abort = new AbortController()
  let disposed = false, client, revision = '', initial = true, deleted = false
  const timer = setTimeout(() => fail('Realtime connection timed out. Press Ctrl+R to reconnect.'), 15000)
  function stop() {
    if (disposed) return
    disposed = true; clearTimeout(timer); abort.abort(); client?.disconnect()
  }
  function fail(message) { if (!disposed) { stop(); onDisconnected(message) } }
  function accept(snapshot) {
    if (disposed || deleted || snapshot.revision <= revision) return
    revision = snapshot.revision
    const assets = snapshot.assets.map(asset => {
      const url = new URL(asset.document.s3Url, serverUrl)
      if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)) url.hostname = new URL(serverUrl).hostname
      return { ...asset, document: { ...asset.document, s3Url: url.href } }
    })
    onSnapshot({ ...snapshot, assets })
  }
  async function setup() {
    try {
      const info = await fetchJson(`${serverUrl}/api/screens/${encodeURIComponent(screenId)}/realtime`, abort.signal)
      if (disposed) return
      if (!info.url || !info.token || !info.subscriptionToken) throw new Error(info.error || 'Centrifugo is unavailable')
      const url = new URL(info.url)
      if (!/^wss?:$/.test(url.protocol)) throw new Error('Centrifugo requires a WebSocket URL')
      if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname)) url.hostname = new URL(serverUrl).hostname
      client = new Client(url.href, { token: info.token })
      client.on('connecting', ctx => { if (ctx.code !== 0) fail('Realtime disconnected. Press Ctrl+R to reconnect.') })
      client.on('disconnected', () => fail('Realtime disconnected. Press Ctrl+R to reconnect.'))
      client.on('error', () => fail('Realtime connection failed. Press Ctrl+R to reconnect.'))
      const sub = client.newSubscription(info.channel, { token: info.subscriptionToken })
      sub.on('error', () => fail('Screen subscription failed. Press Ctrl+R to reconnect.'))
      sub.on('unsubscribed', () => fail('Screen subscription ended. Press Ctrl+R to reconnect.'))
      sub.on('subscribing', ctx => { if (ctx.code !== 0) fail('Screen subscription interrupted. Press Ctrl+R to reconnect.') })
      sub.on('publication', ctx => {
        const event = ctx.data
        if (event.type === 'screen.deleted') { deleted = true; fail('This screen was deleted. Press Ctrl+R to choose another.'); return }
        if (event.snapshot && ['media.updated', 'controls.updated'].includes(event.type)) accept(event.snapshot)
      })
      sub.on('subscribed', async () => {
        if (disposed || !initial) return
        initial = false
        try {
          const snapshot = await fetchJson(`${serverUrl}/api/screens/${encodeURIComponent(screenId)}/controls`, abort.signal)
          if (disposed) return
          accept(snapshot); clearTimeout(timer); onConnected?.()
        } catch (error) { if (!disposed) fail(error.message) }
      })
      sub.subscribe(); client.connect()
    } catch (error) { if (!disposed) fail(error.message) }
  }
  void setup()
  return stop
}
module.exports = { connectScreen }
