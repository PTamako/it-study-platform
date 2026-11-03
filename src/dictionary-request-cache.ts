/**
 * Short-lived, in-memory cache for successful public dictionary lookups.
 * No account data or AI answers are persisted to localStorage, IndexedDB or D1.
 */
export class DictionaryRequestCache<T> {
  private readonly settled = new Map<string, { value: T; expiresAt: number }>()
  private readonly pending = new Map<string, Promise<T>>()
  private generation = 0

  constructor(
    private readonly ttlMs = 5 * 60 * 1000,
    private readonly maxEntries = 48,
    private readonly now: () => number = () => Date.now(),
  ) {}

  lookup(key: string, load: () => Promise<T>, cacheable: (value: T) => boolean = () => true): Promise<T> {
    const cached = this.settled.get(key)
    if (cached && cached.expiresAt > this.now()) {
      // Refresh LRU position on a cache hit.
      this.settled.delete(key)
      this.settled.set(key, cached)
      return Promise.resolve(cached.value)
    }
    if (cached) this.settled.delete(key)
    const existing = this.pending.get(key)
    if (existing) return existing

    const generation = this.generation
    let task: Promise<T>
    task = Promise.resolve().then(load).then(value => {
      // A request canceled by a later edit must never populate the cache.
      if (generation === this.generation && cacheable(value)) {
        this.settled.delete(key)
        this.settled.set(key, { value, expiresAt: this.now() + this.ttlMs })
        while (this.settled.size > this.maxEntries) {
          const oldest = this.settled.keys().next().value
          if (oldest === undefined) break
          this.settled.delete(oldest)
        }
      }
      return value
    }).finally(() => {
      if (this.pending.get(key) === task) this.pending.delete(key)
    })
    this.pending.set(key, task)
    return task
  }

  /** Call when aborting a previous lookup; completed entries remain reusable. */
  forgetPending(): void {
    this.generation++
    this.pending.clear()
  }

  /** Also call when the login session changes to avoid cross-session reuse. */
  clear(): void {
    this.forgetPending()
    this.settled.clear()
  }
}
