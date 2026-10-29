// Preserve records created while an earlier cloud request was in flight.
export function mergeExamHistory<T extends { id?: string }>(cloud: T[], current: T[], snapshotIds: string[]): T[] {
  const snapshot = new Set(snapshotIds)
  const cloudIds = new Set(cloud.map(record => record.id))
  return [...cloud, ...current.filter(record => record.id && !snapshot.has(record.id) && !cloudIds.has(record.id))]
}
export function restoreMasteredCard(current: string[], id: string, wasMastered: boolean): string[] {
  return wasMastered ? (current.includes(id) ? current : [...current, id]) : current.filter(item => item !== id)
}

// Acknowledged IDs are persisted between runs so long imports can resume after
// throttling, a network error or a closed page. Unknown IDs stay eligible for retry.
export async function hydrateMastery(
  local: string[],
  request: typeof fetch,
  checkpoint: { has(id: string): boolean; add(ids: string[]): void },
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  isCurrent: () => boolean = () => true,
): Promise<string[]> {
  const requireCurrent = () => { if (!isCurrent()) throw new Error('Synchronization superseded') }
  const ids = [...new Set(local)]
  const pending = ids.filter(id => !checkpoint.has(id))
  for (let i = 0; i < pending.length; i += 100) {
    const batch = pending.slice(i, i + 100)
    let retries = 0
    let response: Response
    while (true) {
      requireCurrent()
      response = await request('/api/language-progress', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ legacy_card_ids: batch }),
      })
      if (response.status !== 429 || retries >= 2) break
      retries++
      await wait(65_000)
    }
    requireCurrent()
    if (!response.ok) throw new Error('Unable to import local progress')
    const result = await response.json() as { recognized_card_ids?: unknown }
    requireCurrent()
    if (!Array.isArray(result.recognized_card_ids)) throw new Error('Invalid import response')
    const requested = new Set(batch)
    checkpoint.add(result.recognized_card_ids.filter((id): id is string => typeof id === 'string' && requested.has(id)))
  }
  requireCurrent()
  const response = await request('/api/language-progress')
  if (!response.ok) throw new Error('Unable to load cloud progress')
  const progress = await response.json() as { items?: Array<{ card_id: string; mastered: number }> }
  requireCurrent()
  if (!Array.isArray(progress.items)) throw new Error('Invalid cloud progress')
  const cloudIds = new Set(progress.items.map(item => item.card_id))
  return [
    ...progress.items.filter(item => item.mastered).map(item => item.card_id),
    ...ids.filter(id => !cloudIds.has(id)),
  ]
}
