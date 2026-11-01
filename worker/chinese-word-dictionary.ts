/** Chinese lexical metadata, sourced from the Mandarin dictionary at Moedict.
 * The Ministry of Education dictionary content is CC BY-ND 3.0 TW.
 * We extract factual pinyin and grammatical category labels only; do not
 * adapt or republish the dictionary's copyright-protected definitions.
 */
export type ChineseWordMetadata = {
  pinyin: string
  partsOfSpeech: string[]
  lexicalSource: '萌典 · 教育部国语辞典'
}

const moePartOfSpeech: Record<string, string> = {
  名: '名词', 動: '动词', 动: '动词', 形: '形容词',
  副: '副词', 代: '代词', 介: '介词', 連: '连词', 连: '连词',
  助: '助词', 嘆: '叹词', 叹: '叹词', 量: '量词',
  數: '数词', 数: '数词', 冠: '冠词', 擬: '拟声词',
}

export function eligibleChineseWord(text: string): boolean {
  const word = text.normalize('NFKC').trim()
  // Never request a single-word lexical record for long sentences.
  return [...word].length >= 1 && [...word].length <= 4 && /^[\u3400-\u9fff]+$/u.test(word)
}

export function parseMoedictWord(data: unknown, requestedWord: string): ChineseWordMetadata | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const result = data as Record<string, unknown>
  // Reject approximate/related entries. Never attach unrelated tone or POS.
  if (result.title !== requestedWord || !Array.isArray(result.heteronyms)) return null
  const first = result.heteronyms.find(h => {
    if (!h || typeof h !== 'object') return false
    const item = h as Record<string, unknown>
    return (typeof item.pinyin === 'string' && item.pinyin.trim())
      || (typeof item.bopomofo2 === 'string' && item.bopomofo2.trim())
  }) as Record<string, unknown> | undefined
  if (!first) return null
  const raw = typeof first.pinyin === 'string' ? first.pinyin
    : typeof first.bopomofo2 === 'string' ? first.bopomofo2 : ''
  // Limit length and accepted characters in remote content.
  const pinyin = raw.normalize('NFC').trim().replace(/\s+/g, ' ').slice(0, 80)
  if (!pinyin || !/^[\p{Script=Latin}\p{Mark}\süÜêÊ0-9'-]+$/u.test(pinyin)) return null
  const defs = Array.isArray(first.definitions) ? first.definitions : []
  const parts = [...new Set(defs.flatMap(def => {
    if (!def || typeof def !== 'object') return []
    const pos = (def as Record<string, unknown>).type
    if (typeof pos !== 'string') return []
    return [moePartOfSpeech[pos.trim()]].filter((x): x is string => !!x)
  }))].slice(0, 6)
  return { pinyin, partsOfSpeech: parts, lexicalSource: '萌典 · 教育部国语辞典' }
}

export async function fetchChineseWordMetadata(
  text: string, fetcher: typeof fetch = fetch,
): Promise<ChineseWordMetadata | null> {
  if (!eligibleChineseWord(text)) return null
  const url = 'https://www.moedict.tw/raw/' + encodeURIComponent(text) + '.json'
  try {
    const response = await fetcher(url, {
      headers: { accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(3500),
    })
    if (!response.ok) return null
    const data = await response.json() as unknown
    return parseMoedictWord(data, text)
  } catch {
    // The normal multilingual translator and the local basic guide still work.
    return null
  }
}
