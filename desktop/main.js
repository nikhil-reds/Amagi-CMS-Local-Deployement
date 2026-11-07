const { app, BaseWindow, WebContentsView, Menu, ipcMain, net } = require('electron')
const fs = require('fs')
const path = require('path')
const { connectScreen } = require('./screen-connection.cjs')

// One initial snapshot followed by Centrifugo publications only.
const REQUEST_TIMEOUT_MS = 20_000

let win = null
let contentView = null
let overlayView = null
let current = null // { serverUrl, screenId }
let overlayReady = false
let pendingOverlayMessage = null
const startupStartedAt = performance.now()

function markStartup(label) {
  if (process.env.PLAYER_STARTUP_PROFILE === '1') {
    console.log(`[startup +${Math.round(performance.now() - startupStartedAt)}ms] ${label}`)
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
// build-config.json is written by CI (CMS_URL repo variable) and gives the default
// server. The last used server/screen are remembered per machine in userData.

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

const userConfigPath = () => path.join(app.getPath('userData'), 'config.json')

function loadConfig() {
  const defaults = readJson(path.join(__dirname, 'build-config.json'))
  const saved = readJson(userConfigPath())
  return {
    serverUrl: saved.serverUrl || process.env.CMS_URL || defaults.serverUrl || '',
    screenId: saved.screenId || '',
  }
}

function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(userConfigPath()), { recursive: true })
    fs.writeFileSync(userConfigPath(), JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to save config', error)
  }
}

