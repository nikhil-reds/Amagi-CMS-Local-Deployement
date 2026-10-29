const fs = require('fs');
const path = require('path');
require('../scripts/prepare-media.cjs');
fs.copyFileSync(path.join(__dirname, '../public/media-runtime.js'), path.join(__dirname, 'media-runtime.js'));
fs.cpSync(path.join(__dirname, '../public/pdfjs'), path.join(__dirname, 'pdfjs'), { recursive: true });
