/** Authoritative cloud answer is immutable (first-write-wins). Preserve local-only
 * answers for later retry, especially when the browser is offline.
 */
export type ListeningQuestion = { id: string; options: readonly string[] }
export type ListeningAnswer = { scene_id: string; answer_index: number }

export function validListeningAnswers(raw: unknown, scenes: readonly ListeningQuestion[]): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, number> = {}
  for (const scene of scenes) {
    const value = (raw as Record<string, unknown>)[scene.id]
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < scene.options.length)
      result[scene.id] = value
  }
  return result
}
export function parseListeningCloud(rows: unknown, scenes: readonly ListeningQuestion[]): Record<string, number> {
  if (!Array.isArray(rows) || rows.length > scenes.length) throw new Error('无效的云端听力数据。')
  const known = new Set(scenes.map(scene => scene.id))
  const raw: Record<string, unknown> = {}
  for (const row of rows) {
    if (!row || typeof row !== 'object' || typeof row.scene_id !== 'string' ||
      !known.has(row.scene_id) || row.scene_id in raw ||
      !Number.isInteger(row.answer_index) || row.answer_index < 0 || row.answer_index > 3)
      throw new Error('云端听力数据不完整。')
    raw[row.scene_id] = row.answer_index
  }
  return validListeningAnswers(raw, scenes)
}
export function mergeListeningCloud(
  local: Record<string, number>, cloud: Record<string, number>, scenes: readonly ListeningQuestion[],
): Record<string, number> { return validListeningAnswers({ ...local, ...cloud }, scenes) }
export function pendingListeningAnswers(
  local: Record<string, number>, cloud: Record<string, number>, scenes: readonly ListeningQuestion[],
): ListeningAnswer[] {
  return scenes.filter(scene => scene.id in local && !(scene.id in cloud))
    .map(scene => ({ scene_id: scene.id, answer_index: local[scene.id] }))
}
