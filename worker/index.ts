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

// Offline fallback for common Chinese phrases. This keeps basic lookups useful when
// public translation endpoints time out or rate-limit the Worker.
const commonChineseTranslations: Record<string, { ja: string; en: string }> = {
  '你好': { ja: 'こんにちは', en: 'Hello' },
  '您好': { ja: 'こんにちは（丁寧）', en: 'Hello' },
  '大家好': { ja: '皆さん、こんにちは', en: 'Hello everyone' },
  '早上好': { ja: 'おはようございます', en: 'Good morning' },
  '晚上好': { ja: 'こんばんは', en: 'Good evening' },
  '晚安': { ja: 'おやすみなさい', en: 'Good night' },
  '谢谢': { ja: 'ありがとうございます', en: 'Thank you' },
  '非常感谢': { ja: 'どうもありがとうございます', en: 'Thank you very much' },
  '不客气': { ja: 'どういたしまして', en: "You're welcome" },
  '再见': { ja: 'さようなら', en: 'Goodbye' },
  '拜拜': { ja: 'バイバイ', en: 'Bye-bye' },
  '对不起': { ja: 'ごめんなさい', en: "I'm sorry" },
  '不好意思': { ja: 'すみません', en: 'Excuse me' },
  '没关系': { ja: '大丈夫です', en: "It's okay" },
  '请': { ja: 'お願いします', en: 'Please' },
  '请问': { ja: 'お尋ねします', en: 'May I ask' },
  '是': { ja: 'はい／です', en: 'Yes / be' },
  '不是': { ja: 'いいえ／ではありません', en: 'No / not be' },
  '我爱你': { ja: '愛しています', en: 'I love you' },
  '多少钱': { ja: 'いくらですか', en: 'How much is it?' },
  '厕所': { ja: 'トイレ', en: 'Restroom' },
  '帮助': { ja: '助け', en: 'Help' },
  '展开': { ja: '展開', en: 'Expand' },
  '收起': { ja: '折りたたむ', en: 'Collapse' },
  '保存': { ja: '保存', en: 'Save' },
  '取消': { ja: 'キャンセル', en: 'Cancel' },
  '确定': { ja: '確定；OK', en: 'Confirm; OK' },
  '删除': { ja: '削除', en: 'Delete' },
  '编辑': { ja: '編集', en: 'Edit' },
  '搜索': { ja: '検索', en: 'Search' },
  '设置': { ja: '設定', en: 'Settings' },
  '登录': { ja: 'ログイン', en: 'Log in' },
  '退出登录': { ja: 'ログアウト', en: 'Log out' },
  '加载中': { ja: '読み込み中', en: 'Loading' },
  '提交': { ja: '送信；提出', en: 'Submit' },
  '刷新': { ja: '更新；再読み込み', en: 'Refresh' },
  '上一步': { ja: '前へ', en: 'Previous' },
  '下一步': { ja: '次へ', en: 'Next' },
  '展开菜单': { ja: 'メニューを展開', en: 'Expand menu' },
  '展开详情': { ja: '詳細を展開', en: 'Expand details' },
}

// Small offline fallback for common Japanese and English lookups. Online providers remain
// the primary source; these entries prevent frequent everyday terms from losing translations.
const commonJapaneseTranslations: Record<string, { zh: string; en: string }> = {
  'こんにちは': { zh: '你好', en: 'Hello' },
  'おはようございます': { zh: '早上好', en: 'Good morning' },
  'こんばんは': { zh: '晚上好', en: 'Good evening' },
  'ありがとう': { zh: '谢谢', en: 'Thank you' },
  'ありがとうございます': { zh: '谢谢', en: 'Thank you' },
  'すみません': { zh: '不好意思；对不起', en: 'Excuse me; I am sorry' },
  'ごめんなさい': { zh: '对不起', en: "I'm sorry" },
  'さようなら': { zh: '再见', en: 'Goodbye' },
  '認証': { zh: '认证；身份验证', en: 'Authentication' },
  '認可': { zh: '授权', en: 'Authorization' },
  '暗号化': { zh: '加密', en: 'Encryption' },
  '復号': { zh: '解密', en: 'Decryption' },
  '脆弱性': { zh: '漏洞；脆弱性', en: 'Vulnerability' },
  '最小権限': { zh: '最小权限', en: 'Least privilege' },
  '情報セキュリティ': { zh: '信息安全', en: 'Information security' },
  '可用性': { zh: '可用性', en: 'Availability' },
  '完全性': { zh: '完整性', en: 'Integrity' },
  '機密性': { zh: '机密性', en: 'Confidentiality' },
}

const commonEnglishTranslations: Record<string, { zh: string; ja: string }> = {
  'hello': { zh: '你好', ja: 'こんにちは' },
  'good morning': { zh: '早上好', ja: 'おはようございます' },
  'good evening': { zh: '晚上好', ja: 'こんばんは' },
  'thank you': { zh: '谢谢', ja: 'ありがとうございます' },
  'goodbye': { zh: '再见', ja: 'さようなら' },
  'security': { zh: '安全；信息安全', ja: 'セキュリティ；情報セキュリティ' },
  'authentication': { zh: '认证；身份验证', ja: '認証' },
  'authorization': { zh: '授权', ja: '認可' },
  'encryption': { zh: '加密', ja: '暗号化' },
  'decryption': { zh: '解密', ja: '復号' },
  'vulnerability': { zh: '漏洞；脆弱性', ja: '脆弱性' },
  'integrity': { zh: '完整性', ja: '完全性' },
  'availability': { zh: '可用性', ja: '可用性' },
  'confidentiality': { zh: '机密性', ja: '機密性' },
  'least privilege': { zh: '最小权限原则', ja: '最小権限の原則' },
  'hash': { zh: '哈希；散列值', ja: 'ハッシュ' },
  'password': { zh: '密码', ja: 'パスワード' },
  'network': { zh: '网络', ja: 'ネットワーク' },
  'expand': { zh: '展开', ja: '展開' },
  'collapse': { zh: '收起；折叠', ja: '折りたたむ' },
  'save': { zh: '保存', ja: '保存' },
  'cancel': { zh: '取消', ja: 'キャンセル' },
  'confirm': { zh: '确认；确定', ja: '確認；確定' },
  'delete': { zh: '删除', ja: '削除' },
  'edit': { zh: '编辑', ja: '編集' },
  'search': { zh: '搜索', ja: '検索' },
  'settings': { zh: '设置', ja: '設定' },
  'login': { zh: '登录', ja: 'ログイン' },
  'logout': { zh: '退出登录', ja: 'ログアウト' },
  'loading': { zh: '加载中', ja: '読み込み中' },
  'submit': { zh: '提交', ja: '送信；提出' },
  'refresh': { zh: '刷新', ja: '更新；再読み込み' },
  'next': { zh: '下一步；下一个', ja: '次へ；次の' },
  'previous': { zh: '上一步；上一个', ja: '前へ；前の' },
}

