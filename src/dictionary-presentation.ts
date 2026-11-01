/** Pure presentation helpers for the three-language dictionary.
 * One query language is the headword; never display it again as a translation.
 */
export type PresentedDictionaryEntry = {
  term: string
  language?: 'zh' | 'ja' | 'en'
  zh?: string
  en?: string
  translationJa?: string
  englishTerm?: string
  japaneseTerm?: string
  senses?: Array<{ partOfSpeech: string; definitions: string[] }>
}
export type TranslationRow = { language: 'zh' | 'ja' | 'en'; label: string; value: string }

export function dictionaryTranslationRows(entry: PresentedDictionaryEntry): TranslationRow[] {
  const original = entry.language
  const values: Array<[TranslationRow['language'], string]> = [
    ['zh', entry.zh || ''],
    ['ja', entry.japaneseTerm || entry.translationJa || ''],
    ['en', entry.englishTerm || (entry.senses?.length ? '' : entry.en || '')],
  ]
  const seen = new Set<string>()
  return values.flatMap(([language, raw]) => {
    const value = raw.trim()
    if (!value || language === original || value.normalize('NFKC').toLowerCase() === entry.term.normalize('NFKC').toLowerCase()) return []
    // Never render the same translated expression twice under different labels.
    const compare = value.normalize('NFKC').toLocaleLowerCase()
    if (seen.has(compare)) return []
    seen.add(compare)
    return [{ language, label: ({ zh: '中', ja: '日', en: '英' } as const)[language], value }]
  })
}

const accentToTone: Record<string, number> = {
  '\u0304': 1, '\u0301': 2, '\u030c': 3, '\u0300': 4,
}
export function chinesePinyinToneLabels(pinyin: string): string[] {
  if (!pinyin || !/[\p{Script=Latin}]/u.test(pinyin)) return []
  return pinyin.trim().split(/\s+/g).slice(0, 4).map(syllable => {
    const decomposed = syllable.normalize('NFD')
    const mark = [...decomposed].find(letter => accentToTone[letter] !== undefined)
    const tone = mark ? accentToTone[mark] : Number(syllable.match(/[1-4]$/)?.[0] || 0)
    return tone ? ['一声', '二声', '三声', '四声'][tone - 1] : '轻声'
  })
}
