/** Word-level labels use dictionary sources; never hallucinate readings or pitch. */
export type PitchDataset = Record<string, Record<string, number[]>>
export type WordLanguage = 'ja' | 'en' | 'zh'

export function isDictionaryHeadword(query: string, term: string, language: WordLanguage): boolean {
  const q = query.normalize('NFKC').trim()
  const w = term.normalize('NFKC').trim()
  if (!q || !w || q.toLocaleLowerCase() !== w.toLocaleLowerCase()) return false
  if ([...q].length > 24 || /[\s。！？!?，、,.;；：:（）()[\]{}…]/.test(q)) return false
  if (language === 'en') return /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(q)
  return /^[\u3040-\u30ff\u3400-\u9fffー々]+$/.test(q)
}

export function japaneseMoraCount(reading: string): number {
  return [...reading.normalize('NFKC')].filter(ch => !/[ゃゅょぁぃぅぇぉゎヵヶ]/.test(ch)).length
}

export function matchingJapaneseAccents(
  data: PitchDataset | null,
  term: string, reading: string,
): number[] {
  if (!data || !term || !reading) return []
  const row = data[term] || (term === reading ? data[reading] : undefined)
  const values = row?.[reading] || []
  const mora = japaneseMoraCount(reading)
  return values.filter(n => Number.isInteger(n) && n >= 0 && n <= mora).slice(0, 4)
}

const circled = ['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']
export function pitchLabel(index: number, reading: string): string {
  if (!Number.isInteger(index) || index < 0) return ''
  const mark = circled[index] || '[' + index + ']'
  if (index === 0) return mark + ' 平板'
  if (index === 1) return mark + ' 头高'
  const mora = japaneseMoraCount(reading)
  return mark + (index === mora ? ' 尾高' : ' 中高')
}

const posLabels: Record<string,string> = {
  noun:'名词',verb:'动词',adjective:'形容词',adverb:'副词',
  pronoun:'代词',preposition:'介词',conjunction:'连词',
  interjection:'感叹词',determiner:'限定词',number:'数词',
  auxiliary:'助动词',exclamation:'感叹词',article:'冠词',
}
export function partOfSpeechDisplay(part: string): string {
  if (!part) return ''
  const raw = part.trim()
  const key = raw.toLowerCase()
  if (posLabels[key]) return raw + ' · ' + posLabels[key]
  // Jisho labels distinguish conjugation patterns, not just generic "verb".
  if (/^godan verb/i.test(raw) || /^ichidan verb/i.test(raw) || /^suru verb/i.test(raw)) return raw + ' · 动词'
  if (/^na-adjective/i.test(raw)) return raw + ' · な形容词'
  if (/^i-adjective/i.test(raw)) return raw + ' · い形容词'
  if (/^noun/i.test(raw)) return raw + ' · 名词'
  if (/^adverb/i.test(raw)) return raw + ' · 副词'
  return raw
}

let pitchPromise: Promise<PitchDataset | null> | undefined
export function loadJapanesePitchDataset(fetcher: typeof fetch = fetch): Promise<PitchDataset | null> {
  if (!pitchPromise) {
    pitchPromise = fetcher('/pitch-accent.json', { cache: 'force-cache' })
      .then(async response => response.ok ? await response.json() as PitchDataset : null)
      .catch(() => null)
  }
  return pitchPromise
}
