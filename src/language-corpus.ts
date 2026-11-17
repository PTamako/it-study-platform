// Public licensed sentence cards are delivered as fingerprinted static assets.
// On iOS a previously installed service worker may point an old manifest at a
// removed asset; the shared loader retries with a fresh manifest and validates
// JSON before it reaches the Vue lesson view. Never query private learner D1.
import {fetchPublishedStudyItems} from './published-study-assets'
export type CorpusLanguage = 'ja' | 'en'
export type CorpusCard = { id: string; language: CorpusLanguage; term: string; highlight_json?: string }
export async function fetchLanguageCorpus<T extends CorpusCard>(
 language:CorpusLanguage,signal?:AbortSignal,
):Promise<T[]>{
 return fetchPublishedStudyItems<T>('language-cards',language,signal)
}
