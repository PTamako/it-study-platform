/** Small offline-first answer snapshots; no public dictionary or AI calls.
 * IndexedDB stores only three answers per date/language. localStorage is an
 * immediate fallback for iOS private-mode and abrupt PWA termination.
 */
export type GrammarQuestionKey = { id: string; options: readonly string[] }
export type GrammarCloudAnswer = { question_id: string; answer_index: number }

export function validGrammarAnswers(raw: unknown, questions: readonly GrammarQuestionKey[]): Record<string, number> {
  const result: Record<string, number> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result
  const record = raw as Record<string, unknown>
  for (const question of questions) {
    const choice = record[question.id]
    if (typeof choice === 'number' && Number.isInteger(choice) && choice >= 0 && choice < question.options.length)
      result[question.id] = choice
  }
  return result
}

export function parseGrammarCloud(rows: unknown, questions: readonly GrammarQuestionKey[]): Record<string, number> {
  if (!Array.isArray(rows) || rows.length > questions.length) throw new Error('无效的云端练习数据。')
  const raw: Record<string, unknown> = {}
  const ids = new Set(questions.map(question => question.id))
  for (const row of rows) {
    if (!row || typeof row !== 'object' || typeof row.question_id !== 'string' ||
      !ids.has(row.question_id) || row.question_id in raw ||
      !Number.isInteger(row.answer_index) || row.answer_index < 0 || row.answer_index > 3)
      throw new Error('云端练习数据不完整。')
    raw[row.question_id] = row.answer_index
  }
  return validGrammarAnswers(raw, questions)
}

/** Cloud wins collisions; other local-only answers remain safely pending. */
export function mergeGrammarCloud(
  local: Record<string, number>,
  cloud: Record<string, number>,
  questions: readonly GrammarQuestionKey[],
): Record<string, number> {
  return validGrammarAnswers({ ...local, ...cloud }, questions)
}

export function pendingGrammarAnswers(
  local: Record<string, number>,
  cloud: Record<string, number>,
  questions: readonly GrammarQuestionKey[],
): GrammarCloudAnswer[] {
  return questions.filter(question => question.id in local && !(question.id in cloud))
    .map(question => ({ question_id: question.id, answer_index: local[question.id] }))
}

// Reuse the same database; avoid a connection and query per answer.
let opened: Promise<IDBDatabase | null> | undefined
function openGrammarDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (opened) return opened
  opened = new Promise(resolve => {
    try {
      const request = indexedDB.open('zhixue-offline-learning', 2)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('grammar_answers'))
          request.result.createObjectStore('grammar_answers', { keyPath: 'key' })
        if (!request.result.objectStoreNames.contains('listening_answers'))
          request.result.createObjectStore('listening_answers', { keyPath: 'key' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch { resolve(null) }
  })
  return opened
}

export async function loadGrammarOffline(key: string): Promise<unknown> {
  const db = await openGrammarDb()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const request = db.transaction('grammar_answers', 'readonly').objectStore('grammar_answers').get(key)
      request.onsuccess = () => resolve(request.result?.answers ?? null)
      request.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

export async function saveGrammarOffline(key: string, answers: Record<string, number>): Promise<void> {
  const db = await openGrammarDb()
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const transaction = db.transaction('grammar_answers', 'readwrite')
      transaction.objectStore('grammar_answers').put({ key, answers })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
      transaction.onabort = () => resolve()
    } catch { resolve() }
  })
}

/** Reuse the same IndexedDB database; the JSON localStorage fallback is
 * written synchronously by the listening component before this async call.
 */
export async function loadListeningOffline(key: string): Promise<unknown> {
  const db = await openGrammarDb()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const request = db.transaction('listening_answers', 'readonly').objectStore('listening_answers').get(key)
      request.onsuccess = () => resolve(request.result?.answers ?? null)
      request.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}
export async function saveListeningOffline(key: string, answers: Record<string, number>): Promise<void> {
  const db = await openGrammarDb()
  if (!db) return
  await new Promise<void>(resolve => {
    try {
      const transaction = db.transaction('listening_answers', 'readwrite')
      transaction.objectStore('listening_answers').put({ key, answers })
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
      transaction.onabort = () => resolve()
    } catch { resolve() }
  })
}
