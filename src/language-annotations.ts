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
  '代わりに': { meaning: '代替／代劳', explanation: '表示替代、代替某人做事，不能把「に」单独解成目的地。' },
  'a bit': { meaning: '稍微／有点', explanation: '修饰形容词或副词，表示程度，不是冠词加名词。' },
  'customer service representative': { meaning: '客服代表', explanation: '完整复合名词，指负责回应顾客的客服人员。' },
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
  'take a dump': { meaning: '大便／上厕所', explanation: '口语且较粗俗，须整体理解。' },
  'make a phone call': { meaning: '打电话', explanation: '固定搭配，不按 make 的“制造”义拆开。' },
  'leave a message': { meaning: '留言', explanation: '固定搭配，不按 leave 的“离开”义拆开。' },
  'play it by ear': { meaning: '见机行事', explanation: '根据具体情况临时决定。' },
  'a lot of': { meaning: '很多／大量', explanation: '数量短语，修饰后面的名词。' },
  'would you like to': { meaning: '您想／愿意……吗', explanation: '征询意愿或发出邀请。' },
  'would like to': { meaning: '想要／希望……', explanation: '用于客气地表达意愿。' },
  'post office': { meaning: '邮局', explanation: '完整复合名词，不能把 post 单独译成职位。' },
  'close by': { meaning: '在附近', explanation: '固定副词短语，不表示关闭。' },
  'よくない': { meaning: '不好／不合适', explanation: '「よい」的否定，不是“经常”。' },
}

