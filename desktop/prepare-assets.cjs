const fs = require('fs');
const path = require('path');
require('../scripts/prepare-media.cjs');
fs.copyFileSync(path.join(__dirname, '../public/media-runtime.js'), path.join(__dirname, 'media-runtime.js'));
fs.cpSync(path.join(__dirname, '../public/pdfjs'), path.join(__dirname, 'pdfjs'), { recursive: true });
// The JSON Centrifuge client is self-contained. Packaging just this runtime avoids
// shipping its unused protobuf build, source maps, declarations and transitive packages.
fs.copyFileSync(path.join(__dirname, 'node_modules/centrifuge/build/index.js'), path.join(__dirname, 'centrifuge-client.cjs'));