// 两个在线翻译源并行尝试，避免 MyMemory 超时后才开始备用源；Google 端点是非正式接口，结果仅作参考。
// 在线翻译优先复用近期成功结果；上游短暂限流/超时时，已缓存词条仍可正常显示。
// 缓存键包含源语言、目标语言和原文，避免不同语言方向互相污染。
async function translateText(text: string, source: string, target: string): Promise<string> {
  const valid = (value: string) =>
    Boolean(value && value.trim() && !/MYMEMORY WARNING|QUERY LENGTH LIMIT|translation unavailable/i.test(value))
    && value.trim().toLocaleLowerCase() !== text.trim().toLocaleLowerCase()

  const cacheKey = new URL('https://translation-cache.it-study-platform.invalid/v1')
  cacheKey.searchParams.set('q', text)
  cacheKey.searchParams.set('sl', source)
  cacheKey.searchParams.set('tl', target)
  try {
    const cached = await caches.default.match(new Request(cacheKey.toString()))
    if (cached) {
      const data = await cached.json() as { translation?: string }
      if (valid(data.translation || '')) return data.translation!.trim()
    }
  } catch {
    // 缓存不是翻译请求的必要条件；缓存不可用时继续访问在线服务。
  }

  const myMemory = async (): Promise<string> => {
    try {
      const url = new URL('https://api.mymemory.translated.net/get')
      url.searchParams.set('q', text)
      url.searchParams.set('langpair', source + '|' + target)
      const response = await fetch(url.toString(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4500) })
      if (!response.ok) {
        console.warn('[translation] MyMemory HTTP error', { source, target, status: response.status })
        return ''
      }
      const data = await response.json() as { responseData?: { translatedText?: string }; responseStatus?: number; responseDetails?: string }
      const translated = data.responseData?.translatedText?.trim() || ''
      if (data.responseStatus && data.responseStatus >= 400) {
        console.warn('[translation] MyMemory API error', { source, target, apiStatus: data.responseStatus, reason: String(data.responseDetails || '').slice(0, 120) })
        return ''
      }
      if (!valid(translated)) {
        console.warn('[translation] MyMemory returned no usable translation', { source, target, apiStatus: data.responseStatus ?? null, hasText: Boolean(translated) })
        return ''
      }
      return translated
    } catch (error) {
      console.warn('[translation] MyMemory request failed', { source, target, message: error instanceof Error ? error.message : String(error) })
      return ''
    }
  }

  // Google 的 gtx 接口不是正式 SLA 服务；尝试两个可用主机，避免单一主机故障直接导致整条翻译链失败。
  const googleFallback = async (): Promise<string> => {
    for (const host of ['translate.googleapis.com', 'translate.google.com']) {
      try {
        const url = new URL('https://' + host + '/translate_a/single')
        url.searchParams.set('client', 'gtx')
        url.searchParams.set('sl', source)
        url.searchParams.set('tl', target)
        url.searchParams.set('dt', 't')
        url.searchParams.set('q', text)
        const response = await fetch(url.toString(), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4500) })
        if (!response.ok) {
          console.warn('[translation] Google HTTP error', { host, source, target, status: response.status })
          continue
        }
        const payload = await response.json() as unknown
        if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
          console.warn('[translation] Google returned an unexpected response shape', { host, source, target })
          continue
        }
        const segments = payload[0] as unknown[]
        const translated = segments.map(segment => Array.isArray(segment) ? String(segment[0] || '') : '').join('').trim()
        if (valid(translated)) return translated
        console.warn('[translation] Google returned no usable translation', { host, source, target, hasText: Boolean(translated) })
      } catch (error) {
        console.warn('[translation] Google fallback request failed', { host, source, target, message: error instanceof Error ? error.message : String(error) })
      }
    }
    return ''
  }

  const results = await Promise.all([myMemory(), googleFallback()])
  const translated = results.find(valid) || ''
  if (translated) {
    try {
      await caches.default.put(
        new Request(cacheKey.toString()),
        new Response(JSON.stringify({ translation: translated }), {
          headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=21600' },
        }),
      )
    } catch {
      // Ignore cache-write failures; the live translation is still valid.
    }
  } else {
    console.warn('[translation] all providers returned no usable translation', { source, target, queryLength: text.length })
  }
  return translated
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
    }
  }).filter((entry) => Boolean(entry.term && entry.en))
}

