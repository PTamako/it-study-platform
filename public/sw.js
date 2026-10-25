const CACHE_NAME = 'zhixue-app-v2'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg']
const API_PREFIX = '/api/'

self.addEventListener('install', (event) => {
  // Keep the app shell available even if an optional icon or manifest temporarily fails.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' })
        if (response.ok && response.type === 'basic') await cache.put(url, response)
      } catch {
        // A failed optional shell resource must not prevent the worker from installing.
      }
    }))
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('zhixue-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

async function cacheSuccessfulResponse(request, response) {
  if (!response || !response.ok || response.type !== 'basic') return
  if (response.headers.get('cache-control')?.toLowerCase().includes('no-store')) return
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response.clone())
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Never cache API responses, authenticated/personal data, writes, or third-party requests.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(API_PREFIX)) return

  if (request.mode === 'navigate') {
    // Prefer the newest app shell online; use the last cached shell when offline.
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put('/', response.clone())
        }
        return response
      } catch {
        return (await caches.match('/')) || new Response('目前处于离线状态，应用页面尚未缓存。请联网打开一次后重试。', {
          status: 503,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        })
      }
    })())
    return
  }

  // Cache-first for versioned build assets; network-first for other same-origin GETs.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) await cacheSuccessfulResponse(request, response.clone()).catch(() => {})
      return response
    })())
    return
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request)
      if (response.ok) event.waitUntil(cacheSuccessfulResponse(request, response.clone()).catch(() => {}))
      return response
    } catch {
      return (await caches.match(request)) || Response.error()
    }
  })())
})
