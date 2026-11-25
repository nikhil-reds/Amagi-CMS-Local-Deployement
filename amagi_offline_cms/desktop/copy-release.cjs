const fs = require('node:fs')
const path = require('node:path')

const source = path.join(__dirname, 'dist', `AmagiScreenPlayer-Setup-${require('./package.json').version}.exe`)
const destination = path.join(__dirname, '..', 'public', 'XOS.exe')
if (!fs.existsSync(source)) throw new Error(`Windows installer not found: ${source}`)
fs.copyFileSync(source, destination)
console.log(`Sidebar download updated: ${destination}`)