async function searchTechnicalVocabulary(db: D1Database, rawQuery: string): Promise<DictionaryApiEntry[]> {
  const query = rawQuery.trim()
  if (!query) return []
  const select = `SELECT term, language, reading, meaning_zh, meaning_ja, meaning_en, example, source_module
    FROM vocabulary`
  const exactResult = await db.prepare(
    `${select}
     WHERE lower(term) = lower(?)
        OR lower(COALESCE(reading, '')) = lower(?)
        OR lower(meaning_zh) = lower(?)
        OR lower(meaning_ja) = lower(?)
        OR lower(meaning_en) = lower(?)
     ORDER BY term
     LIMIT 8`,
  ).bind(query, query, query, query, query).all()
  let results = exactResult.results as Record<string, unknown>[]
  if (!results.length) {
    // Avoid matching tiny strings like "it" inside every English definition.
    // CJK words are information-dense, so short Chinese/Japanese queries remain searchable.
    const isCjk = /[\u3400-\u9fff\u3040-\u30ff]/.test(query)
    if (query.length < (isCjk ? 2 : 3)) return []
    const partialResult = await db.prepare(
      `${select}
       WHERE instr(lower(term), lower(?)) > 0
          OR instr(lower(COALESCE(reading, '')), lower(?)) > 0
          OR instr(lower(meaning_zh), lower(?)) > 0
          OR instr(lower(meaning_ja), lower(?)) > 0
          OR instr(lower(meaning_en), lower(?)) > 0
       ORDER BY CASE WHEN lower(term) = lower(?) THEN 0 ELSE 1 END, term
       LIMIT 8`,
    ).bind(query, query, query, query, query, query).all()
    results = partialResult.results as Record<string, unknown>[]
  }
  return results.map((row) => ({
    term: String(row.term || ''),
    reading: String(row.reading || ''),
    en: String(row.meaning_en || ''),
    zh: String(row.meaning_zh || ''),
    translationJa: String(row.meaning_ja || ''),
    tag: 'IT 术语 · ' + String(row.source_module || '专业词汇'),
    language: String(row.language || 'ja') as 'ja' | 'en' | 'zh',
    source: '知学 IT 术语库（D1）',
    example: String(row.example || ''),
    technical: true,
  })).filter(entry => Boolean(entry.term && (entry.zh || entry.en || entry.translationJa)))
}

