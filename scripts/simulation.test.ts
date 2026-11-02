import assert from 'node:assert/strict'
import { test } from 'node:test'
import { simulationAssets, simulationNumbers } from '../lib/simulation'
import { resolveSnapshot } from '../lib/screen-realtime'

test('four destinations cover twelve feeds exactly once in vertical order', () => {
  const groups = [0, 1, 2, 3].map(simulationNumbers)
  assert.deepEqual(groups, [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]])
  assert.equal(new Set(groups.flat()).size, 12)
  assert.throws(() => simulationNumbers(4))
})

test('simulation feeds use saved URLs and resolve localhost for a remote player', () => {
  const feeds = Array.from({ length: 12 }, (_, index) => ({ screenNumber: index + 1, url: `http://localhost:3000/screen${index + 1}` }))
  const assets = simulationAssets(3, feeds)
  const snapshot = resolveSnapshot({ id: 'a', code: '12345', name: 'Screen 04', revision: '1', assets }, 'http://192.168.1.10:3000')
  assert.deepEqual(snapshot.assets.map(asset => asset.document.websiteUrl), [10, 11, 12].map(number => `http://192.168.1.10:3000/screen${number}`))
  assert.throws(() => simulationAssets(0, []), /missing/)
})
