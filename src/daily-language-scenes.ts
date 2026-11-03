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

// Hand-picked workplace/TOEIC-style headwords. Only the *headwords* are curated:
// definitions, parts of speech and pronunciations must come from the licensed
// static ECDICT lookup. Never pretend this is an official ETS/TOEIC vocabulary list.
const BUSINESS_HEADWORDS = [
  'confirm', 'schedule', 'project', 'report', 'employee', 'customer',
  'purchase', 'payment', 'budget', 'meeting', 'department', 'contract',
  'request', 'provide', 'receive', 'submit', 'approve', 'available',
  'update', 'review', 'deadline', 'shipment', 'invoice', 'agreement',
  'appointment', 'policy', 'procedure', 'facility', 'training', 'equipment',
  'management', 'information', 'document', 'application', 'service', 'account',
  'order', 'delivery', 'contact', 'support', 'business', 'manager',
  'office', 'team', 'notice', 'required', 'supply', 'quality', 'issue',
  'result', 'plan', 'conference', 'reservation', 'reception', 'position',
] as const

export function dailyBusinessWordCandidates(studyDate: string): string[] {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(studyDate) ? studyDate : '1970-01-01'
  const offset = stableHash('business-words|' + day) % BUSINESS_HEADWORDS.length
  return [...BUSINESS_HEADWORDS.slice(offset), ...BUSINESS_HEADWORDS.slice(0, offset)]
}

/** Source candidates only: actual meanings/readings/examples are displayed
 * from the licensed static Japanese learner lexicon, never invented here.
 */
const JAPANESE_HEADWORDS = [
  '確認', '対応', '相談', '連絡', '準備', '予定', '仕事', '報告',
  '説明', '状況', '問題', '原因', '修正', '変更', '改善', '提案',
  '担当', '判断', '方法', '必要', '大切', '期限', '予約', '出発',
  '到着', '交通', '支払', '費用', '時間', '開始', '終了', '参加',
  '共有', '情報', '安全', '管理', '作業', '結果', '条件', '内容',
  '確認する', '検討', '意見', '手続き', '申請', '提出', '依頼',
  '承認', '予算', '失敗', '成功', '連休', '利用', '追加', '削除',
  '更新', '昨日', '明日', '今日', '使用', '比較', '注意',
  '到達', '影響', '納期', '調整', '報告する', '連絡する',
] as const

export function dailyJapaneseWordCandidates(studyDate: string): string[] {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(studyDate) ? studyDate : '1970-01-01'
  const offset = stableHash('japanese-headwords|' + day) % JAPANESE_HEADWORDS.length
  return [...JAPANESE_HEADWORDS.slice(offset), ...JAPANESE_HEADWORDS.slice(0, offset)]
}
