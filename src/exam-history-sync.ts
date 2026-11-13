/**
 * Diff locally retained exam records against the canonical cloud receipt list.
 * Never repost records already stored on the server, and never discard a local
 * record merely because a previous network response was ambiguous.
 */
export function recordsMissingOnCloud<T extends { id?: string }>(
  local: readonly T[],
  remote: readonly { id?: string }[],
): T[] {
  const remoteIds = new Set(remote.map(row => row.id).filter((id): id is string => typeof id === 'string' && id.length > 0))
  const scheduled = new Set<string>()
  return local.filter(row => {
    if (typeof row.id !== 'string' || !row.id || remoteIds.has(row.id) || scheduled.has(row.id)) return false
    scheduled.add(row.id)
    return true
  })
}
