// Sentence content and precomputed annotations are public licensed data.
// Fetch them from immutable static assets, never from the personal D1 database.
export type CorpusLanguage = 'ja' | 'en'
export type CorpusCard = { id: string; language: CorpusLanguage; term: string; highlight_json?: string }

type CorpusManifest = { version: number; ja: string; en: string }
const STATIC_DECK_URL = /^\/language-cards\/(?:ja|en)\.[a-f0-9]{16}\.json$/

export async function fetchLanguageCorpus<T extends CorpusCard>(
  language: CorpusLanguage,
  signal?: AbortSignal,
): Promise<T[]> {
  // The manifest is tiny and revalidated on each new app session. Fingerprinted
  // language JSON files are browser/PWA cacheable across visits and language switches.
  const manifestResponse = await fetch('/language-cards/manifest.json', { cache: 'no-cache', signal })
  if (!manifestResponse.ok) throw new Error('语言课程静态索引暂时不可用，请稍后重新打开应用。')
  const manifest = await manifestResponse.json() as CorpusManifest
  const assetPath = manifest?.[language]
  if (manifest?.version !== 1 || typeof assetPath !== 'string' ||
    !STATIC_DECK_URL.test(assetPath) || !assetPath.startsWith('/language-cards/' + language + '.')) {
    throw new Error('语言课程静态索引无效，请刷新应用。')
  }
  const response = await fetch(assetPath, { cache: 'force-cache', signal })
  if (!response.ok) throw new Error('语言课程静态内容暂时不可用，请稍后重试。')
  const data = await response.json() as { items?: T[] }
  if (!Array.isArray(data?.items) || data.items.length !== 5000 ||
    data.items.some(item => !item || item.language !== language || typeof item.id !== 'string' || typeof item.term !== 'string')) {
    throw new Error('语言课程内容不完整，请刷新应用。')
  }
  return data.items
}
