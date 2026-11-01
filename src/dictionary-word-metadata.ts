/** Word-level labels use dictionary sources; never hallucinate readings or pitch. */
export type PitchDataset = Record<string, Record<string, number[]>>
export type WordLanguage = 'ja' | 'en' | 'zh'

export function isDictionaryHeadword(query: string, term: string, language: WordLanguage): boolean {
  const q = query.normalize('NFKC').trim()
  const w = term.normalize('NFKC').trim()
  if (!q || !w || q.toLocaleLowerCase() !== w.toLocaleLowerCase()) return false
  if ([...q].length > 24 || /[\s。！？!?，、,.;；：:（）()[\]{}…]/.test(q)) return false
  if (language === 'en') return /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(q)
  // A continuous Chinese sentence has no spaces. Prefer omitting unverified
  // word-level labels over presenting a whole sentence as a vocabulary entry.
  if (language === 'zh' && [...q].length > 4) return false
  if (language === 'ja' && /(?:です|でした|ます|ました|ません|ください|かもしれない|でしょう)$/.test(q)) return false
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

// Small hand-checked Chinese pronunciation list for common everyday words.
// Other Chinese headwords deliberately omit pinyin/POS instead of guessing.
const chineseWordGuide: Record<string, { pinyin: string; partOfSpeech: string }> = {
  '晚上': { pinyin: 'wǎnshang', partOfSpeech: '时间名词' },
  '早上': { pinyin: 'zǎoshang', partOfSpeech: '时间名词' },
  '上午': { pinyin: 'shàngwǔ', partOfSpeech: '时间名词' },
  '下午': { pinyin: 'xiàwǔ', partOfSpeech: '时间名词' },
  '中午': { pinyin: 'zhōngwǔ', partOfSpeech: '时间名词' },
  '今天': { pinyin: 'jīntiān', partOfSpeech: '时间名词' },
  '明天': { pinyin: 'míngtiān', partOfSpeech: '时间名词' },
  '昨天': { pinyin: 'zuótiān', partOfSpeech: '时间名词' },
  '现在': { pinyin: 'xiànzài', partOfSpeech: '时间名词／副词' },
  '马上': { pinyin: 'mǎshàng', partOfSpeech: '副词' },
  '天气': { pinyin: 'tiānqì', partOfSpeech: '名词' },
  '下雨': { pinyin: 'xiàyǔ', partOfSpeech: '动词' },
  '下雪': { pinyin: 'xiàxuě', partOfSpeech: '动词' },
  '工作': { pinyin: 'gōngzuò', partOfSpeech: '动词／名词' },
  '学习': { pinyin: 'xuéxí', partOfSpeech: '动词' },
  '考试': { pinyin: 'kǎoshì', partOfSpeech: '名词／动词' },
  '上班': { pinyin: 'shàngbān', partOfSpeech: '动词' },
  '下班': { pinyin: 'xiàbān', partOfSpeech: '动词' },
  '朋友': { pinyin: 'péngyou', partOfSpeech: '名词' },
  '家人': { pinyin: 'jiārén', partOfSpeech: '名词' },
  '猫': { pinyin: 'māo', partOfSpeech: '名词' },
  '电脑': { pinyin: 'diànnǎo', partOfSpeech: '名词' },
  '手机': { pinyin: 'shǒujī', partOfSpeech: '名词' },
  '网络': { pinyin: 'wǎngluò', partOfSpeech: '名词' },
  '密码': { pinyin: 'mìmǎ', partOfSpeech: '名词' },
  '银行': { pinyin: 'yínháng', partOfSpeech: '名词' },
  '火车': { pinyin: 'huǒchē', partOfSpeech: '名词' },
  '飞机': { pinyin: 'fēijī', partOfSpeech: '名词' },
  '地铁': { pinyin: 'dìtiě', partOfSpeech: '名词' },
  '吃饭': { pinyin: 'chīfàn', partOfSpeech: '动词' },
  '喜欢': { pinyin: 'xǐhuan', partOfSpeech: '动词' },
  '漂亮': { pinyin: 'piàoliang', partOfSpeech: '形容词' },
  '好吃': { pinyin: 'hǎochī', partOfSpeech: '形容词' },
  '跑步': { pinyin: 'pǎobù', partOfSpeech: '动词' },
  '可以': { pinyin: 'kěyǐ', partOfSpeech: '能愿动词' },
  '因为': { pinyin: 'yīnwèi', partOfSpeech: '连词' },
  '但是': { pinyin: 'dànshì', partOfSpeech: '连词' },
  '如果': { pinyin: 'rúguǒ', partOfSpeech: '连词' },
  '谢谢': { pinyin: 'xièxie', partOfSpeech: '感叹词' },
}

export function getChineseWordGuide(word: string): { pinyin: string; partOfSpeech: string } | undefined {
  return chineseWordGuide[word.normalize('NFKC').trim()]
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
