import { readFileSync } from 'node:fs'

// Legacy Worker endpoint regression tests run the Worker in an isolated data URL
// or temporary .mts module. Inline the real lexical provider implementation so
// relative imports resolve without network access or special TS loaders.
const moduleSource = readFileSync(new URL('../worker/chinese-word-dictionary.ts', import.meta.url), 'utf8')
const providerImport = "import { eligibleChineseWord, fetchChineseWordMetadata } from './chinese-word-dictionary'"
const studyIdentityImport = "import { homeflowStudyIdentity } from './homeflow-identity'"
const studyVocabularyImport = "import { homeflowVocabulary } from './homeflow-vocabulary'"
const studyDailyImport = "import { homeflowDailyTasks } from './homeflow-daily-tasks'"
const studyGrammarImport = "import { homeflowGrammar } from './homeflow-grammar'"
const studyListeningImport = "import { homeflowListening } from './homeflow-listening'"
const studyWordsImport = "import { homeflowDailyWords } from './homeflow-daily-words'"
const studyLanguageImport = "import { homeflowLanguage } from './homeflow-language'"
const studyExamsImport = "import { homeflowExams } from './homeflow-exams'"
const studyMockImport = "import { homeflowMockExam } from './homeflow-mock'"
const studyMockReceiptsImport = "import { homeflowMockReceipts } from './homeflow-mock-receipts'"

export function inlineChineseDictionary(workerSource) {
  if (!workerSource.includes(providerImport)) throw new Error('Chinese dictionary import no longer matches test loader')
  // Existing single-user Worker tests load isolated data: URLs. A relative
  // identity-only SSO module import cannot resolve there; those tests exercise
  // only legacy routes and must NEVER treat an SSO token as legacy auth.
  const withProvider = workerSource.replace(providerImport, moduleSource)
  return withProvider
    .replace(studyIdentityImport,
      "const homeflowStudyIdentity = async () => new Response('SSO disabled', {status:503})")
    .replace(studyVocabularyImport,
      "const homeflowVocabulary = async () => new Response('per-user vocabulary disabled', {status:503})")
    .replace(studyDailyImport,
      "const homeflowDailyTasks = async () => new Response('per-user daily tasks disabled', {status:503})")
    .replace(studyGrammarImport,
      "const homeflowGrammar = async () => new Response('per-user grammar disabled', {status:503})")
    .replace(studyListeningImport,
      "const homeflowListening = async () => new Response('per-user listening disabled', {status:503})")
    .replace(studyWordsImport,
      "const homeflowDailyWords = async () => new Response('per-user words disabled', {status:503})")
    .replace(studyLanguageImport,
      "const homeflowLanguage = async () => new Response('per-user language disabled', {status:503})")
    .replace(studyExamsImport,
      "const homeflowExams = async () => new Response('per-user exams disabled', {status:503})")
    .replace(studyMockImport,
      "const homeflowMockExam = async () => new Response('per-user mock exams disabled', {status:503})")
    .replace(studyMockReceiptsImport,
      "const homeflowMockReceipts = async () => new Response('mock receipts disabled', {status:503})")
}
