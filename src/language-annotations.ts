// Only annotate exact sentence spans. Stored expansion rows are never trusted as
// standalone explanations because old cards may contain unrelated entries.
export type LanguageHighlight = {
  start: number; end: number; type: 'vocabulary' | 'grammar'
  term: string; meaning: string; explanation: string
}
export type LanguageExpansion = Pick<LanguageHighlight, 'term' | 'meaning' | 'explanation'>
export type AnnotatedSentence = { language: 'ja' | 'en'; term: string; highlight_json?: string }
export type SentencePart = { text: string; type: string; detail: string }
type Note = { meaning: string; explanation: string }
type Rule = { language: 'ja' | 'en'; pattern: RegExp; meaning: string; explanation: string }

const WORDS: Record<string, Note> = {
  'そいつ': { meaning: '那个家伙／那个东西', explanation: '随意的指示代词，指语境中提到的人或物；对人使用有时显得不礼貌。' },
  '使い方': { meaning: '使用方法', explanation: '「使う」的ます形词干「使い」＋「方」，表示使用某物的方法。' },
  '分からない': { meaning: '不知道／不明白', explanation: '「分かる」的否定形，本句指不知道使用方法。' },
  '旅行': { meaning: '旅行／旅游', explanation: '指外出旅行。' },
  'もう一度': { meaning: '再一次', explanation: '用于请求重复动作或说明。' },
  '確認': { meaning: '确认／核实', explanation: '职场常用词，常见搭配是「内容を確認する」。' },
  '連絡': { meaning: '联系', explanation: '职场中常见于「ご連絡します」。' },
  '相談': { meaning: '商量／咨询', explanation: '表示征求意见或讨论问题。' },
  '資料': { meaning: '资料／文件', explanation: '指文档或参考资料。' },
  '会議': { meaning: '会议', explanation: '如「会議に参加する」。' },
  '予定': { meaning: '日程／安排', explanation: '表示计划好的时间安排。' },
  '仕事': { meaning: '工作', explanation: '可以表示职业或工作内容。' },
  '会社': { meaning: '公司', explanation: '指企业或所属公司。' },
  'すみません': { meaning: '不好意思／对不起', explanation: '用于道歉、搭话或致谢。' },
  '大丈夫': { meaning: '没关系／没问题', explanation: '根据语境表示许可或状态良好。' },
  'ありがとうございます': { meaning: '非常感谢', explanation: '日语礼貌的致谢表达。' },
  'could you': { meaning: '能否请你……', explanation: '礼貌请求的常用开头。' },
  'would you': { meaning: '你愿意／能否……', explanation: '用于礼貌请求。' },
  'one more time': { meaning: '再一次', explanation: '用于请求对方重复内容。' },
  'get back to you': { meaning: '稍后回复你', explanation: '常见职场口语。' },
  'check': { meaning: '检查／核实', explanation: '用于核对信息或细节。' },
  'confirm': { meaning: '确认', explanation: '用于确认内容、安排或结果。' },
  'schedule': { meaning: '日程／安排', explanation: '可作名词或动词。' },
}

const GRAMMAR: Rule[] = [
  { language: 'ja', pattern: /(?:んだ|んです|のだ|のです)(?=[。！？!?…]*$)/g, meaning: '说明／解释语气', explanation: '「のだ／のです」用于解释情况，「んだ」是口语形式。' },
  { language: 'ja', pattern: /ていただけますか|でいただけますか/g, meaning: '能否请您……', explanation: '动词て形＋いただけますか，礼貌地提出请求。' },
  { language: 'ja', pattern: /てください/g, meaning: '请……', explanation: '动词て形＋ください，表示礼貌请求。' },
  { language: 'ja', pattern: /てから/g, meaning: '……之后', explanation: '表示先完成前项动作再做后项动作。' },
  { language: 'ja', pattern: /なければなりません|なければならない/g, meaning: '必须……', explanation: '表达义务或必要性。' },
  { language: 'ja', pattern: /てもいいですか|てもいいです/g, meaning: '可以……吗', explanation: '表示征求许可或允许。' },
  { language: 'ja', pattern: /と思います/g, meaning: '我认为……', explanation: '表达意见或判断。' },
  { language: 'ja', pattern: /までに/g, meaning: '在……之前', explanation: '表示截止时间。' },
  { language: 'en', pattern: /\bcould you\b/gi, meaning: '礼貌请求句型', explanation: 'Could you 后接动词原形，表达礼貌请求。' },
  { language: 'en', pattern: /\bwould you\b/gi, meaning: '礼貌请求句型', explanation: 'Would you 后接动词原形，表达礼貌请求。' },
  { language: 'en', pattern: /\bwould like to\b/gi, meaning: '礼貌表达意愿', explanation: '比 want to 更委婉。' },
  { language: 'en', pattern: /\bhave to\b/gi, meaning: '必须……', explanation: '表示义务或必要性。' },
  { language: 'en', pattern: /\bneed to\b/gi, meaning: '需要……', explanation: '表示做某事的必要性。' },
  { language: 'en', pattern: /\bused to\b/gi, meaning: '过去常常……', explanation: '指过去的习惯或状态。' },
  { language: 'en', pattern: /\bthere (?:is|are)\b/gi, meaning: '存在句', explanation: '表示某处存在某人或某物。' },
]

