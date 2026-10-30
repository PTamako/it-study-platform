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
