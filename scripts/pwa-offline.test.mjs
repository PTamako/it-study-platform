import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const serviceWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const entry = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8')

test('PWA caches an app shell for offline navigation', () => {
  assert.match(serviceWorker, /const APP_SHELL = \[[^\n]*'\/manifest\.webmanifest'[^\n]*'\/icon-192\.png'[^\n]*'\/icon-512\.webp'/)
  assert.match(serviceWorker, /request\.mode === 'navigate'/)
  assert.match(serviceWorker, /caches\.match\('\/'\)/)
})

test('PWA never caches API requests or non-GET requests', () => {
  assert.match(serviceWorker, /request\.method !== 'GET'/)
  assert.match(serviceWorker, /url\.pathname\.startsWith\(API_PREFIX\)/)
})

test('PWA avoids caching no-store responses and refreshes versioned assets', () => {
  assert.match(serviceWorker, /cache-control.*no-store/)
  assert.match(serviceWorker, /url\.pathname\.startsWith\('\/assets\/'\)/)
  assert.match(serviceWorker, /startsWith\('zhixue-'\).*key !== CACHE_NAME/s)
})

test('PWA checks for service worker updates when opened and foregrounded', () => {
  assert.match(entry, /updateViaCache: 'none'/)
  assert.match(entry, /registration\.update\(\)/)
  assert.match(entry, /visibilitychange/)
})
