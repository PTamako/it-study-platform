import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyProductionVersion } from './verify-production-version.mjs'

const baseUrl = 'https://it-study-platform.example'
const expectedSha = 'a'.repeat(40)
const oldSha = 'b'.repeat(40)
const json = data => new Response(JSON.stringify(data), {
  status: 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
})
const config = opts => ({ baseUrl, expectedSha, maxAttempts: 1, wait: async () => {}, ...opts })

test('live release marker must match exactly the deployed Git SHA', async () => {
  const urls = []
  const verified = await verifyProductionVersion(config({
    fetcher: async (url, options) => {
      urls.push(url)
      assert.equal(options.cache, 'no-store')
      assert.equal(options.redirect, 'manual')
      return json({ version: expectedSha })
    },
  }))
  assert.deepEqual(verified, { verified: true, sha: expectedSha, attempts: 1 })
  assert.equal(urls.length, 1)
  assert.match(urls[0], /release_sha=/)
})

test('a stale Cloudflare release blocks marking the deployment successful', async () => {
  await assert.rejects(verifyProductionVersion(config({
    fetcher: async () => json({ version: oldSha }),
  })), /production SHA mismatch/)
})

test('SPA HTML fallback cannot masquerade as published release metadata', async () => {
  await assert.rejects(verifyProductionVersion(config({
    fetcher: async () => new Response('<!doctype html>', {
      status: 200, headers: { 'content-type': 'text/html' },
    }),
  })), /invalid release marker/)
})

test('asset propagation may retry but must end on the exact Git SHA', async () => {
  let count = 0
  const verified = await verifyProductionVersion(config({
    maxAttempts: 3,
    fetcher: async () => json({ version: ++count === 1 ? oldSha : expectedSha }),
  }))
  assert.equal(verified.attempts, 2)
})

test('missing expected SHA or unsafe origin is refused without network traffic', async () => {
  const fetcher = async () => { throw Error('unexpected network access') }
  await assert.rejects(verifyProductionVersion(config({ baseUrl: 'http://example.com', fetcher })), /HTTPS origin/)
  await assert.rejects(verifyProductionVersion(config({ expectedSha: 'test', fetcher })), /40-hex/)
})
