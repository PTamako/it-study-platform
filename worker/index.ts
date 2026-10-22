export interface Env {
  DB: D1Database
  APP_ENV?: string
}

// 统一返回 JSON，并添加基础安全响应头。
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })

type DictionaryApiEntry = {
  term: string
  reading?: string
  phonetic?: string
  en: string
  zh: string
  tag: string
  example?: string
  language?: 'ja' | 'en' | 'zh'
  source?: string
  translationJa?: string
  technical?: boolean
}

type LooseRecord = Record<string, any>

// MyMemory 优先；失败时尝试 Google 网页翻译端点。后者并非正式稳定 API，只作尽力回退。
async function translateText(text: string, source: string, target: string): Promise<string> {
  try {
    const url = new URL('https://api.mymemory.translated.net/get')
    url.searchParams.set('q', text)
    url.searchParams.set('langpair', source + '|' + target)
    const response = await fetch(url.toString(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4000) })
    if (response.ok) {
      const data = await response.json() as { responseData?: { translatedText?: string }; responseStatus?: number }
      const translated = data.responseData?.translatedText?.trim() || ''
      if ((!data.responseStatus || data.responseStatus < 400) && translated && !/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) return translated
    }
  } catch { /* try fallback provider */ }
  try {
    const url = new URL('https://translate.googleapis.com/translate_a/single')
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', source)
    url.searchParams.set('tl', target)
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', text)
    const response = await fetch(url.toString(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return ''
    const payload = await response.json() as unknown
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return ''
    const segments = payload[0] as unknown[]
    return segments.map(segment => Array.isArray(segment) ? String(segment[0] || '') : '').join('').trim()
  } catch {
    return ''
  }
}
// Jisho 提供日语词条、假名读音和英语释义；其接口是公开接口，可能偶尔不可用。
async function searchJisho(keyword: string): Promise<LooseRecord[]> {
  if (!keyword.trim()) return []
  try {
    const url = new URL('https://jisho.org/api/v1/search/words')
    url.searchParams.set('keyword', keyword)
    const response = await fetch(url.toString(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return []
    const data = await response.json() as { data?: LooseRecord[] }
    return Array.isArray(data.data) ? data.data.slice(0, 8) : []
  } catch {
    return []
  }
}

async function searchEnglishDictionary(keyword: string): Promise<LooseRecord[]> {
  if (!/^[a-zA-Z][a-zA-Z '\u2019-]{0,79}$/.test(keyword)) return []
  try {
    const url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(keyword)
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return []
    const data = await response.json() as LooseRecord[]
    return Array.isArray(data) ? data.slice(0, 2) : []
  } catch {
    return []
  }
}

function jishoEntries(rows: LooseRecord[], zh: string): DictionaryApiEntry[] {
  return rows.map((row) => {
    const jp = (Array.isArray(row.japanese) ? row.japanese[0] : {}) as LooseRecord
    const senses = (Array.isArray(row.senses) ? row.senses : []) as LooseRecord[]
    const definitions = senses.slice(0, 3)
      .map((sense) => Array.isArray(sense.english_definitions) ? sense.english_definitions.slice(0, 4).join(', ') : '')
      .filter(Boolean)
    const parts = senses.flatMap((sense) => Array.isArray(sense.parts_of_speech) ? sense.parts_of_speech : [])
    const term = String(jp.word || jp.reading || row.slug || '')
    return {
      term,
      reading: String(jp.reading || ''),
      en: definitions.join('；') || '暂未获得英语释义',
      zh: zh ? '中文参考：' + zh : '中文释义暂未获得，可参考英语释义。',
      tag: parts[0] ? '日英词典 · ' + String(parts[0]) : '日英词典',
      language: 'ja',
      source: 'Jisho',
    }
  }).filter((entry) => Boolean(entry.term && entry.en))
}

function englishDictionaryEntries(rows: LooseRecord[], zh: string, ja: string): DictionaryApiEntry[] {
  return rows.map((row) => {
    const meanings = (Array.isArray(row.meanings) ? row.meanings : []) as LooseRecord[]
    const definitions: string[] = []
    let partOfSpeech = ''
    let example = ''
    for (const meaning of meanings) {
      if (!partOfSpeech) partOfSpeech = String(meaning.partOfSpeech || '')
      const definitionRows = (Array.isArray(meaning.definitions) ? meaning.definitions : []) as LooseRecord[]
      for (const definition of definitionRows) {
        if (definitions.length < 4 && typeof definition.definition === 'string') definitions.push(definition.definition)
        if (!example && typeof definition.example === 'string') example = definition.example
      }
    }
    const phonetics = (Array.isArray(row.phonetics) ? row.phonetics : []) as LooseRecord[]
    const phonetic = String(row.phonetic || phonetics.find((item) => item.text)?.text || '')
    return {
      term: String(row.word || ''),
      phonetic,
      en: definitions.join('；') || '暂未获得详细英语释义',
      zh: zh || '中文翻译暂时不可用，请参考英语释义。',
      translationJa: ja || '',
      tag: partOfSpeech ? '英语词典 · ' + partOfSpeech : '英语词典',
      example,
      language: 'en',
      source: 'Free Dictionary',
      // 保留日语译文，作为额外学习提示；对应字段在卡片的中文释义中展示。
      ...(ja ? { reading: '日语：' + ja } : {}),
    }
  }).filter((entry) => Boolean(entry.term && entry.en))
}

async function searchTechnicalVocabulary(db: D1Database, query: string): Promise<DictionaryApiEntry[]> {
  const sql = `SELECT term, reading, meaning_zh, meaning_ja, meaning_en, example, source_module
    FROM vocabulary
    WHERE instr(lower(term), lower(?)) > 0
       OR instr(lower(COALESCE(reading, '')), lower(?)) > 0
       OR instr(lower(meaning_zh), lower(?)) > 0
       OR instr(lower(meaning_ja), lower(?)) > 0
       OR instr(lower(meaning_en), lower(?)) > 0
    ORDER BY CASE WHEN lower(term) = lower(?) THEN 0 ELSE 1 END, term
    LIMIT 8`
  const { results } = await db.prepare(sql).bind(query, query, query, query, query, query).all()
  return results.map((row: Record<string, unknown>) => ({
    term: String(row.term || ''),
    reading: String(row.reading || ''),
    en: String(row.meaning_en || ''),
    zh: String(row.meaning_zh || ''),
    translationJa: String(row.meaning_ja || ''),
    tag: 'IT 术语 · ' + String(row.source_module || '专业词汇'),
    language: 'ja' as const,
    source: '知学 IT 术语库（D1）',
    example: String(row.example || ''),
    technical: true,
  })).filter(entry => Boolean(entry.term && (entry.zh || entry.en || entry.translationJa)))
}

async function lookupDictionary(query: string, requestedLanguage: 'auto' | 'ja' | 'en' | 'zh' = 'auto', db?: D1Database): Promise<DictionaryApiEntry[]> {
  if (db) {
    try {
      const technicalItems = await searchTechnicalVocabulary(db, query)
      if (technicalItems.length) return technicalItems
    } catch {
      // If the glossary migration is pending, continue with online providers.
    }
  }
  const hasKana = /[\u3040-\u30ff]/.test(query)
  const hasCjk = /[\u3400-\u9fff]/.test(query)
  const language: 'ja' | 'en' | 'zh' = requestedLanguage === 'auto' ? (hasKana ? 'ja' : hasCjk ? 'zh' : 'en') : requestedLanguage
  let zh = ''
  let ja = ''
  let en = ''

  if (language === 'ja') {
    ;[zh, en] = await Promise.all([
      translateText(query, 'ja', 'zh-CN'),
      translateText(query, 'ja', 'en'),
    ])
  } else if (language === 'en') {
    ;[zh, ja] = await Promise.all([
      translateText(query, 'en', 'zh-CN'),
      translateText(query, 'en', 'ja'),
    ])
  } else {
    ;[ja, en] = await Promise.all([
      translateText(query, 'zh-CN', 'ja'),
      translateText(query, 'zh-CN', 'en'),
    ])
  }

  const jishoKeyword = language === 'zh' ? ja : query
  const [jishoRows, englishRows] = await Promise.all([
    (language === 'ja' || language === 'zh') && jishoKeyword ? searchJisho(jishoKeyword) : Promise.resolve([]),
    language === 'en' ? searchEnglishDictionary(query) : Promise.resolve([]),
  ])

  const items: DictionaryApiEntry[] = []
  if (language === 'en') items.push(...englishDictionaryEntries(englishRows, zh, ja))

  // Han-only input may be Chinese or Japanese kanji. We include translation and
  // Jisho results together so either use case can still return useful matches.
  if (language === 'zh' && (ja || en)) {
    items.push({
      term: query,
      en: en || '英语翻译暂时不可用',
      zh: query,
      translationJa: ja || '',
      tag: '中日英互译',
      language: 'zh',
      source: '在线翻译',
    })
  }

  if (language === 'ja' || language === 'zh') items.push(...jishoEntries(jishoRows, zh))

  if (language === 'ja' && !items.length && (zh || en)) {
    items.push({ term: query, en: en || '暂无英语翻译', zh: zh || '暂无中文翻译', tag: '日中英翻译', language: 'ja', source: '在线翻译' })
  }
  if (language === 'en' && !items.length && (zh || ja)) {
    items.push({ term: query, en: '暂未找到详细英语词典释义', zh: zh || '中文翻译暂时不可用', translationJa: ja || '', tag: '英日中翻译', language: 'en', source: '在线翻译' })
  }

  const seen = new Set<string>()
  return items.filter((item) => {
    const key = (item.term + '|' + item.en).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // 初始版本只提供只读接口；未开放写入，减少误操作与安全风险。
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'allow': 'GET, OPTIONS' } })
    }
    if (request.method !== 'GET') return json({ error: '不支持此请求方法' }, 405)

    // 健康检查同时检查 D1 是否能正常查询。
    if (url.pathname === '/api/health') {
      try {
        await env.DB.prepare('SELECT 1 AS ok').first()
        return json({ ok: true, service: 'it-study-platform', database: '已连接' })
      } catch {
        return json({ ok: false, service: 'it-study-platform', database: '暂不可用' }, 503)
      }
    }

    // 返回已启用的学习模块；数据库迁移完成后才可使用。
    if (url.pathname === '/api/tracks') {
      try {
        const { results } = await env.DB.prepare(
          `SELECT st.id, st.kind, st.title, st.subtitle,
                  (SELECT COUNT(*) FROM questions q WHERE q.track_id = st.id) AS question_count
           FROM study_tracks st
           WHERE st.enabled = 1
           ORDER BY st.kind, st.title`,
        ).all()
        return json({ items: results })
      } catch {
        return json({ error: '数据库尚未初始化，请先执行 D1 迁移。' }, 503)
      }
    }


    // 通用日中英词典：可查普通单词、日常用语和 IT 专业术语，不局限于 D1 内置词条。
    if (url.pathname === '/api/dictionary') {
      const query = (url.searchParams.get('q') || '').trim()
      if (!query) return json({ items: [], error: '请提供要查询的词语。' }, 400)
      if (query.length > 100) return json({ items: [], error: '查询内容不能超过 100 个字符。' }, 400)
      const requestedLanguage = url.searchParams.get('lang') || 'auto'
      if (!['auto', 'ja', 'en', 'zh'].includes(requestedLanguage)) {
        return json({ items: [], error: 'lang 参数只支持 auto、ja、en、zh。' }, 400)
      }
      try {
        const items = await lookupDictionary(query, requestedLanguage as 'auto' | 'ja' | 'en' | 'zh', env.DB)
        return json({
          items,
          query,
          providers: items.some(item => item.technical)
            ? ['知学 IT 术语库（D1）']
            : ['Free Dictionary', 'Jisho', 'MyMemory', 'Google Translate（备用）'],
          note: items.some(item => item.technical)
            ? '优先显示专业词汇库中匹配的术语及中日英释义。'
            : '普通词汇使用在线词典与机器翻译；第三方服务可能限流，所有译文仅供学习参考。',
        })
      } catch {
        return json({ items: [], error: '在线词典暂时不可用，请稍后重试。' }, 503)
      }
    }

    // 返回指定考试的练习题。source_type 会明确标记自编练习题，不冒充官方真题。
    if (url.pathname === '/api/questions') {
      const trackId = url.searchParams.get('track') || 'exam-sg'
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)))
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, track_id, topic, difficulty, question_type, prompt,
                  options_json, answer_json, explanation, source_type, source_reference, language
           FROM questions WHERE track_id = ? ORDER BY id LIMIT ?`,
        ).bind(trackId, limit).all()
        return json({
          items: results.map((row: Record<string, unknown>) => ({
            ...row,
            options: JSON.parse(String(row.options_json || '[]')),
            answer: JSON.parse(String(row.answer_json || 'null')),
            options_json: undefined,
            answer_json: undefined,
          })),
        })
      } catch {
        return json({ error: '题库暂不可用，请确认已执行最新的 D1 迁移。' }, 503)
      }
    }

    // 学习记录写入接口暂不开放；完成 Cloudflare Access 访问保护后再启用。

    return json({ error: '未找到对应接口' }, 404)
  },
}
