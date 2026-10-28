// Preserve records created while an earlier cloud request was in flight.
export function mergeExamHistory<T extends { id?: string }>(cloud: T[], current: T[], snapshotIds: string[]): T[] {
  const snapshot = new Set(snapshotIds)
  const cloudIds = new Set(cloud.map(record => record.id))
  return [...cloud, ...current.filter(record => record.id && !snapshot.has(record.id) && !cloudIds.has(record.id))]
}
export function restoreMasteredCard(current: string[], id: string, wasMastered: boolean): string[] {
  return wasMastered ? (current.includes(id) ? current : [...current, id]) : current.filter(item => item !== id)
}
