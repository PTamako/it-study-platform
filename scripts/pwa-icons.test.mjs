import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')

test('192px PNG is a real home-screen image and Android gets a full-size 512px icon', () => {
  const small = readFileSync(new URL('../public/icon-192.png', import.meta.url))
  const large = readFileSync(new URL('../public/icon-512.webp', import.meta.url))
  assert.equal(small.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(small.readUInt32BE(16), 192)
  assert.equal(small.readUInt32BE(20), 192)
  assert.equal(large.toString('ascii', 0, 4), 'RIFF')
  assert.equal(large.toString('ascii', 8, 12), 'WEBP')
  assert.equal(large.toString('ascii', 12, 16), 'VP8 ')
  // Lossy VP8 frame header: width & height are 14-bit little-endian integers.
  assert.equal(large.readUInt16LE(26) & 0x3fff, 512)
  assert.equal(large.readUInt16LE(28) & 0x3fff, 512)
  assert.ok(small.length > 4000 && large.length > 4000)
})

test('manifest and iOS Apple touch shortcut both use the new icon assets', () => {
  assert.equal(manifest.short_name, '知学')
  assert.equal(manifest.display, 'standalone')
  assert.deepEqual(manifest.icons.map(icon => [icon.src, icon.sizes, icon.type]), [
    ['/icon-192.png', '192x192', 'image/png'],
    ['/icon-512.webp', '512x512', 'image/webp'],
  ])
  assert.match(html, /rel="apple-touch-icon"[^>]*href="\/icon-192\.png/)
  assert.match(html, /name="apple-mobile-web-app-title" content="知学"/)
  assert.match(html, /rel="icon"[^>]*href="\/icon-192\.png/)
  assert.match(sw, /zhixue-app-v3/)
  assert.match(sw, /'\/icon-192\.png'/)
  assert.match(sw, /'\/icon-512\.webp'/)
})
