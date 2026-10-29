import assert from 'node:assert/strict'
import { requestOrigin, reachableAssetUrl } from '../lib/request-origin'
const local = new Request('http://0.0.0.0:3001/api/screens/77357/controls', { headers: { host: 'localhost:3001' } })
assert.equal(requestOrigin(local), 'http://localhost:3001')
const lan = new Request('http://0.0.0.0:3001/api/screens/77357/controls', { headers: { host: '192.168.1.20:3001' } })
assert.equal(requestOrigin(lan), 'http://192.168.1.20:3001')
assert.equal(reachableAssetUrl('http://localhost:9000/multimedia-assets/file.mp4', requestOrigin(lan)), 'http://192.168.1.20:9000/multimedia-assets/file.mp4')
assert.equal(reachableAssetUrl('https://cdn.example.com/file.png', requestOrigin(lan)), 'https://cdn.example.com/file.png')
console.log('PASS: local bind address repair, LAN storage URLs, external URL preservation')