function normalizeServerUrl(value) {
  let raw = String(value || '').trim()
  if (!raw) return ''
  if (!/^https?:\/\//i.test(raw)) raw = `http://${raw}`
  try {
    const parsed = new URL(raw)
    // The player expects the CMS origin only. Repair old values such as
    // http://localhost:3000/view/screen saved by earlier builds.
    parsed.pathname = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

// ── Live content: no polling or cached/offline fallback ───────────────────────
let stopConnection = null
let latestSnapshot = null
function show(params) {
  contentView.webContents.loadFile(path.join(__dirname, 'player.html'), { search: new URLSearchParams(params).toString() })
}
async function fetchJson(url, signal) {
  const response = await net.fetch(url, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`); error.status = response.status; throw error
  }
  return response.json()
}
function stopRealtime() {
  stopConnection?.(); stopConnection = null; latestSnapshot = null
}
function startRealtime() {
  stopRealtime()
  const target = current
  if (!target) return
  show({ kind: 'layout', items: '[]' })
  stopConnection = connectScreen({
    ...target, fetchJson,
    onSnapshot: snapshot => {
      if (current !== target) return
      if (!latestSnapshot) markStartup('first screen snapshot received')
      latestSnapshot = snapshot
      if (!contentView.webContents.isLoading()) contentView.webContents.send('screen:update', snapshot)
    },
    onDisconnected: reason => {
      if (current !== target) return
      latestSnapshot = null
      show({ kind: 'message', text: reason })
    },
  })
}

async function openScreen({ serverUrl, screenId }) {
  serverUrl = normalizeServerUrl(serverUrl)
  screenId = String(screenId || '').trim()

  if (!serverUrl) return { ok: false, error: 'Enter the server address.', needServer: true }
  if (!screenId) return { ok: false, error: 'Enter a Screen ID.' }

  try {
    await fetchJson(`${serverUrl}/api/screens/${encodeURIComponent(screenId)}`)
  } catch (error) {
    if (error.status === 404) return { ok: false, error: `No screen found with ID "${screenId}".` }
    return {
      ok: false,
      error: `Could not reach the server (${error.message}). Check the server address.`,
      needServer: true,
    }
  }

  current = { serverUrl, screenId }
  saveConfig({ serverUrl, screenId })
  hideOverlay()
  startRealtime()
  return { ok: true }
}

// On launch, reopen the saved server + screen without asking. The Screen ID modal only
// appears when nothing is saved yet (or on Ctrl+R / F5).
function openSavedScreen() {
  const { serverUrl, screenId } = loadConfig()
  const server = normalizeServerUrl(serverUrl)
  const id = String(screenId || '').trim()
  if (!server || !id) return false

  current = { serverUrl: server, screenId: id }
  hideOverlay()
  startRealtime()
  markStartup('saved screen started')
  return true
}

// ── Overlay (Screen ID modal) ─────────────────────────────────────────────────

function showOverlay(showSettings = false) {
  if (!overlayView) return
  const state = { ...loadConfig(), canCancel: Boolean(current), showSettings }
  overlayView.setVisible(true)
  overlayView.webContents.focus()
  if (overlayReady) overlayView.webContents.send('overlay:show', state)
  else pendingOverlayMessage = ['overlay:show', state]
}

function hideOverlay() {
  overlayView.setVisible(false)
  contentView.webContents.focus()
}

function showPlayerActions() {
  if (!overlayView || overlayView.getVisible()) return
  overlayView.setVisible(true)
  if (overlayReady) overlayView.webContents.send('player:actions')
  else pendingOverlayMessage = ['player:actions']
  overlayView.webContents.focus()
}

// Ctrl+R / Ctrl+Shift+R / F5 never reload: they bring back the Screen ID modal.
// Ctrl+Shift+Q quits the kiosk.
function attachShortcuts(webContents) {
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const key = input.key.toLowerCase()
    const ctrl = input.control || input.meta

    if (ctrl && input.shift && key === 'q') {
      event.preventDefault()
      app.quit()
    } else if ((ctrl && key === 'r') || key === 'f5') {
      event.preventDefault()
      showOverlay()
    }
  })
}

// ── Window ────────────────────────────────────────────────────────────────────

function layoutViews() {
  const { width, height } = win.getContentBounds()
  const bounds = { x: 0, y: 0, width, height }
  contentView.setBounds(bounds)
  overlayView.setBounds(bounds)
}

function createWindow() {
  win = new BaseWindow({
    title: 'XOS',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#000000',
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
  })

  contentView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })
  contentView.setBackgroundColor('#000000')
  // Also catches context menus originating inside embedded websites.
  contentView.webContents.on('context-menu', (event) => {
    event.preventDefault()
    showPlayerActions()
  })
  contentView.webContents.on('did-finish-load', () => {
    markStartup('player renderer loaded')
    if (latestSnapshot) contentView.webContents.send('screen:update', latestSnapshot)
  })

  overlayView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  })
  overlayView.setBackgroundColor('#00000000')

  // Added last = drawn on top.
  win.contentView.addChildView(contentView)
  win.contentView.addChildView(overlayView)
  layoutViews()
  win.on('resize', layoutViews)

  for (const wc of [contentView.webContents, overlayView.webContents]) {
    attachShortcuts(wc)
    // Keep everything inside the kiosk: no popups or new windows.
    wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  }

  contentView.webContents.loadURL('about:blank')
  overlayView.webContents.loadFile(path.join(__dirname, 'overlay.html'))
  overlayView.setVisible(false)
  overlayView.webContents.once('did-finish-load', () => {
    overlayReady = true
    markStartup('overlay renderer loaded')
    if (pendingOverlayMessage) {
      overlayView.webContents.send(...pendingOverlayMessage)
      pendingOverlayMessage = null
    }
  })

  // Saved playback starts immediately. The controls overlay loads concurrently and is
  // only on the critical path for a first launch with no saved screen assignment.
  if (!openSavedScreen()) showOverlay()
  markStartup('window created')

  win.on('closed', () => {
    stopRealtime()
    overlayReady = false
    pendingOverlayMessage = null
    win = contentView = overlayView = null
  })
}

ipcMain.handle('overlay:submit', (_event, payload) => openScreen(payload || {}))
ipcMain.on('overlay:cancel', () => {
  if (current) hideOverlay()
})
ipcMain.on('player:reset', () => showOverlay())
ipcMain.on('player:open-settings', () => showOverlay(true))
ipcMain.on('player:quit', () => app.quit())
ipcMain.on('player:actions', showPlayerActions)
ipcMain.on('player:dismiss-actions', () => hideOverlay())
ipcMain.on('player:fullscreen', () => {
  if (!win) return
  win.setFullScreen(true)
  win.setKiosk(true)
  hideOverlay()
})

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      win.focus()
      showOverlay()
    }
  })

  app.whenReady().then(() => {
    markStartup('Electron ready')
    // No application menu, so its default Reload (Ctrl+R) accelerator does not exist.
    // Same id as the shortcuts, so a pinned shortcut and the running window share one taskbar icon.
    app.setAppUserModelId('com.amagi.screenplayer')
    Menu.setApplicationMenu(null)
    createWindow()
  })

  app.on('before-quit', stopRealtime)
  app.on('window-all-closed', () => app.quit())
}
