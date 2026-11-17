const CACHE_NAME = 'zhixue-app-v5'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.webp']
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
  // An absent fingerprinted JSON asset may be rewritten to index.html with
  // HTTP 200. That is not a valid lesson and must never poison the PWA cache.
  const path = new URL(request.url).pathname
  if (path.endsWith('.json') &&
      !/\bapplication\/json\b/i.test(response.headers.get('content-type') || '')) return
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

  // Network-first manifests prevent yesterday's hashes from being served
  // after a deployment. Only reuse an offline manifest when its paired
  // immutable card file is already cached on this device.
  if (url.pathname === '/language-cards/manifest.json' ||
      url.pathname === '/learner-lexicon/manifest.json') {
    event.respondWith((async () => {
      try {
        const response=await fetch(request,{cache:'no-store'})
        if (!response.ok || !/\bapplication\/json\b/i.test(response.headers.get('content-type')||''))
          throw Error('not-a-static-manifest')
        event.waitUntil(cacheSuccessfulResponse(request,response.clone()).catch(()=>{}))
        return response
      } catch {
        const saved=await caches.match(request)
        if (saved) {
          try {
            const data=await saved.clone().json()
            const dir=url.pathname.split('/')[1]
            const complete=await Promise.all(['ja','en'].map(lang=>
              typeof data[lang]==='string' &&
              data[lang].startsWith('/'+dir+'/'+lang+'.') ? caches.match(data[lang]) : null))
            if (complete.every(Boolean)) return saved
          } catch { /* stale or corrupted manifest: never serve */ }
        }
        return Response.error()
      }
    })())
    return
  }

  // Cache-first for immutable JS and well-formed hashed lesson/lexicon JSON.
  if (url.pathname.startsWith('/assets/') ||
      /^\/(?:language-cards|learner-lexicon)\/(?:ja|en)\.[a-f0-9]{16}\.json$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cached = await caches.match(request)
      if (cached && (!url.pathname.endsWith('.json') ||
        /\bapplication\/json\b/i.test(cached.headers.get('content-type') || ''))) return cached
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
