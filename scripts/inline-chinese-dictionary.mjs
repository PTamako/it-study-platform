import { readFileSync } from 'node:fs'

// Legacy Worker endpoint regression tests run the Worker in an isolated data URL
// or temporary .mts module. Inline the real lexical provider implementation so
// relative imports resolve without network access or special TS loaders.
const moduleSource = readFileSync(new URL('../worker/chinese-word-dictionary.ts', import.meta.url), 'utf8')
const providerImport = "import { eligibleChineseWord, fetchChineseWordMetadata } from './chinese-word-dictionary'"

export function inlineChineseDictionary(workerSource) {
  if (!workerSource.includes(providerImport)) throw new Error('Chinese dictionary import no longer matches test loader')
  return workerSource.replace(providerImport, moduleSource)
}
