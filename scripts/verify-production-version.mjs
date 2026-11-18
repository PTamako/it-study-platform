#!/usr/bin/env node
/**
 * Fail closed when Cloudflare has not yet served the exact reviewed Git SHA.
 * The build writes public/version.json with GITHUB_SHA before Vite builds.
 * This check is public, read-only, and never accesses D1 or private APIs.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHA = /^[a-f0-9]{40}$/i
const sleep = milliseconds => new Promise(done => setTimeout(done, milliseconds))

export async function verifyProductionVersion({
  baseUrl,
  expectedSha,
  fetcher = fetch,
  maxAttempts = 6,
  wait = sleep,
} = {}) {
  if (!/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(baseUrl || '')) {
    throw Error('BASE_URL must be a single HTTPS origin')
  }
  if (!SHA.test(expectedSha || '')) throw Error('EXPECTED_RELEASE_SHA must be a 40-hex Git commit')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw Error('Invalid maxAttempts')
  }
  let lastError = 'unverified'
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = baseUrl + '/version.json?release_sha=' + expectedSha + '&attempt=' + attempt
      const response = await fetcher(url, { cache: 'no-store', redirect: 'manual' })
      const type = response.headers.get('content-type') || ''
      if (!response.ok || response.status !== 200 || response.headers.has('location') ||
          !/\bapplication\/json\b/i.test(type)) {
        throw Error('invalid release marker response HTTP ' + response.status + ' (' + type + ')')
      }
      const value = await response.json()
      if (!value || typeof value.version !== 'string' || !SHA.test(value.version)) {
        throw Error('release marker is missing a valid SHA')
      }
      if (value.version !== expectedSha) {
        throw Error('production SHA mismatch: expected ' + expectedSha + ', got ' + value.version)
      }
      return { verified: true, sha: expectedSha, attempts: attempt }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      if (attempt < maxAttempts) await wait(2500)
    }
  }
  throw Error('Cannot attest live Cloudflare release: ' + lastError)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyProductionVersion({
    baseUrl: process.env.BASE_URL,
    expectedSha: process.env.EXPECTED_RELEASE_SHA,
  }).then(({ sha, attempts }) => {
    console.log('Production release attested:', sha, 'after', attempts, 'probe(s)')
  }).catch(error => {
    console.error('Production release verification FAILED:', error.message)
    process.exitCode = 1
  })
}
