// Preserve records created while an earlier cloud request was in flight.
export function mergeExamHistory<T extends { id?: string }>(cloud: T[], current: T[], snapshotIds: string[]): T[] {
  const snapshot = new Set(snapshotIds)
  const cloudIds = new Set(cloud.map(record => record.id))
  return [...cloud, ...current.filter(record => record.id && !snapshot.has(record.id) && !cloudIds.has(record.id))]
}
export function restoreMasteredCard(current: string[], id: string, wasMastered: boolean): string[] {
  return wasMastered ? (current.includes(id) ? current : [...current, id]) : current.filter(item => item !== id)
}

// Import is insert-only on the server; a failure leaves the caller's local state untouched.
export async function hydrateMastery(local: string[], request: typeof fetch): Promise<string[]> {
  const ids = [...new Set(local)]
  for (let i = 0; i < ids.length; i += 100) {
    const response = await request('/api/language-progress', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ legacy_card_ids: ids.slice(i, i + 100) }),
    })
    if (!response.ok) throw new Error('Unable to import local progress')
  }
  const response = await request('/api/language-progress')
  if (!response.ok) throw new Error('Unable to load cloud progress')
  const progress = await response.json() as { items?: Array<{ card_id: string; mastered: number }> }
  if (!Array.isArray(progress.items)) throw new Error('Invalid cloud progress')
  const cloudIds = new Set(progress.items.map(item => item.card_id))
  return [
    ...progress.items.filter(item => item.mastered).map(item => item.card_id),
    ...ids.filter(id => !cloudIds.has(id)),
  ]
}
