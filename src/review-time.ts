/** D1 CURRENT_TIMESTAMP is UTC even though it omits the timezone suffix. */
export function utcReviewMillis(value: string): number {
  if (!value || typeof value !== 'string') return Number.POSITIVE_INFINITY
  const normalized = value.trim().replace(' ', 'T')
  const withZone = /(Z|[+-]\\d{2}:\\d{2})$/i.test(normalized) ? normalized : normalized + 'Z'
  const epoch = Date.parse(withZone)
  return Number.isFinite(epoch) ? epoch : Number.POSITIVE_INFINITY
}
