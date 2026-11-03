/** Calendar date used by the server, independent of the device timezone. */
export function tokyoDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** Only apply a cloud response to tasks untouched since the request started. */
export function mergeDailyTaskStates<T extends { id: string; done: boolean }>(
  current: T[], cloud: Array<{ task_id: string; completed: number }>, unchanged: (id: string) => boolean,
): T[] {
  const states = new Map(cloud.map(item => [item.task_id, Boolean(item.completed)]))
  return current.map(task => unchanged(task.id) && states.has(task.id)
    ? { ...task, done: states.get(task.id)! }
    : task)
}

/** Upgrade today's checklist with both language lessons without erasing any
 * existing task or completion. Legacy generic-language rows are preserved;
 * new IDs are never inferred complete from an old generic-language checkbox.
 */
export function mergeDailyTaskTemplates<T extends {
  id: string; title: string; detail: string; minutes: number; done: boolean
}>(stored: unknown, templates: readonly T[]): T[] {
  const valid = Array.isArray(stored) ? stored.filter((item): item is T =>
    item !== null && typeof item === 'object' &&
    typeof item.id === 'string' && !!item.id &&
    typeof item.title === 'string' && typeof item.detail === 'string' &&
    typeof item.minutes === 'number' && Number.isFinite(item.minutes) && item.minutes >= 0 &&
    typeof item.done === 'boolean',
  ) : []
  const templatesById = new Map(templates.map(item => [item.id, item]))
  const seen = new Set<string>()
  const retained: T[] = []
  for (const item of valid) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    const template = templatesById.get(item.id)
    retained.push(template ? { ...template, done: item.done } : { ...item })
  }
  for (const template of templates) {
    if (seen.has(template.id)) continue
    retained.push({ ...template, done: false })
    seen.add(template.id)
  }
  return retained
}