async function lookupDictionary(query: string, requestedLanguage: 'auto' | 'ja' | 'en' | 'zh' | 'it' = 'auto', db?: D1Database): Promise<DictionaryApiEntry[]> {
  let technicalItems: DictionaryApiEntry[] = []
  if (db) {
    try {
      technicalItems = await searchTechnicalVocabulary(db, query)
    } catch {
      // If the glossary migration is pending, continue with online providers.
    }
  }
  // IT mode is a curated glossary lookup, not a translation request.
  if (requestedLanguage === 'it') return technicalItems

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
    const offline = commonJapaneseTranslations[query.trim()]
    if (offline) {
      if (!zh) zh = offline.zh
      if (!en) en = offline.en
    }
  } else if (language === 'en') {
    ;[zh, ja] = await Promise.all([
      translateText(query, 'en', 'zh-CN'),
      translateText(query, 'en', 'ja'),
    ])
    const offline = commonEnglishTranslations[query.trim().toLowerCase()]
    if (offline) {
      if (!zh) zh = offline.zh
      if (!ja) ja = offline.ja
    }
  } else {
    ;[ja, en] = await Promise.all([
      translateText(query, 'zh-CN', 'ja'),
      translateText(query, 'zh-CN', 'en'),
    ])
    const offline = commonChineseTranslations[query.trim()]
    if (offline) {
      if (!ja) ja = offline.ja
      if (!en) en = offline.en
    }
  }

  // 只有日语原文才查 Jisho，避免把翻译出来的近似词误当成用户原词。
  const jishoKeyword = query
  const [jishoRows, englishRows] = await Promise.all([
    language === 'ja' ? searchJisho(jishoKeyword) : Promise.resolve([]),
    language === 'en' ? searchEnglishDictionary(query) : Promise.resolve([]),
  ])

  // Keep local SG glossary results, but still try online providers so a partial local entry
  // does not suppress available translations or dictionary definitions.
  const items: DictionaryApiEntry[] = [...technicalItems]
  if (language === 'en') items.push(...englishDictionaryEntries(englishRows, zh, ja))

  // Han-only input may be Chinese or Japanese kanji. Always return a translation card
  // for Chinese input even if only one of the two translation providers responds.
  if (language === 'zh') {
    items.push({
      term: query,
      en: en || '英语翻译暂时不可用',
      zh: query,
      translationJa: ja || '日语翻译暂时不可用',
      tag: '中日英互译',
      language: 'zh',
      source: '在线翻译',
    })
  } else if (language === 'ja') {
    items.push({
      term: query,
      en: en || '英语翻译暂时不可用',
      zh: zh || '中文翻译暂时不可用',
      translationJa: query,
      tag: '日中英互译',
      language: 'ja',
      source: '在线翻译',
    })
  } else {
    items.push({
      term: query,
      en: query,
      zh: zh || '中文翻译暂时不可用',
      translationJa: ja || '日语翻译暂时不可用',
      tag: '英日中互译',
      language: 'en',
      source: '在线翻译',
    })
  }

  if (language === 'ja') items.push(...jishoEntries(jishoRows, zh))

  if (!items.length) {
    if (language === 'ja') {
      items.push({
        term: query,
        en: en || '英语翻译暂时不可用',
        zh: zh || '中文翻译暂时不可用',
        tag: '日中英互译',
        language: 'ja',
        source: '在线翻译',
      })
    } else if (language === 'en') {
      items.push({
        term: query,
        en: '暂未找到详细英语词典释义',
        zh: zh || '中文翻译暂时不可用',
        translationJa: ja || '日语翻译暂时不可用',
        tag: '英日中互译',
        language: 'en',
        source: '在线翻译',
      })
    } else {
      // Show the submitted Chinese term and the status of each translation even if both providers fail.
      items.push({
        term: query,
        en: en || '英语翻译暂时不可用',
        zh: query,
        translationJa: ja || '日语翻译暂时不可用',
        tag: '中日英互译',
        language: 'zh',
        source: '在线翻译',
      })
    }
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

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'allow': 'GET, POST, OPTIONS' } })
    }
    const isWriteEndpoint = ['/api/attempts', '/api/scenario-attempts', '/api/language-progress', '/api/language-review', '/api/vocabulary/saved', '/api/daily-tasks'].includes(url.pathname)
    if (request.method !== 'GET' && !(request.method === 'POST' && isWriteEndpoint)) {
      return json({ error: '不支持此请求方法' }, 405)
    }

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
                  (SELECT COUNT(*) FROM questions q WHERE q.track_id = st.id) AS question_count,
                  (SELECT COUNT(*) FROM questions q WHERE q.track_id = st.id AND q.source_type = 'official') AS official_question_count,
                  (SELECT COUNT(*) FROM questions q WHERE q.track_id = st.id AND q.source_type = 'generated') AS prediction_question_count
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
      if (!['auto', 'ja', 'en', 'zh', 'it'].includes(requestedLanguage)) {
        return json({ items: [], error: 'lang 参数只支持 auto、ja、en、zh、it。' }, 400)
      }
      try {
        const items = await lookupDictionary(query, requestedLanguage as 'auto' | 'ja' | 'en' | 'zh' | 'it', env.DB)
        return json({
          items,
          query,
          providers: items.some(item => item.technical)
            ? ['知学 IT 术语库（D1）']
            : (() => {
                const sourceLanguage = requestedLanguage === 'auto'
                  ? (/[\u3040-\u30ff]/.test(query) ? 'ja' : /[\u3400-\u9fff]/.test(query) ? 'zh' : 'en')
                  : requestedLanguage
                return sourceLanguage === 'en'
                  ? ['Free Dictionary', 'MyMemory', 'Google Translate（双主机备用）']
                  : sourceLanguage === 'ja'
                    ? ['Jisho', 'MyMemory', 'Google Translate（双主机备用）']
                    : ['MyMemory', 'Google Translate（双主机备用）']
              })(),
          note: items.some(item => item.technical)
            ? '优先显示专业词汇库中匹配的术语及中日英释义。'
            : '按输入语言调用相应词典，缺失的目标语言会尝试机器翻译；第三方可能限流，译文仅供参考。',
        })
      } catch (error) {
        console.error('[dictionary] lookup failed', {
          message: error instanceof Error ? error.message : String(error),
          queryLength: query.length,
          requestedLanguage,
        })
        // If an unexpected lookup error escapes the provider guards, still return
        // verified local translations for common phrases instead of failing the whole API.
        const hasKana = /[\u3040-\u30ff]/.test(query)
        const hasCjk = /[\u3400-\u9fff]/.test(query)
        const language = requestedLanguage === 'auto' ? (hasKana ? 'ja' : hasCjk ? 'zh' : 'en') : requestedLanguage
        const offline = language === 'ja'
          ? (() => { const value = commonJapaneseTranslations[query]; return value ? { zh: value.zh, ja: query, en: value.en } : undefined })()
          : language === 'en'
            ? (() => { const value = commonEnglishTranslations[query.toLowerCase()]; return value ? { zh: value.zh, ja: value.ja, en: query } : undefined })()
            : (() => { const value = commonChineseTranslations[query]; return value ? { zh: query, ja: value.ja, en: value.en } : undefined })()
        if (offline) {
          const item: DictionaryApiEntry = {
            term: query,
            zh: offline.zh,
            translationJa: offline.ja,
            en: offline.en,
            tag: '中日英互译 · 离线兜底',
            language: language as 'ja' | 'en' | 'zh',
            source: '本地词典（在线接口异常时）',
          }
          return json({ items: [item], query, providers: ['本地词典'], note: '在线查询失败，当前显示已收录的离线词条。' })
        }
        return json({ items: [], error: '在线翻译请求失败，离线词典也未收录该词。请检查 Worker 日志。' }, 503)
      }
    }

    // Language lessons are stored in D1 and labeled as authored learning content.
    if (url.pathname === '/api/language-cards') {
      const language = url.searchParams.get('lang') || 'ja'
      const category = url.searchParams.get('category') || ''
      if (!['ja', 'en'].includes(language)) return json({ items: [], error: 'lang 只支持 ja 或 en。' }, 400)
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, language, category, term, reading, meaning_zh, explanation, example, example_meaning_zh, source_type
           FROM language_cards WHERE language = ? AND (? = '' OR category = ?)
           ORDER BY category, id`,
        ).bind(language, category, category).all()
        return json({ items: results })
      } catch {
        return json({ items: [], error: '语言课程尚未初始化，请先执行最新的 D1 迁移。' }, 503)
      }
    }

    // Dashboard 汇总只从 D1 的实际答题、实战和课程进度生成；无记录时返回 0。
    if (url.pathname === '/api/dashboard' && request.method === 'GET') {
      try {
        const [attempts, scenarios, language, saved, tasks] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(is_correct), 0) AS correct FROM study_attempts').first() as Promise<Record<string, unknown>>,
          env.DB.prepare('SELECT COUNT(*) AS total, COALESCE(AVG(score), 0) AS average_score FROM scenario_attempts').first() as Promise<Record<string, unknown>>,
          env.DB.prepare('SELECT (SELECT COUNT(*) FROM language_cards) AS total, COALESCE((SELECT SUM(mastered) FROM language_card_progress), 0) AS mastered').first() as Promise<Record<string, unknown>>,
          env.DB.prepare('SELECT COUNT(*) AS total FROM saved_vocabulary_entries').first() as Promise<Record<string, unknown>>,
          env.DB.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(completed), 0) AS completed FROM daily_task_completions WHERE study_date = date('now')").first() as Promise<Record<string, unknown>>,
        ])
        const total = Number(attempts?.total || 0)
        const correct = Number(attempts?.correct || 0)
        return json({
          generated_from: 'D1',
          exam: { attempted_questions: total, correct_answers: correct, accuracy_percent: total ? Math.round(correct / total * 100) : null },
          practical: { completed_scenarios: Number(scenarios?.total || 0), average_score: Number(scenarios?.average_score || 0) },
          language: { mastered_cards: Number(language?.mastered || 0), tracked_cards: Number(language?.total || 0) },
          vocabulary: { saved_terms: Number(saved?.total || 0) },
          today: { tasks_completed: Number(tasks?.completed || 0), tasks_tracked: Number(tasks?.total || 0) },
        })
      } catch {
        return json({ error: '学习统计尚未初始化，请先应用最新 D1 迁移。' }, 503)
      }
    }

    // 读取与更新课程掌握状态。
    if (url.pathname === '/api/language-progress') {
      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare('SELECT card_id, mastered, updated_at FROM language_card_progress ORDER BY updated_at DESC').all()
          return json({ items: results })
        } catch {
          return json({ items: [], error: '课程进度表尚未初始化。' }, 503)
        }
      }
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> }
      catch { return json({ error: '请求体必须是 JSON。' }, 400) }
      const cardId = String(body.card_id || '').trim()
      const mastered = body.mastered === true || body.mastered === 1
      if (!cardId) return json({ error: '缺少 card_id。' }, 400)
      try {
        const card = await env.DB.prepare('SELECT id FROM language_cards WHERE id = ?').bind(cardId).first()
        if (!card) return json({ error: '课程卡片不存在。' }, 404)
        await env.DB.prepare(
          'INSERT INTO language_card_progress (card_id, mastered, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(card_id) DO UPDATE SET mastered = excluded.mastered, updated_at = CURRENT_TIMESTAMP',
        ).bind(cardId, mastered ? 1 : 0).run()
        return json({ ok: true, card_id: cardId, mastered })
      } catch {
        return json({ error: '课程进度保存失败，请确认已应用最新 D1 迁移。' }, 503)
      }
    }

    // Language spaced repetition: keep a review schedule per card in D1.
    if (url.pathname === '/api/language-review') {
      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare(
            `SELECT card_id, review_count, correct_streak, next_review_at, last_reviewed_at, last_result,
                    CASE WHEN next_review_at <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END AS is_due
             FROM language_card_reviews ORDER BY next_review_at ASC`,
          ).all()
          return json({ items: results })
        } catch {
          return json({ items: [], error: '复习计划表尚未初始化，请先应用最新 D1 迁移。' }, 503)
        }
      }
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> }
      catch { return json({ error: '请求体必须是 JSON。' }, 400) }
      const cardId = String(body.card_id || '').trim()
      const result = body.result === 'remembered' ? 'remembered' : body.result === 'again' ? 'again' : ''
      if (!cardId || !result) return json({ error: '需要 card_id 和有效的 result。' }, 400)
      try {
        const card = await env.DB.prepare('SELECT id FROM language_cards WHERE id = ?').bind(cardId).first()
        if (!card) return json({ error: '课程卡片不存在。' }, 404)
        const modifier = result === 'again' ? '+10 minutes' : '+1 day'
        await env.DB.prepare(
          `INSERT INTO language_card_reviews
             (card_id, review_count, correct_streak, next_review_at, last_reviewed_at, last_result, updated_at)
           VALUES (?, 1, ?, datetime(CURRENT_TIMESTAMP, ?), CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(card_id) DO UPDATE SET
             review_count = language_card_reviews.review_count + 1,
             correct_streak = CASE WHEN excluded.last_result = 'remembered' THEN language_card_reviews.correct_streak + 1 ELSE 0 END,
             next_review_at = datetime(CURRENT_TIMESTAMP, CASE
               WHEN excluded.last_result = 'again' THEN '+10 minutes'
               ELSE CASE MIN(language_card_reviews.correct_streak + 1, 4)
                 WHEN 1 THEN '+1 day' WHEN 2 THEN '+3 days' WHEN 3 THEN '+7 days' ELSE '+14 days' END
             END),
             last_reviewed_at = CURRENT_TIMESTAMP, last_result = excluded.last_result, updated_at = CURRENT_TIMESTAMP`,
        ).bind(cardId, result === 'remembered' ? 1 : 0, modifier, result).run()
        return json({ ok: true, card_id: cardId, result })
      } catch {
        return json({ error: '复习记录保存失败，请确认已应用最新的 D1 迁移。' }, 503)
      }
    }

    // 生词本存储词条快照，避免第三方词典后续变化导致收藏内容消失。
    if (url.pathname === '/api/vocabulary/saved') {
      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare('SELECT term, language, entry_json, saved_at FROM saved_vocabulary_entries ORDER BY saved_at DESC LIMIT 200').all()
          return json({ items: results.map((row: Record<string, unknown>) => ({
            term: row.term, language: row.language, saved_at: row.saved_at,
            entry: JSON.parse(String(row.entry_json || '{}')),
          })) })
        } catch {
          return json({ items: [], error: '生词本表尚未初始化。' }, 503)
        }
      }
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> }
      catch { return json({ error: '请求体必须是 JSON。' }, 400) }
      const term = String(body.term || '').trim()
      const action = String(body.action || 'save')
      if (!term || term.length > 100) return json({ error: 'term 必填且不能超过 100 个字符。' }, 400)
      if (action === 'remove') {
        try {
          await env.DB.prepare('DELETE FROM saved_vocabulary_entries WHERE term = ?').bind(term).run()
          return json({ ok: true, term, saved: false })
        } catch { return json({ error: '删除生词失败。' }, 503) }
      }
      const entry = body.entry
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return json({ error: '保存词条时必须提供 entry 对象。' }, 400)
      const language = ['auto', 'ja', 'en', 'zh'].includes(String(body.language)) ? String(body.language) : 'auto'
      try {
        await env.DB.prepare(
          'INSERT INTO saved_vocabulary_entries (term, language, entry_json, saved_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(term) DO UPDATE SET language = excluded.language, entry_json = excluded.entry_json, saved_at = CURRENT_TIMESTAMP',
        ).bind(term, language, JSON.stringify(entry)).run()
        return json({ ok: true, term, saved: true })
      } catch { return json({ error: '保存生词失败，请确认已应用最新 D1 迁移。' }, 503) }
    }

    // 读取指定日期的每日任务完成状态。
    if (url.pathname === '/api/daily-tasks' && request.method === 'GET') {
      const studyDate = url.searchParams.get('date') || new Date().toISOString().slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(studyDate)) return json({ items: [], error: 'date 格式应为 YYYY-MM-DD。' }, 400)
      try {
        const { results } = await env.DB.prepare(
          'SELECT task_id, study_date, completed, updated_at FROM daily_task_completions WHERE study_date = ? ORDER BY task_id',
        ).bind(studyDate).all()
        return json({ items: results })
      } catch { return json({ items: [], error: '每日任务表尚未初始化。' }, 503) }
    }

    // 每日任务状态按日期写入 D1。
    if (url.pathname === '/api/daily-tasks' && request.method === 'POST') {
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> }
      catch { return json({ error: '请求体必须是 JSON。' }, 400) }
      const taskId = String(body.task_id || '').trim()
      const studyDate = String(body.study_date || '')
      if (!taskId || !/^\d{4}-\d{2}-\d{2}$/.test(studyDate)) return json({ error: 'task_id 或 study_date 格式无效。' }, 400)
      const completed = body.completed === true || body.completed === 1
      try {
        await env.DB.prepare(
          'INSERT INTO daily_task_completions (task_id, study_date, completed, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(task_id, study_date) DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP',
        ).bind(taskId, studyDate, completed ? 1 : 0).run()
        return json({ ok: true, task_id: taskId, study_date: studyDate, completed })
      } catch { return json({ error: '每日任务保存失败，请确认已应用最新 D1 迁移。' }, 503) }
    }

    // 返回指定考试的真实实战情境。题目与评分规则从 D1 读取。
    if (url.pathname === '/api/scenarios' && request.method === 'GET') {
      const trackId = url.searchParams.get('track') || 'exam-sg'
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, track_id, title, category, difficulty, situation, task,
                  options_json, source_type
           FROM practical_scenarios WHERE track_id = ? ORDER BY id`,
        ).bind(trackId).all()
        return json({ items: results.map((row: Record<string, unknown>) => ({
          ...row,
          options: JSON.parse(String(row.options_json || '[]')),
          options_json: undefined,
        })) })
      } catch {
        return json({ items: [], error: '实战情境库尚未初始化，请先执行最新的 D1 迁移。' }, 503)
      }
    }

    // 错题复习：只返回当前考试中至少答错过一次的题目，按错误次数优先排列。
    if (url.pathname === '/api/wrong-questions' && request.method === 'GET') {
      const trackId = (url.searchParams.get('track') || 'exam-sg').trim().slice(0, 80)
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 30)))
      const requestedMode = (url.searchParams.get('mode') || 'wrong').trim()
      const mode = ['wrong', 'due', 'practice', 'mastered'].includes(requestedMode) ? requestedMode : 'wrong'
      const requestedSource = (url.searchParams.get('source') || '').trim()
      const source = ['official', 'generated'].includes(requestedSource) ? requestedSource : ''
      try {
        const { results } = await env.DB.prepare(
          `SELECT q.id, q.track_id, q.topic, q.difficulty, q.question_type, q.prompt,
                  q.options_json, q.answer_json, q.explanation, q.source_type, q.source_reference, q.language,
                  COALESCE(s.review_count, 0) AS review_count,
                  COALESCE(s.correct_streak, 0) AS correct_streak,
                  COALESCE(s.last_result, 'again') AS last_result,
                  COALESCE(s.next_review_at, CURRENT_TIMESTAMP) AS next_review_at,
                  COALESCE(s.mastered, 0) AS mastered,
                  (SELECT COUNT(*) FROM study_attempts wa WHERE wa.question_id = q.id AND wa.is_correct = 0) AS wrong_count,
                  (SELECT MAX(wa.answered_at) FROM study_attempts wa WHERE wa.question_id = q.id AND wa.is_correct = 0) AS last_wrong_at
           FROM questions q
           LEFT JOIN question_review_state s ON s.question_id = q.id
           WHERE q.track_id = ? AND (? = '' OR q.source_type = ?) AND (
             (? = 'wrong' AND COALESCE(s.mastered, 0) = 0 AND EXISTS (
               SELECT 1 FROM study_attempts wa WHERE wa.question_id = q.id AND wa.is_correct = 0
             ))
             OR (? = 'due' AND COALESCE(s.mastered, 0) = 0 AND (
               s.question_id IS NULL AND EXISTS (SELECT 1 FROM study_attempts wa WHERE wa.question_id = q.id AND wa.is_correct = 0)
               OR s.next_review_at <= CURRENT_TIMESTAMP
             ))
             OR (? = 'practice' AND COALESCE(s.mastered, 0) = 0)
             OR (? = 'mastered' AND COALESCE(s.mastered, 0) = 1)
           )
           ORDER BY CASE WHEN COALESCE(s.last_result, 'again') = 'again' THEN 0 ELSE 1 END,
                    wrong_count DESC, next_review_at ASC, q.id
           LIMIT ?`,
        ).bind(trackId, source, source, mode, mode, mode, mode, limit).all()
        return json({
          mode,
          items: results.map((row: Record<string, unknown>) => ({
            ...row,
            options: JSON.parse(String(row.options_json || '[]')),
            answer: JSON.parse(String(row.answer_json || 'null')),
            options_json: undefined,
            answer_json: undefined,
          })),
        })
      } catch {
        return json({ error: '复习题记录暂不可用，请确认 D1 迁移已完成。' }, 503)
      }
    }

    // 每道题的复习计划与掌握状态。连续答对三次自动掌握，答错立即重置间隔。
    if (url.pathname === '/api/question-progress') {
      if (request.method === 'GET') {
        const trackId = (url.searchParams.get('track') || 'exam-sg').trim().slice(0, 80)
        try {
          const { results } = await env.DB.prepare(
            `SELECT s.question_id, s.review_count, s.correct_streak, s.last_result, s.next_review_at, s.mastered
             FROM question_review_state s
             INNER JOIN questions q ON q.id = s.question_id
             WHERE q.track_id = ? ORDER BY s.next_review_at ASC`,
          ).bind(trackId).all()
          return json({ items: results })
        } catch {
          return json({ error: '题目复习计划表尚未初始化，请应用最新 D1 迁移。' }, 503)
        }
      }
      if (request.method === 'POST') {
        let body: Record<string, unknown>
        try { body = await request.json() as Record<string, unknown> }
        catch { return json({ error: '请求体必须是 JSON。' }, 400) }
        const questionId = String(body.question_id || '').trim()
        if (!questionId || typeof body.mastered !== 'boolean') return json({ error: '请提供 question_id 和 mastered。' }, 400)
        try {
          const question = await env.DB.prepare('SELECT id, track_id FROM questions WHERE id = ?').bind(questionId).first() as Record<string, unknown> | null
          if (!question) return json({ error: '题目不存在。' }, 404)
          const previous = await env.DB.prepare('SELECT review_count, correct_streak FROM question_review_state WHERE question_id = ?').bind(questionId).first() as { review_count?: number; correct_streak?: number } | null
          const mastered = body.mastered
          const nextReview = new Date(Date.now() + (mastered ? 30 * 86400000 : 0)).toISOString().replace('T', ' ').slice(0, 19)
          const streak = mastered ? Math.max(3, Number(previous?.correct_streak || 0)) : 0
          await env.DB.prepare(
            `INSERT INTO question_review_state (question_id, track_id, review_count, correct_streak, last_result, next_review_at, mastered, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(question_id) DO UPDATE SET
               correct_streak = excluded.correct_streak,
               last_result = CASE WHEN excluded.mastered = 1 THEN 'remembered' ELSE 'again' END,
               next_review_at = excluded.next_review_at,
               mastered = excluded.mastered,
               updated_at = CURRENT_TIMESTAMP`,
          ).bind(questionId, String(question.track_id), Number(previous?.review_count || 0), streak, mastered ? 'remembered' : 'again', nextReview, mastered ? 1 : 0).run()
          const progress = await env.DB.prepare(
            'SELECT question_id, review_count, correct_streak, last_result, next_review_at, mastered FROM question_review_state WHERE question_id = ?',
          ).bind(questionId).first()
          return json({ ok: true, progress })
        } catch {
          return json({ error: '掌握状态保存失败，请确认已应用最新 D1 迁移。' }, 503)
        }
      }
    }

    
    // 手动汇总的历史考试成绩从浏览器迁移到 D1；客户端为每条记录生成稳定 ID，重复提交不会重复计数。
    if (url.pathname === '/api/exam-history') {
      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare(
            'SELECT id, study_date AS date, correct_count AS correct, question_count AS total, exam_name AS exam, created_at FROM exam_history ORDER BY study_date, created_at, id',
          ).all()
          return json({ items: results })
        } catch {
          return json({ error: '考试历史表尚未初始化，请先应用最新 D1 迁移。' }, 503)
        }
      }
      if (request.method === 'POST') {
        let body: Record<string, unknown>
        try { body = await request.json() as Record<string, unknown> }
        catch { return json({ error: '请求体必须是 JSON。' }, 400) }
        const id = String(body.id || '').trim()
        const date = String(body.date || '')
        const exam = String(body.exam || '').trim().slice(0, 100)
        const total = Number(body.total)
        const correct = Number(body.correct)
        if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !exam || !Number.isInteger(total) || total < 1 || total > 10000 ||
            !Number.isInteger(correct) || correct < 0 || correct > total) {
          return json({ error: '考试记录格式无效。' }, 400)
        }
        try {
          await env.DB.prepare(
            'INSERT INTO exam_history (id, study_date, exam_name, question_count, correct_count) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
          ).bind(id, date, exam, total, correct).run()
          return json({ ok: true, id }, 201)
        } catch {
          return json({ error: '考试历史保存失败，请确认已应用最新 D1 迁移。' }, 503)
        }
      }
    }

    // 答题记录保存到 D1；此个人版尚未配置账号认证，不应存放敏感个人信息。
    if (url.pathname === '/api/attempts' && request.method === 'POST') {
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> }
      catch { return json({ error: '请求体必须是 JSON。' }, 400) }
      const questionId = String(body.question_id || '').trim()
      const answer = body.answer
      const duration = Math.max(0, Math.min(86400, Math.floor(Number(body.duration_seconds) || 0)))
      if (!questionId || answer === undefined) return json({ error: '缺少 question_id 或 answer。' }, 400)
      try {
        const question = await env.DB.prepare('SELECT id, track_id, answer_json FROM questions WHERE id = ?').bind(questionId).first() as Record<string, unknown> | null
        if (!question) return json({ error: '题目不存在。' }, 404)
        let expected: unknown
        try { expected = JSON.parse(String(question.answer_json)) } catch { expected = null }
        const correct = JSON.stringify(expected) === JSON.stringify(answer)
        const attemptId = crypto.randomUUID()
        await env.DB.prepare(
          'INSERT INTO study_attempts (id, question_id, user_answer_json, is_correct, duration_seconds) VALUES (?, ?, ?, ?, ?)',
        ).bind(attemptId, questionId, JSON.stringify(answer), correct ? 1 : 0, duration).run()
        const previous = await env.DB.prepare(
          'SELECT review_count, correct_streak FROM question_review_state WHERE question_id = ?',
        ).bind(questionId).first() as { review_count?: number; correct_streak?: number } | null
        const reviewCount = Number(previous?.review_count || 0) + 1
        const streak = correct ? Number(previous?.correct_streak || 0) + 1 : 0
        const mastered = correct && streak >= 3
        const intervalMs = !correct ? 10 * 60 * 1000 : mastered ? 30 * 86400000 : streak === 1 ? 86400000 : streak === 2 ? 3 * 86400000 : 7 * 86400000
        const nextReview = new Date(Date.now() + intervalMs).toISOString().replace('T', ' ').slice(0, 19)
        await env.DB.prepare(
          `INSERT INTO question_review_state (question_id, track_id, review_count, correct_streak, last_result, next_review_at, mastered, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(question_id) DO UPDATE SET
             review_count = excluded.review_count,
             correct_streak = excluded.correct_streak,
             last_result = excluded.last_result,
             next_review_at = excluded.next_review_at,
             mastered = excluded.mastered,
             updated_at = CURRENT_TIMESTAMP`,
        ).bind(questionId, String(question.track_id), reviewCount, streak, correct ? 'remembered' : 'again', nextReview, mastered ? 1 : 0).run()
        const progress = await env.DB.prepare(
          'SELECT question_id, review_count, correct_streak, last_result, next_review_at, mastered FROM question_review_state WHERE question_id = ?',
        ).bind(questionId).first()
        return json({ ok: true, attempt_id: attemptId, correct, answer: expected, progress }, 201)
      } catch {
        return json({ error: '答题记录保存失败，请确认 D1 迁移已完成。' }, 503)
      }
    }

    
    // 实战任务由服务端按 D1 中的评分规则判分，保存分数和反馈。
    if (url.pathname === '/api/scenario-attempts' && request.method === 'POST') {
      let body: Record<string, unknown>
      try { body = await request.json() as Record<string, unknown> }
      catch { return json({ error: '请求体必须是 JSON。' }, 400) }
      const scenarioId = String(body.scenario_id || '').trim()
      const selectedOption = String(body.selected_option || '').trim()
      const duration = Math.max(0, Math.min(86400, Math.floor(Number(body.duration_seconds) || 0)))
      if (!scenarioId || !selectedOption) return json({ error: '缺少 scenario_id 或 selected_option。' }, 400)
      try {
        const scenario = await env.DB.prepare(
          'SELECT id, track_id, options_json, scoring_json, best_option, explanation FROM practical_scenarios WHERE id = ?',
        ).bind(scenarioId).first() as Record<string, unknown> | null
        if (!scenario) return json({ error: '实战任务不存在。' }, 404)
        const options = JSON.parse(String(scenario.options_json || '[]')) as Array<{id: string; text: string}>
        if (!options.some(option => option.id === selectedOption)) return json({ error: '所选选项不属于此任务。' }, 400)
        const scoring = JSON.parse(String(scenario.scoring_json || '{}')) as Record<string, number>
        const score = Math.max(0, Math.min(100, Math.floor(Number(scoring[selectedOption] ?? 0))))
        const attemptId = crypto.randomUUID()
        await env.DB.prepare(
          'INSERT INTO scenario_attempts (id, scenario_id, track_id, selected_option, score, feedback, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).bind(attemptId, scenarioId, String(scenario.track_id), selectedOption, score, String(scenario.explanation || ''), duration).run()
        return json({
          ok: true,
          attempt_id: attemptId,
          score,
          selected_option: selectedOption,
          best_option: String(scenario.best_option),
          correct: selectedOption === String(scenario.best_option),
          feedback: String(scenario.explanation || ''),
        }, 201)
      } catch {
        return json({ error: '实战结果保存失败，请确认 D1 迁移已完成。' }, 503)
      }
    }

    // 官方题源目录：只返回来源元数据与官方链接，不复制第三方题库。
    if (url.pathname === '/api/question-sources' && request.method === 'GET') {
      const examCode = (url.searchParams.get('exam') || 'SG').trim().slice(0, 12).toUpperCase()
      try {
        const { results } = await env.DB.prepare(
          `SELECT id, exam_code, year_label, subject_label, title, source_url,
                  content_mode, license_note, checked_at, notes
           FROM question_sources
           WHERE exam_code = ?
           ORDER BY year_label DESC, id`,
        ).bind(examCode).all()
        return json({ items: results })
      } catch {
        return json({ items: [], error: '官方题源目录尚未初始化，请先执行 D1 迁移 0011、0012。' }, 503)
      }
    }

    // 题库分类：按当前考试和来源返回实际存在的 topic 及题量。
    if (url.pathname === '/api/question-categories' && request.method === 'GET') {
      const trackId = (url.searchParams.get('track') || 'exam-sg').trim().slice(0, 80)
      const requestedSource = (url.searchParams.get('source') || 'all').trim().toLowerCase()
      const source = ['all', 'official', 'generated'].includes(requestedSource) ? requestedSource : 'all'
      try {
        const { results } = await env.DB.prepare(
          `SELECT topic, COUNT(*) AS question_count
           FROM questions
           WHERE track_id = ? AND (? = 'all' OR source_type = ?)
           GROUP BY topic
           ORDER BY topic`,
        ).bind(trackId, source, source).all()
        return json({ items: results })
      } catch {
        return json({ items: [], error: '题库分类暂不可用，请确认数据库迁移已应用。' }, 503)
      }
    }

    // 返回指定考试的练习题。source_type 会明确标记自编练习题，不冒充官方真题。
    if (url.pathname === '/api/questions') {
      const trackId = url.searchParams.get('track') || 'exam-sg'
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 10)))
      const offset = Math.min(10000, Math.max(0, Number(url.searchParams.get('offset') || 0)))
      const topic = (url.searchParams.get('topic') || '').trim().slice(0, 100)
      const mode = url.searchParams.get('mode') || 'random'
      const requestedSource = (url.searchParams.get('source') || 'all').trim().toLowerCase()
      const source = ['all', 'official', 'generated'].includes(requestedSource) ? requestedSource : 'all'
      try {
        const totalRow = await env.DB.prepare(
          `SELECT COUNT(*) AS total FROM questions
           WHERE track_id = ? AND (? = '' OR topic = ?)
             AND (? = 'all' OR source_type = ?)`,
        ).bind(trackId, topic, topic, source, source).first() as { total?: number } | null
        const { results } = await env.DB.prepare(
          `SELECT id, track_id, topic, difficulty, question_type, prompt,
                  options_json, answer_json, explanation, source_type, source_reference, language
           FROM questions
           WHERE track_id = ? AND (? = '' OR topic = ?)
             AND (? = 'all' OR source_type = ?)
           ORDER BY CASE WHEN ? = 'ordered' THEN id END,
                    CASE WHEN ? <> 'ordered' THEN random() END
           LIMIT ? OFFSET ?`,
        ).bind(trackId, topic, topic, source, source, mode, mode, limit, offset).all()
        const total = Number(totalRow?.total || 0)
        return json({
          items: results.map((row: Record<string, unknown>) => ({
            ...row,
            options: JSON.parse(String(row.options_json || '[]')),
            answer: JSON.parse(String(row.answer_json || 'null')),
            options_json: undefined,
            answer_json: undefined,
          })),
          total,
          limit,
          offset,
          has_more: offset + results.length < total,
        })
      } catch {
        return json({ error: '题库暂不可用，请确认已执行最新的 D1 迁移。' }, 503)
      }
    }

    // 学习记录写入接口暂不开放；完成 Cloudflare Access 访问保护后再启用。

    return json({ error: '未找到对应接口' }, 404)
  },
}