const GRAMMAR: Rule[] = [
  { language: 'ja', pattern: /ようにお願いします/g, meaning: '恳请……／希望……', explanation: '整句请求表达，不将末尾「に」误读为目标或时间。' },
  { language: 'ja', pattern: /(?:んだ|んです|(?<!も)のだ|(?<!も)のです)(?=[。！？!?…]*$)/g, meaning: '说明／解释语气', explanation: '「のだ／のです」用于解释情况，「んだ」是口语形式。' },
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
  { language: 'en', pattern: /\b(?:don't|doesn't|didn't|do not|does not|did not)\s+(?:have|need)\s+to\b/gi,
    meaning: '不必／不需要', explanation: '否定必要性：不必做某事，不等于 must not 所表达的禁止。' },
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
  const before = card.term.slice(0, start)
  const after = card.term.slice(end)
  if (card.language === 'en') {
    const token = term.toLowerCase()
    if (/^(?:you|we|they|he|she|i) would$/.test(token) && /^\s+like\s+to\b/i.test(after)) return false
    if (token === 'like' && /\b(?:eat|eats|eating|ate|run|runs|ran|looks?|behaves?|acts?)\s+$/i.test(before) &&
        /^\s+(?:a|an|the)\s+\w+/i.test(after)) return false
    if (kind === 'grammar' && (
      /^a bit\s+(?:early|late|more|less|better|worse|faster|slower|longer|shorter)\b/i.test(term) ||
      (/^a bit$/i.test(term) && /^\s+(?:early|late|more|less|better|worse|faster|slower|longer|shorter)\b/i.test(after))
    )) return false
    if (kind === 'vocabulary' && token === 'a bit' && /^\s+of\b/i.test(after)) return false
    if (kind === 'grammar' && /^a customer$/i.test(term) && /^\s+service\s+representative\b/i.test(after)) return false
    if (token === 'meeting' && /\b(?:my|your|his|her|our|their)\s+$/i.test(before) &&
        /^\s+(?:him|her|them|me|us|you)\b/i.test(after)) return false
    if (token === 'that' && /\b(?:said|say|says|knew|know|think|thought|sorry|glad|certain|aware)\s+$/i.test(before)) return false
    if (token === 'close' && /^\s+by\b/i.test(after)) return false
    if (/^a post$/i.test(token) && /^\s+office\b/i.test(after)) return false
    if (token === 'leave' && /^\s+(?:him|her|me|us|them|you)\s+a\s+message\b/i.test(after)) return false
    if (token === 'a lot' && /^\s+of\b/i.test(after)) return false
    if (token === 'take' && /^\s+a\s+dump\b/i.test(after)) return false
    if (token === 'make' && /^\s+a\s+phone\s+call\b/i.test(after)) return false
    if (token === 'leave' && /^\s+a\s+message\b/i.test(after)) return false
    if (/^a lot(?: of)?(?:\s+\w+)*$/i.test(term) && kind === 'grammar') return false
    const prefix = card.term.slice(0, start)
    const suffix = card.term.slice(end)
    // These safeguards apply to vocabulary AND grammar: the authored seed
    // lists sometimes contain the same phrase under both categories.
    if (/^(?:would you|could you)$/i.test(term) && prefix.trim() &&
        !/[,!?。.]\s*$/.test(prefix)) return false
    if (/^have to$/i.test(term) && /\bwhat(?:'ll| will) you\s*$/i.test(prefix) &&
        /^\s*(?:drink|eat)\b/i.test(suffix)) return false
    if (/^need to$/i.test(term) && /\b(?:the|a)\s+$/i.test(prefix)) return false
    if (/^(?:have to|need to)$/i.test(term) &&
        /\b(?:don't|doesn't|didn't|do not|does not|did not)\s+$/i.test(prefix)) return false
    if (/^used$/i.test(term) &&
        /\b(?:am|is|are|was|were|be|been|being|get|gets|got|getting)(?:n't)?\s+(?:not\s+)?$/i.test(prefix) &&
        /^\s+to\b/i.test(suffix)) return false
    if (/^used to$/i.test(term) &&
        /\b(?:am|is|are|was|were|be|been|being|get|gets|got|getting)(?:n't)?\s+(?:not\s+)?$/i.test(prefix)) return false
    if (/^(?:I|you|we|they|he|she|it|this|that|there)\s+(?:have|has|had)$/i.test(term) &&
        /^\s+to\b/i.test(suffix)) return false
    if (/^who(?:\s+|$)/i.test(term) && prefix.trim() && !/[.?!]\s*$/.test(prefix))
      return false
    return !/[A-Za-z]/.test(card.term[start - 1] || '') && !/[A-Za-z]/.test(card.term[end] || '')
  }
  // A stale source highlight for 'ものだ' must not display 'のだ' as an
  // explanation marker in legacy D1 cards. The static generator also abstains.
  if (kind === 'grammar' && /^(?:のだ|のです)$/.test(term) && card.term[start - 1] === 'も') return false
  const prefix = card.term.slice(0, start)
  const suffix = card.term.slice(end)
  if (term === 'から' && /(?:分|判|解|わ)$/.test(prefix) && /^(?:ない|なかった|ず)/.test(suffix)) return false
  if (term === 'だけ' && /いた$/.test(prefix) && /^(?:る|ます|ません|ない|れ|た)/.test(suffix)) return false
  if (term === 'の' && /(?:こ|そ|あ|ど|ほん)$/.test(prefix)) return false
  if (term === 'と' && (/^(?:ても|き)/.test(suffix) || /こ$/.test(prefix))) return false
  if (term === 'に' && /(?:確か|本当|非常|特|実)$/.test(prefix)) return false
  if (term === 'に' && (prefix.endsWith('代わり') || (prefix.endsWith('よう') && /^お願いします/.test(suffix)))) return false
  if (term === 'で' && /いつ$/.test(prefix) && /^も/.test(suffix)) return false
  if (term === 'で' && (
    /^(?:きる|きない|きます|きました|きません|きた|きて|きれば)/.test(suffix) ||
    /[0-9０-９一二三四五六七八九十]+(?:歩|日|分|時間|週間|か月|ヶ月|年)$/.test(prefix) ||
    /(?:る|た|ない)上$/.test(prefix) ||
    (prefix.endsWith('天気予報') && /^は/.test(suffix))
  )) return false
  if (term === 'と' && prefix.endsWith('へ')) return false
  if (term === 'あれ' && /^ば/.test(suffix)) return false
  if (kind === 'vocabulary' && term === 'もの' && /^が言え/.test(after)) return false
  if (kind === 'vocabulary' && term === 'よく' && /^ない/.test(after)) return false
  if (term === 'の' && before.endsWith('も')) return false // もの is one word
  if (term === 'と' && before.endsWith('あ')) return false // あと is one word
  if (term === 'で' && /^(?:はない|はありません|はなかった)/.test(after)) return false
  if (!boundaries.has(start) || !boundaries.has(end)) return false
  // 分からない consists of 分 / から / ない in Japanese word segmenters;
  // から here is part of a verb, NOT an independent causal particle.
  if (kind === 'grammar' && term === 'から' && /(?:分|判|解)$/.test(card.term.slice(0, start)) && /^(?:ない|なかった|ず)/.test(card.term.slice(end))) return false
  if (kind === 'vocabulary' && /^(?:です|ます|でした|ました|ください|の|が|は|を|に|で|へ|と)$/.test(term)) return false
  return true
}

function normalizedOffsets(sentence: string, start: number, end: number, term: string): [number, number] | null {
  // Python's Tatoeba generator counts Unicode codepoints while JS string
  // offsets are UTF-16 code units. Convert when an astral symbol occurs first.
  const points = Array.from(sentence)
  // Dataset offsets are Python codepoint indexes: decode them first even if
  // an unrelated duplicate word happens to fit the raw UTF-16 offset.
  if (start >= 0 && end <= points.length && points.slice(start, end).join('') === term) {
    return [points.slice(0, start).join('').length, points.slice(0, end).join('').length]
  }
  // Some hand-written / legacy browser annotations already use UTF-16 offsets.
  return sentence.slice(start, end) === term ? [start, end] : null
}

function normalize(card: AnnotatedSentence, value: unknown, boundaries: Set<number>): LanguageHighlight | null {
  if (!value || typeof value !== 'object') return null
  const hit = value as Partial<LanguageHighlight>
  if (typeof hit.start !== 'number' || typeof hit.end !== 'number' ||
      !Number.isInteger(hit.start) || !Number.isInteger(hit.end)) return null
  const rawStart = hit.start as number
  const rawEnd = hit.end as number
  if (typeof hit.term !== 'string' || rawStart < 0 || rawEnd <= rawStart) return null
  const offsets = normalizedOffsets(card.term, rawStart, rawEnd, hit.term)
  if (!offsets) return null
  const [start, end] = offsets
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
        meaning: '不知道的内容', explanation: '「～が分からない」表示不知道或不明白前面提到的事情、方法或对象。' }
    }
    if (hit.term === 'の' && /^[。！？!?…]/.test(card.term.slice(end)) &&
        /(?:ない|した|った|[うくぐすつぬぶむるた])$/.test(card.term.slice(0, start))) {
      return { start, end, term: hit.term, type: hit.type,
        meaning: '句末说明／轻问语气',
        explanation: '句尾「の」用于说明或柔和提问，即使后面还有另一个句子，也不是名词所属。' }
    }
    if (hit.term === 'の' && typeof Intl.Segmenter === 'function') {
      const tokens = [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(card.term)]
      const previous = tokens.find(token => token.index + token.segment.length === start)
      const next = tokens.find(token => token.index === end)
      if (previous && next) {
        // 「食べるのが好き」: の nominalizes a clause, it is NOT a noun
        // possessive linker. Intl.Segmenter yields token boundaries, not POS,
        // so only label high-confidence predicate forms and otherwise abstain.
        const followedByCaseParticle = /^(?:が|は|を|も)$/.test(next.segment)
        const predicateLike = /(?:する|できる|して|した|なる|ない|かった|[うくぐすつぬぶむるた])$/.test(previous.segment)
        if (followedByCaseParticle && predicateLike) {
          return { start, end, term: hit.term, type: hit.type, meaning: '动作／状态名词化',
            explanation: '「' + previous.segment + 'の' + next.segment + '」中，「の」把前面的动作或情况作为一个整体，再由「' + next.segment + '」提示后续描述对象。' }
        }
        if (followedByCaseParticle) return null
        if (!next.isWordLike) return null
        return { start, end, term: hit.term, type: hit.type, meaning: note.meaning,
          explanation: '「' + previous.segment + 'の' + next.segment + '」中，前面的成分限定后面的词；这里不要仅靠表面字形断言前项词性。' }
      }
    }
    return { start, end, term: hit.term, type: hit.type, ...note }
  }
  // Older stored public annotations may have a valid span but a demonstrably
  // wrong lexical gloss. Never reuse that old gloss after updating the generator.
  if (card.language === 'en' && hit.type === 'vocabulary') {
    const key=hit.term.toLowerCase()
    if (key === 'sorry' && /^\s*[,!]/.test(card.term.slice(end))) {
      return {start,end,term:hit.term,type:hit.type,meaning:'抱歉／不好意思',explanation:'这里是道歉的感叹语。'}
    }
    if (key === 'like' && /\bwould(?:\s+you)?\s*$/i.test(card.term.slice(0,start))) {
      return {start,end,term:hit.term,type:hit.type,meaning:'想要／愿意',explanation:'Would you like ...? 用于邀请或征询意愿。'}
    }
  }
  return { start, end, term: hit.term, type: hit.type, meaning: hit.meaning, explanation: hit.explanation }
}

function fallback(card: AnnotatedSentence, boundaries: Set<number>): LanguageHighlight[] {
  const found: LanguageHighlight[] = []
  for (const rule of GRAMMAR) {
    if (rule.language !== card.language) continue
    for (const match of card.term.matchAll(rule.pattern)) {
      const start = match.index ?? -1
      if (start < 0) continue
      const end = start + match[0].length
      if (validBoundary(card, start, end, 'grammar', boundaries)) {
        found.push({ start, end, term: match[0], type: 'grammar', meaning: rule.meaning, explanation: rule.explanation })
      }
    }
  }
  if (card.language === 'en') {
    for (const match of card.term.matchAll(/\bleave\s+(?:him|her|me|us|them|you)\s+a\s+message\b/gi)) {
      const start=match.index ?? -1
      const end=start+match[0].length
      if (start >= 0 && validBoundary(card,start,end,'vocabulary',boundaries)) {
        found.push({start,end,type:'vocabulary',term:match[0],
          meaning:'给某人留言',explanation:'leave + 人 + a message，表示给某人留言。'})
      }
    }
  }
  for (const [term, note] of Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)) {
    if ((card.language === 'ja') !== /[^\x00-\x7F]/.test(term)) continue
    const pattern = new RegExp(term, card.language === 'en' ? 'gi' : 'g')
    for (const match of card.term.matchAll(pattern)) {
      const start = match.index ?? -1
      if (start < 0) continue
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
