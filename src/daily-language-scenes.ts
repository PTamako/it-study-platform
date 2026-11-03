/** Pure, stable daily selection over the existing static sentence corpus.
 * Nothing is saved to D1: completion and review reuse existing card IDs.
 */
export type DailySceneCard = { id: string; language: 'ja' | 'en'; category: string; term: string }
export type DailyScene = { category: '日常句子' | '职场语言'; card: DailySceneCard | null }

function stableHash(input: string): number {
  // Deterministic 32-bit FNV-1a hash; avoids random reshuffling during reactivity.
  let hash = 2166136261
  for (const character of input) {
    hash ^= character.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function selectDailyScenes<T extends DailySceneCard>(
  cards: readonly T[],
  studyDate: string,
  language: 'ja' | 'en',
): Array<{ category: DailyScene['category']; card: T | null }> {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(studyDate) ? studyDate : '1970-01-01'
  return (['日常句子', '职场语言'] as const).map(category => {
    const pool = cards.filter(card => card.language === language && card.category === category)
    if (!pool.length) return { category, card: null }
    const ready = pool.filter(card => [...card.term].length >= (language === 'ja' ? 18 : 40))
    // Keep the same selection for every session on the same day. Stable IDs
    // guarantee existing review/mastery state is used, not a parallel system.
    const candidates = (ready.length ? ready : pool).slice().sort((a, b) => a.id.localeCompare(b.id))
    const index = stableHash([day, language, category].join('|')) % candidates.length
    return { category, card: candidates[index] }
  })
}