const PARTICLES: Record<string, Note> = {
  'の': { meaning: '连接名词／所属', explanation: '连接两个名词，前一名词修饰或限定后一名词。' },
  'が': { meaning: '主语／描述对象', explanation: '标记句中被描述或成为关注点的对象；具体要结合后面的谓语理解。' },
  'は': { meaning: '主题', explanation: '提示谈话的主题，后面说明主题相关的信息。' },
  'を': { meaning: '动作对象', explanation: '标记动词作用的对象。' },
  'に': { meaning: '时间／目标／对象', explanation: '需结合后面的动词判断具体作用。' },
  'で': { meaning: '动作地点／手段', explanation: '标记动作地点或手段。' },
  'へ': { meaning: '方向', explanation: '表示移动的方向或目的地。' },
  'と': { meaning: '引用／共同对象', explanation: '表示引用或共同参与者，依语境判断。' },
  'から': { meaning: '起点／原因', explanation: '作为独立助词时表示起点或原因。' },
  'まで': { meaning: '终点／范围', explanation: '表示时间、空间或数量的终点。' },
}

function japaneseBoundaries(sentence: string): Set<number> {
  const result = new Set<number>([0, sentence.length])
  if (typeof Intl.Segmenter === 'function') {
    for (const part of new Intl.Segmenter('ja', { granularity: 'word' }).segment(sentence)) {
      result.add(part.index)
      result.add(part.index + part.segment.length)
    }
  }
  return result
}

function validBoundary(card: AnnotatedSentence, start: number, end: number, kind: 'vocabulary' | 'grammar', boundaries: Set<number>): boolean {
  const term = card.term.slice(start, end)
  if (card.language === 'en') return !/[A-Za-z]/.test(card.term[start - 1] || '') && !/[A-Za-z]/.test(card.term[end] || '')
  if (!boundaries.has(start) || !boundaries.has(end)) return false
  // 分からない consists of 分 / から / ない in Japanese word segmenters;
  // から here is part of a verb, NOT an independent causal particle.
  if (kind === 'grammar' && term === 'から' && /(?:分|判|解)$/.test(card.term.slice(0, start)) && /^(?:ない|なかった|ず)/.test(card.term.slice(end))) return false
  if (kind === 'vocabulary' && /^(?:です|ます|でした|ました|ください|の|が|は|を|に|で|へ|と)$/.test(term)) return false
  return true
}

