export type VocabularySyncRow = { term: string; deleted: boolean; entry?: unknown }

// Do not apply any partial page: the caller retains all local entries on failure.
export async function fetchVocabularySnapshot(request: typeof fetch): Promise<VocabularySyncRow[]> {
  const rows: VocabularySyncRow[] = []
  const cursors = new Set<string>()
  let after = ''
  while (true) {
    const response = await request('/api/vocabulary/saved?sync=1&after=' + encodeURIComponent(after), { cache: 'no-store' })
    if (!response.ok) throw new Error('Unable to load vocabulary')
    const data = await response.json() as { items?: unknown; next?: unknown }
    if (!Array.isArray(data.items) || !('next' in data)) throw new Error('Invalid vocabulary page')
    for (const item of data.items) {
      if (!item || typeof item !== 'object' || typeof item.term !== 'string' || typeof item.deleted !== 'boolean') throw new Error('Invalid vocabulary item')
      if (!item.deleted && (!item.entry || typeof item.entry !== 'object')) throw new Error('Invalid vocabulary entry')
      rows.push(item)
    }
    if (data.next === null) return rows
    if (typeof data.next !== 'string' || !data.next || cursors.has(data.next) || data.next === after) throw new Error('Invalid vocabulary cursor')
    cursors.add(data.next)
    after = data.next
  }
}
