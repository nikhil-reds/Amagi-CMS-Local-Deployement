const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '../..')
const out = path.join(root, 'android/app/src/main/assets')
fs.mkdirSync(out, { recursive: true })
const drawable = path.join(root, 'android/app/src/main/res/drawable')
fs.mkdirSync(drawable, { recursive: true })
fs.copyFileSync(path.join(root, 'public/xox-logo.png'), path.join(drawable, 'xos_logo.png'))
require(path.join(root, 'scripts/prepare-media.cjs'))
for (const [from, to] of [['desktop/player.html', 'player.html'], ['public/media-runtime.js', 'media-runtime.js'], ['node_modules/centrifuge/dist/centrifuge.js', 'centrifuge.js'], ['android/player/index.html', 'index.html'], ['android/player/host.js', 'host.js']]) {
  fs.copyFileSync(path.join(root, from), path.join(out, to))
}
fs.cpSync(path.join(root, 'public/pdfjs'), path.join(out, 'pdfjs'), { recursive: true })
// Android WebView can lag behind Electron Chromium; use PDF.js's polyfilled build.
for (const name of ['pdf.mjs', 'pdf.worker.mjs']) {
  fs.copyFileSync(path.join(root, 'node_modules/pdfjs-dist/legacy/build', name), path.join(out, 'pdfjs', name))
}
fs.copyFileSync(path.join(root, 'node_modules/centrifuge/LICENSE'), path.join(out, 'CENTRIFUGE-LICENSE'))
const playerPath = path.join(out, 'player.html')
const shim = `<script>window.player = { onScreen(callback) { window.addEventListener('android:snapshot', event => callback(event.detail)) }, actions() { parent.showPlayerActions() } };</script>`
fs.writeFileSync(playerPath, fs.readFileSync(playerPath, 'utf8').replace('<script src="media-runtime.js">', `${shim}<script src="media-runtime.js">`))
// Generate the browser adapter from the exact Windows connection implementation.
const source = fs.readFileSync(path.join(root, 'desktop/screen-connection.cjs'), 'utf8')
const begin = source.indexOf('function connectScreen(')
const end = source.indexOf('module.exports =')
if (begin < 0 || end < begin) throw new Error('Windows connection module format changed')
fs.writeFileSync(path.join(out, 'screen-connection.js'), `const Centrifuge = window.Centrifuge;\n${source.slice(begin, end)}\nwindow.connectScreen = connectScreen;\n`)
console.log('Android assets prepared from the Windows player and shared media runtime')
