const byId = id => document.getElementById(id)
const pending = new Map()
let nextId = 0, current = null, stopConnection = null, latestSnapshot = null, generation = 0
function native(action, data = {}, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const id = ++nextId
    const abort = () => { pending.delete(id); reject(new DOMException('Aborted', 'AbortError')) }
    pending.set(id, { resolve, reject, cleanup: () => signal?.removeEventListener('abort', abort) })
    signal?.addEventListener('abort', abort, { once: true })
    window.AndroidPlayer.postMessage(JSON.stringify({ id, action, ...data }))
  })
}
window.AndroidPlayer.onmessage = event => {
  const data = JSON.parse(event.data), task = pending.get(data.id)
  if (!task) return
  pending.delete(data.id); task.cleanup()
  data.error ? task.reject(new Error(data.error)) : task.resolve(data.result)
}
const fetchJson = (url, signal) => native('fetch', { url }, signal)
function normalizeServerUrl(value) {
  let raw = String(value || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`
  try { const url = new URL(raw); if (!['http:', 'https:'].includes(url.protocol)) return ''; return url.origin } catch { return '' }
}
function showMessage(text) { byId('message').textContent = text; byId('message').style.display = 'grid' }
function startRealtime() {
  stopConnection?.(); latestSnapshot = null
  byId('stage').src = 'player.html?kind=layout'
  showMessage('Connecting to screen…')
  stopConnection = window.connectScreen({ ...current, fetchJson,
    onSnapshot(snapshot) {
      // Fetch CMS media through the native same-origin stream. WebView PDF workers
      // otherwise depend on cross-origin/mixed-content support for LAN HTTP.
      latestSnapshot = { ...snapshot, assets: snapshot.assets.map(asset => {
        const url = new URL(asset.document.s3Url, current.serverUrl)
        const isCmsMedia = url.origin === current.serverUrl && (/^\/api\/media\/[^/]+$/.test(url.pathname) || /^\/api\/screens\/[^/]+\/pdf\/[^/]+$/.test(url.pathname))
        return isCmsMedia && asset.kind !== 'website' ? { ...asset, document: { ...asset.document, s3Url: `${location.origin}/player-media?url=${encodeURIComponent(url.href)}` } } : asset
      }) }
      window.dispatchEvent(new CustomEvent('screen:update', { detail: latestSnapshot })); byId('message').style.display = 'none'
    },
    onDisconnected(reason) { latestSnapshot = null; showMessage(reason.replace(/Press Ctrl\+R to /g, 'Use the player menu to ')) },
  })
}
// Same renderer and onScreen contract as Electron, with no bridge in remote frames.
byId('stage').addEventListener('load', () => {
  const frame = byId('stage').contentWindow
  // The bundled player's initial script subscribes before load. See the prepare-time shim.
  if (latestSnapshot) frame.dispatchEvent(new CustomEvent('android:snapshot', { detail: latestSnapshot }))
})
window.showPlayerActions = () => { if (!byId('settings').open && !byId('actions').open) byId('actions').showModal() }
window.addEventListener('screen:update', event => byId('stage').contentWindow.dispatchEvent(new CustomEvent('android:snapshot', { detail: event.detail })))
byId('menu-button').onclick = window.showPlayerActions
byId('edit').onclick = () => { byId('actions').close(); openSettings() }
byId('resume').onclick = () => byId('actions').close()
byId('quit').onclick = () => native('quit')
byId('reconnect').onclick = () => { byId('actions').close(); if (current) startRealtime(); else openSettings() }
function openSettings() { byId('error').textContent = ''; byId('cancel').hidden = !current; if (!byId('settings').open) byId('settings').showModal() }
byId('cancel').onclick = () => { if (current) byId('settings').close() }
byId('settings').addEventListener('cancel', event => { if (!current) event.preventDefault() })
byId('connect-form').onsubmit = async event => {
  event.preventDefault()
  const serverUrl = normalizeServerUrl(byId('server').value), screenId = byId('screen').value.trim()
  if (!serverUrl || !screenId) { byId('error').textContent = 'Enter a server URL and Screen ID.'; return }
  byId('connect').disabled = true; byId('error').textContent = ''
  const attempt = ++generation
  try {
    await fetchJson(`${serverUrl}/api/screens/${encodeURIComponent(screenId)}`)
    if (attempt !== generation) return
    await native('save', { serverUrl, screenId })
    current = { serverUrl, screenId }; byId('settings').close(); startRealtime()
  } catch (error) { byId('error').textContent = error.message.includes('404') ? 'No screen found with this ID.' : `Could not connect: ${error.message}` }
  finally { byId('connect').disabled = false }
}
native('config').then(config => {
  byId('server').value = config.serverUrl || ''; byId('screen').value = config.screenId || ''
  if (config.serverUrl && config.screenId) { current = config; startRealtime() } else openSettings()
}).catch(error => { openSettings(); byId('error').textContent = error.message })
window.addEventListener('pagehide', () => stopConnection?.())
