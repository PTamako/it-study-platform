import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const directory = new URL('../migrations/', import.meta.url)
const expected = { A: 20, B: 6 }
// IPA publishes only 20 A and 6 B CBT items per year, not a complete exam.
// Never guess unreleased questions or relabel adaptations as published originals.
export function inspectFePublishedBank() {
  const sourceFiles = readdirSync(directory)
    .filter(file => /^\d{4}_.+\.sql$/.test(file))
    .sort()
  const byKey = new Map()
  for (const file of sourceFiles) {
    const text = readFileSync(new URL(file, directory), 'utf8')
    const entries = text.matchAll(/fe-ipa-official-(20\d{2})-([ab])-(\d{2})/g)
    for (const match of entries) {
      const [, year, section, item] = match
      const key = year + ':' + section.toUpperCase() + ':' + Number(item)
      if (byKey.has(key)) throw new Error('Duplicate IPA FE official original: ' + key +
        ' (in ' + byKey.get(key) + ', ' + file + ')')
      if (![2023, 2024, 2025, 2026].includes(Number(year)) ||
        Number(item) < 1 || Number(item) > expected[section.toUpperCase()]) {
        throw new Error('Invalid IPA FE published number: ' + key)
      }
      byKey.set(key, file)
    }
  }
  const years = [2023, 2024, 2025, 2026].map(year => {
    const sections = {}
    for (const section of ['A', 'B']) {
      const present = [...byKey.keys()].filter(key => key.startsWith(year + ':' + section + ':'))
        .map(key => Number(key.split(':')[2])).sort((a,b) => a-b)
      const missing = Array.from({length: expected[section]}, (_, index) => index + 1)
        .filter(n => !present.includes(n))
      sections[section] = {present, missing}
    }
    return {year, sections}
  })
  return {
    officialCount: byKey.size,
    availableTotal: 4 * (expected.A + expected.B),
    missingCount: years.reduce((sum, year) =>
      sum + year.sections.A.missing.length + year.sections.B.missing.length, 0),
    years,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(
  new URL('file://' + process.argv[1].replaceAll('\\', '/')))) {
  const result = inspectFePublishedBank()
  console.log(JSON.stringify(result, null, 2))
}
