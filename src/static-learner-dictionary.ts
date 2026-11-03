/**
 * The public learner's lexicon is compiled from committed, attributed seed
 * data at build time. Ordinary known-word lookups never touch D1 or Workers AI.
 * The two small, fingerprinted dictionaries are lazy-loaded and cached per
 * browser session. Unknown terms still use the existing online API fallback.
 */
export type LexiconLanguage = 'ja' | 'en'
export type LexiconSense = { partOfSpeech: string; definitions: string[] }
export type LexiconDisplayEntry = {
  term: string; reading?: string; transcription?: string; language: LexiconLanguage
  en: string; zh: string; tag: string; source: string; sourceUrl?: string
  englishTerm?: string; translationJa?: string; japaneseTerm?: string
  usageNote?: string; example?: string; exampleTranslationZh?: string
  partsOfSpeech?: string[]; senses?: LexiconSense[]
}
type RawLexiconEntry = {
  id: string; language: LexiconLanguage; term: string; reading: string
  meaning_zh: string; explanation: string; example: string
  example_meaning_zh: string; source_type: 'licensed' | 'generated'
  translation_ja?: string; translation_en?: string
}
type LexiconManifest = { version: number; ja: string; en: string }
const ASSET_PATTERN = /^\/learner-lexicon\/(?:ja|en)\.[0-9a-f]{16}\.json$/
const partLabels: Record<string, string> = {
  n: 'noun', v: 'verb', vi: 'verb', vt: 'verb',
  a: 'adjective', adj: 'adjective', ad: 'adverb', adv: 'adverb',
  pron: 'pronoun', prep: 'preposition', conj: 'conjunction',
  int: 'interjection', interj: 'interjection',
}
const key = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase()
let manifestRequest: Promise<LexiconManifest> | undefined
const wordRequests = new Map<LexiconLanguage, Promise<Map<string, RawLexiconEntry>>>()

function parseEnglishSenses(explanation: string): LexiconSense[] {
  const result: LexiconSense[] = []
  for (const line of explanation.replace(/\\n/g, '\n').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 24)) {
    const match = /^([a-z]{1,6})\.\s+(.+)$/i.exec(line)
    const pos = match ? partLabels[match[1].toLowerCase()] || '' : ''
    const definition = (match ? match[2] : line).trim()
    if (!definition) continue
    let sense = result.find(item => item.partOfSpeech === pos)
    if (!sense) {
      if (result.length >= 6) break
      sense = { partOfSpeech: pos, definitions: [] }
      result.push(sense)
    }
    if (sense.definitions.length < 3 && !sense.definitions.includes(definition))
      sense.definitions.push(definition)
  }
  return result
}

async function manifest(): Promise<LexiconManifest> {
  if (!manifestRequest) {
    manifestRequest = fetch('/learner-lexicon/manifest.json', { cache: 'no-cache' })
      .then(async response => {
        if (!response.ok) throw new Error('Static learner lexicon manifest unavailable')
        const data = await response.json() as LexiconManifest
        if (data.version !== 1 || !ASSET_PATTERN.test(data.ja) || !ASSET_PATTERN.test(data.en))
          throw new Error('Invalid static learner lexicon manifest')
        return data
      })
      .catch(error => { manifestRequest = undefined; throw error })
  }
  return manifestRequest
}

async function words(language: LexiconLanguage): Promise<Map<string, RawLexiconEntry>> {
  if (!wordRequests.has(language)) {
    const request = (async () => {
      const paths = await manifest()
      const url = paths[language]
      if (!url.startsWith('/learner-lexicon/' + language + '.'))
        throw new Error('Mismatched lexicon asset language')
      const response = await fetch(url, { cache: 'force-cache' })
      if (!response.ok) throw new Error('Static learner lexicon unavailable')
      const payload = await response.json() as { items?: RawLexiconEntry[] }
      if (!Array.isArray(payload.items) || payload.items.length < 3000)
        throw new Error('Incomplete static learner lexicon')
      const index = new Map<string, RawLexiconEntry>()
      for (const entry of payload.items) {
        if (!entry || entry.language !== language || !entry.term || !entry.meaning_zh)
          throw new Error('Invalid static learner dictionary item')
        const normalized = key(entry.term)
        if (index.has(normalized)) throw new Error('Duplicate static learner dictionary entry')
        index.set(normalized, entry)
      }
      return index
    })().catch(error => { wordRequests.delete(language); throw error })
    wordRequests.set(language, request)
  }
  return wordRequests.get(language)!
}

/** Purely conservative; ambiguous kanji is left to the explicit language choice or server. */
export function localLexiconLanguage(query: string, selected: 'auto' | 'ja' | 'en' | 'zh' | 'it'): LexiconLanguage | null {
  if (selected === 'ja' || selected === 'en') return selected
  if (selected !== 'auto') return null
  if (/[\u3040-\u30ff]/.test(query)) return 'ja'
  if (/^[a-zA-Z][a-zA-Z '-]*$/.test(query)) return 'en'
  return null
}

export async function findStaticLearnerEntry(
  query: string, selected: 'auto' | 'ja' | 'en' | 'zh' | 'it',
): Promise<LexiconDisplayEntry | null> {
  const language = localLexiconLanguage(query, selected)
  if (!language || query.length > 80) return null
  const raw = (await words(language)).get(key(query))
  if (!raw) return null
  const isJapanese = language === 'ja'
  const licensed = raw.source_type === 'licensed'
  const explanation = raw.explanation.replace(/\\n/g, '\n').trim()
  const senses = !isJapanese && licensed ? parseEnglishSenses(explanation) : []
  return {
    term: raw.term,
    language,
    reading: isJapanese ? raw.reading : '',
    transcription: !isJapanese && licensed ? raw.reading : undefined,
    en: isJapanese ? raw.translation_en || '' : (licensed ? explanation : ''),
    zh: raw.meaning_zh.replace(/\\n/g, '\n'),
    tag: isJapanese ? '日语学习词典' : '英语学习词典',
    source: licensed
      ? isJapanese ? 'OpenJLPT / JMdict · CC BY-SA 4.0' : 'ECDICT · MIT'
      : '知学原创用法词典',
    sourceUrl: licensed
      ? isJapanese ? 'https://github.com/evanclan/OpenJLPT' : 'https://github.com/skywind3000/ECDICT'
      : undefined,
    englishTerm: isJapanese ? raw.translation_en : raw.term,
    japaneseTerm: isJapanese ? raw.term : raw.translation_ja,
    translationJa: isJapanese ? undefined : raw.translation_ja || '',
    usageNote: !licensed ? explanation : undefined,
    partsOfSpeech: senses.map(s => s.partOfSpeech).filter(Boolean),
    senses: senses.length ? senses : undefined,
    example: raw.example || '',
    exampleTranslationZh: raw.example_meaning_zh || '',
  }
}
