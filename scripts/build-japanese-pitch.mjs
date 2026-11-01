// Kanjium pitch accent notation by Uros O., CC BY-SA 4.0.
// Dataset: https://github.com/mifunetoshiro/kanjium
// The upstream commit is pinned to make builds reproducible.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export const KANJIUM_COMMIT = '9ebca4589565c696e7c39e089e2e928ad65f678c'
export const KANJIUM_SOURCE = 'https://raw.githubusercontent.com/mifunetoshiro/kanjium/'
  + KANJIUM_COMMIT + '/data/source_files/raw/accents.txt'

export function parseKanjiumAccents(tsv) {
  const records = Object.create(null)
  let pairs = 0
  for (const line of tsv.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const columns = line.split('\t')
    if (columns.length < 3) continue
    const [word, reading, rawAccents] = columns
    if (!word || !reading || !/^[\u3040-\u30ffー]+$/.test(reading) || word.length > 50) continue
    // Kanjium defines 0 as heiban and n>=1 as a drop after mora n.
    const candidates = rawAccents.trim().split(/[,\s]+/).filter(Boolean)
    if (!candidates.length || !candidates.every(v => /^(?:0|[1-9]\d?)$/.test(v))) continue
    const moraCount = [...reading.normalize('NFKC')].filter(c => !/[ゃゅょぁぃぅぇぉゎヵヶ]/.test(c)).length
    const accents = [...new Set(candidates.map(Number))].filter(n => n <= moraCount)
    if (!accents.length) continue
    if (!records[word]) records[word] = Object.create(null)
    const previous = records[word][reading] || []
    records[word][reading] = [...new Set([...previous, ...accents])].sort((a, b) => a - b)
    pairs++
  }
  return { records, pairs }
}

async function main() {
  const response = await fetch(KANJIUM_SOURCE, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw Error('Pinned Kanjium source HTTP ' + response.status)
  const content = await response.text()
  if (content.length < 150_000 || content.length > 16_000_000) {
    throw Error('Unexpected Kanjium source size')
  }
  const { records, pairs } = parseKanjiumAccents(content)
  if (pairs < 85_000) throw Error('Kanjium entries unexpectedly missing: ' + pairs)
  const target = new URL('../public/pitch-accent.json', import.meta.url)
  await mkdir(fileURLToPath(new URL('../public/', import.meta.url)), { recursive: true })
  await writeFile(target, JSON.stringify(records), 'utf8')
  console.log('Generated verified Kanjium pitch accent asset:', pairs, 'records')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => {
    console.error('[pitch-accent]', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
