// Validation of saved active mock exams is intentionally independent of Vue.
// Never silently resume an incomplete or mismatched question list.
export type MockSnapshot<T> = {
  track: 'exam-sg' | 'exam-fe'
  section: 'SG' | 'A' | 'B'
  questions: T[]
  answers: Record<string, string>
  started_at: number
  deadline: number
  duration_minutes: number
}
export function parseMockSnapshot<T>(raw: unknown): MockSnapshot<T> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const s = raw as Record<string, unknown>
  if (s.track !== 'exam-sg' && s.track !== 'exam-fe') return null
  if (s.track === 'exam-sg' ? s.section !== 'SG' : s.section !== 'A' && s.section !== 'B') return null
  const required = s.section === 'B' ? 20 : 60
  const expectedMinutes = s.track === 'exam-sg' ? 120 : s.section === 'A' ? 90 : 100
  if (s.duration_minutes !== expectedMinutes
    || !Number.isFinite(s.started_at) || !Number.isFinite(s.deadline)
    || (s.deadline as number) !== (s.started_at as number) + expectedMinutes * 60_000
    || !Array.isArray(s.questions) || s.questions.length !== required
    || !s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers)) return null
  const questions = s.questions as Array<Record<string, unknown>>
  const ids = new Set<string>()
  for (const q of questions) {
    if (!q || typeof q !== 'object' || typeof q.id !== 'string'
      || typeof q.prompt !== 'string' || typeof q.answer !== 'string'
      || q.track_id !== s.track || !Array.isArray(q.options)
      || !q.options.some((option: unknown) => option && typeof option === 'object' &&
        (option as { id?: unknown }).id === q.answer)
      || ids.has(q.id)) return null
    ids.add(q.id)
  }
  const answers = s.answers as Record<string, unknown>
  for (const [id, answer] of Object.entries(answers)) {
    if (!ids.has(id) || typeof answer !== 'string' || answer.length > 10) return null
  }
  return s as MockSnapshot<T>
}
