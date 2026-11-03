#!/usr/bin/env node
/**
 * Issue #113: ensure static language and dictionary manifests really exist
 * in the assets Wrangler publishes. This never accesses D1.
 *
 * Local:    node scripts/check-static-assets.mjs --local
 * Deployed: BASE_URL=https://... node scripts/check-static-assets.mjs --deployed
 */
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), 'dist')
const manifestPaths = ['/language-cards/manifest.json', '/learner-lexicon/manifest.json']
const base = (process.env.BASE_URL || '').replace(/\/$/, '')
const deployed = process.argv.includes('--deployed')
const sleep = ms => new Promise(done => setTimeout(done, ms))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
function checkAssetPath(path, kind, lang) {
  const pattern = new RegExp('^/' + kind + '/' + lang + '\\.[0-9a-f]{16}\\.json$')
  assert(typeof path === 'string' && pattern.test(path), 'Unexpected asset path: ' + String(path))
}
function checkData(data, kind, lang) {
  assert(data && Array.isArray(data.items), kind + '/' + lang + ': missing items array')
  assert(kind === 'language-cards' ? data.items.length === 5000 : data.items.length >= 3000,
    kind + '/' + lang + ': incomplete static corpus (' + data.items.length + ' items)')
}
async function fetchJSON(path) {
  let error
  for (let attempt = 1; attempt <= 7; attempt++) {
    const url = base + path + '?asset_smoke=' + attempt
    try {
      const response = await fetch(url, { cache: 'no-store', redirect: 'manual' })
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || !/\bapplication\/json\b/i.test(contentType)) {
        const prefix = (await response.text()).slice(0, 100).replace(/\s+/g, ' ')
        throw new Error('HTTP ' + response.status + '; type=' + contentType + '; final_url=' +
          response.url + '; first_bytes=' + JSON.stringify(prefix))
      }
      return await response.json()
    } catch (cause) {
      error = cause
      console.warn('Asset check ' + attempt + '/7: ' + path + ': ' + cause.message)
      if (attempt < 7) await sleep(5000)
    }
  }
  throw new Error('Static asset unavailable after retries: ' + path + ': ' + error?.message)
}
async function readJSON(path) {
  if (deployed) return fetchJSON(path)
  // Whitelisted paths are expected to be absolute, rooted in dist.
  assert(/^\/(?:language-cards|learner-lexicon)\/[a-z0-9.-]+\.json$/.test(path), 'Unsafe path: ' + path)
  const target = resolve(root, '.' + path)
  assert(target.startsWith(root + '/'), 'Path escapes dist: ' + path)
  const info = statSync(target)
  assert(info.size > 50, 'Empty static asset: ' + path)
  console.log('dist asset ' + path + ' (' + info.size + ' bytes)')
  return JSON.parse(readFileSync(target, 'utf8'))
}
async function main() {
  assert(!deployed || /^https:\/\//.test(base), 'Deployed check needs an HTTPS BASE_URL')
  for (const path of manifestPaths) {
    const kind = path.split('/')[1]
    const manifest = await readJSON(path)
    assert(manifest?.version === 1, 'Invalid static manifest: ' + path)
    for (const lang of ['ja', 'en']) {
      const itemPath = manifest[lang]
      checkAssetPath(itemPath, kind, lang)
      const payload = await readJSON(itemPath)
      checkData(payload, kind, lang)
      console.log(kind + '/' + lang + ': ' + payload.items.length + ' static cards confirmed (no D1 reads)')
    }
  }
}
main().catch(error => {
  console.error('Static assets acceptance failed: ' + error.message)
  process.exitCode = 1
})