function normalize(card: AnnotatedSentence, value: unknown, boundaries: Set<number>): LanguageHighlight | null {
  if (!value || typeof value !== 'object') return null
  const hit = value as Partial<LanguageHighlight>
  if (typeof hit.start !== 'number' || typeof hit.end !== 'number' ||
      !Number.isInteger(hit.start) || !Number.isInteger(hit.end)) return null
  const start = hit.start as number
  const end = hit.end as number
  if (start < 0 || end <= start || end > card.term.length ||
      (hit.type !== 'vocabulary' && hit.type !== 'grammar') ||
      typeof hit.term !== 'string' || hit.term !== card.term.slice(start, end) ||
      !validBoundary(card, start, end, hit.type, boundaries) ||
      typeof hit.meaning !== 'string' || !hit.meaning.trim() ||
      typeof hit.explanation !== 'string' || !hit.explanation.trim()) return null
  if (card.language === 'ja' && hit.type === 'grammar' && PARTICLES[hit.term]) {
    const note = PARTICLES[hit.term]
    if (hit.term === 'が' && /^分からない/.test(card.term.slice(end))) {
      return { start, end, term: hit.term, type: hit.type,
        meaning: '不知道的内容', explanation: '「～が分からない」表示不知道／不明白某事。本句「使い方が分からない」就是不知道使用方法。' }
    }
    if (hit.term === 'の' && typeof Intl.Segmenter === 'function') {
      const tokens = [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(card.term)]
      const previous = tokens.find(token => token.index + token.segment.length === start)
      const next = tokens.find(token => token.index === end)
      if (previous && next) {
        return { start, end, term: hit.term, type: hit.type, meaning: note.meaning,
          explanation: '「' + previous.segment + 'の' + next.segment + '」中，前面的名词限定后面的名词，表示所属、内容或性质。' }
      }
    }
    return { start, end, term: hit.term, type: hit.type, ...note }
  }
  return { start, end, term: hit.term, type: hit.type, meaning: hit.meaning, explanation: hit.explanation }
}

function fallback(card: AnnotatedSentence, boundaries: Set<number>): LanguageHighlight[] {
  const found: LanguageHighlight[] = []
  for (const rule of GRAMMAR) {
    if (rule.language !== card.language) continue
    for (const match of card.term.matchAll(rule.pattern)) {
      const start = match.index
      const end = start + match[0].length
      if (validBoundary(card, start, end, 'grammar', boundaries)) {
        found.push({ start, end, term: match[0], type: 'grammar', meaning: rule.meaning, explanation: rule.explanation })
      }
    }
  }
  for (const [term, note] of Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)) {
    if ((card.language === 'ja') !== /[^\x00-\x7F]/.test(term)) continue
    const pattern = new RegExp(term, card.language === 'en' ? 'gi' : 'g')
    for (const match of card.term.matchAll(pattern)) {
      const start = match.index
      const end = start + match[0].length
      if (validBoundary(card, start, end, 'vocabulary', boundaries)) {
        found.push({ start, end, type: 'vocabulary', term: match[0], ...note })
      }
    }
  }
  return found
}

export function getLanguageHighlights(card: AnnotatedSentence | null): LanguageHighlight[] {
  if (!card) return []
  const boundaries = japaneseBoundaries(card.term)
  let stored: unknown[] = []
  try {
    const value: unknown = JSON.parse(card.highlight_json || '[]')
    if (Array.isArray(value)) stored = value
  } catch { /* Legacy damaged JSON is ignored. */ }
  const validated = stored.map(value => normalize(card, value, boundaries)).filter((hit): hit is LanguageHighlight => hit !== null)
  const found: LanguageHighlight[] = []
  // Prefer verified dataset annotations, then add non-overlapping grammar/lexicon notes.
  for (const hit of [...validated, ...fallback(card, boundaries)]) {
    if (found.filter(entry => entry.type === hit.type).length >= 4) continue
    if (found.some(entry => hit.start < entry.end && hit.end > entry.start)) continue
    found.push(hit)
    if (found.length >= 8) break
  }
  return found.sort((a, b) => a.start - b.start || b.end - a.end)
}

export function getLanguageExpansions(card: AnnotatedSentence | null, type: 'vocabulary' | 'grammar'): LanguageExpansion[] {
  const seen = new Set<string>()
  // Every explanation must correspond to an actually highlighted, validated span.
  return getLanguageHighlights(card).filter(hit => hit.type === type).filter(hit => {
    const key = hit.term.toLocaleLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map(({ term, meaning, explanation }) => ({ term, meaning, explanation }))
}

export function getSentenceParts(card: AnnotatedSentence | null): SentencePart[] {
  if (!card) return []
  const parts: SentencePart[] = []
  let cursor = 0
  for (const item of getLanguageHighlights(card)) {
    if (item.start < cursor) continue
    if (item.start > cursor) parts.push({ text: card.term.slice(cursor, item.start), type: '', detail: '' })
    parts.push({ text: card.term.slice(item.start, item.end), type: item.type, detail: [item.term, item.meaning, item.explanation].join(' · ') })
    cursor = item.end
  }
  if (cursor < card.term.length) parts.push({ text: card.term.slice(cursor), type: '', detail: '' })
  return parts.length ? parts : [{ text: card.term, type: '', detail: '' }]
}
