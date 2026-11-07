import type { DailyWordReview } from './daily-language-scenes'
export type WordReviewMap = Record<string, DailyWordReview>

/** Cloud wins ties; a newer offline study date must not be overwritten. */
export function mergeDailyWordSnapshots(local: WordReviewMap, cloud: WordReviewMap): WordReviewMap {
  const merged: WordReviewMap = { ...local }
  for (const [key, remote] of Object.entries(cloud)) {
    if (!merged[key] || remote.lastDate >= merged[key].lastDate) merged[key] = remote
  }
  return merged
}

export function pendingDailyWordSnapshots(local: WordReviewMap, cloud: WordReviewMap): WordReviewMap {
  return Object.fromEntries(Object.entries(local).filter(([key, state]) =>
    state?.lastDate && (!cloud[key] || state.lastDate > cloud[key].lastDate)))
}

export function sameDayWordConflict(local: DailyWordReview | undefined, cloud: DailyWordReview | undefined): boolean {
  return Boolean(local && cloud && local.lastDate === cloud.lastDate && (local.streak !== cloud.streak || local.nextDate !== cloud.nextDate))
}
