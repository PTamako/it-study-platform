<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { hydrateMastery, mergeExamHistory, restoreMasteredCard } from './progress-sync'
import { tokyoDate, mergeDailyTaskStates } from './daily-tasks'
import { utcReviewMillis } from './review-time'
import { fetchVocabularySnapshot } from './vocabulary-sync'
import { parseMockSnapshot, type MockSnapshot } from './mock-recovery'
import {
  BookOpen, Languages, Search, GraduationCap,
  ChevronRight, ChevronDown, Sparkles, Clock3, Flame, Bookmark, Volume2, ArrowRight,
  ShieldCheck, BookMarked, Menu, X, CheckCircle2, Target, TrendingUp, ListChecks, PlusCircle,
} from 'lucide-vue-next'

type ModuleId = 'home' | 'exam' | 'practical' | 'language' | 'dictionary'

const authenticated = ref(false)
const authReady = ref(false)
const authConfigured = ref(true)
const authPassword = ref('')
const authError = ref('')
const authLoading = ref(false)

async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session', { cache: 'no-store' })
    const result = await response.json() as { authenticated?: boolean; configured?: boolean }
    authConfigured.value = result.configured !== false
    authenticated.value = response.ok && result.authenticated === true
  } catch {
    authenticated.value = false
    dailyHydrationRun++
    authError.value = '暂时无法连接登录服务，请检查网络后重试。'
  } finally {
    authReady.value = true
  }
}

async function login() {
  authLoading.value = true
  authError.value = ''
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: authPassword.value }),
    })
    const result = await response.json() as { error?: string; authenticated?: boolean }
    if (!response.ok || result.authenticated !== true) throw new Error(result.error || '登录失败，请稍后重试。')
    authenticated.value = true
    authPassword.value = ''
    void syncExamHistory()
    void hydrateCloudProgress()
    void refreshDailyTasks(todayKey.value)
    void reconcilePriorDailyTasks()
    restoreMockReview()
    restoreActiveMockExam()
    void syncPendingMockSubmission()
    void syncPendingPracticeAttempt()
    void syncPendingScenarioAttempt()
  } catch (error) {
    authError.value = error instanceof Error ? error.message : '登录失败，请稍后重试。'
  } finally {
    authLoading.value = false
  }
}

async function logout() {
  if (authLoading.value) return
  authLoading.value = true
  authError.value = ''
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw new Error('退出登录失败，请检查网络后重试。')
    authenticated.value = false
    feBankPrepared.value = false
    masterySyncGeneration++
    dailyHydrationRun++
    languageProgressReady.value = false
    authPassword.value = ''
  } catch {
    authError.value = '退出登录失败，请检查网络后重试。'
  } finally {
    authLoading.value = false
  }
}
let masterySyncGeneration = 0
const activeModule = ref<ModuleId>('home')
const searchText = ref('')
const dictSourceLang = ref<'auto' | 'ja' | 'en' | 'zh' | 'it'>('auto')
const dictionaryView = ref<'search' | 'saved'>('search')
const studyLanguage = ref<'ja' | 'en'>(readStored('zhixue:study-language', 'ja'))
const selectedLanguageCategory = ref('全部')
const completedLanguageCards = ref<string[]>(readStored('zhixue:completed-language-cards', []))
const showMobileMenu = ref(false)
const savedWords = ref<string[]>(readStored('zhixue:saved-words', []))

type StudyTask = { id: string; title: string; detail: string; minutes: number; done: boolean }
type ExamRecord = { id?: string; date: string; correct: number; total: number; exam: string }
const todayKey = ref(tokyoDate())
const defaultTasks: StudyTask[] = [
  { id: 'sg-review', title: '复习 SG 日语关键词', detail: '法律 / 技术 / 管理术语', minutes: 15, done: false },
  { id: 'sg-questions', title: '完成一组考试练习', detail: '建议 5 道题，逐题看解析', minutes: 15, done: false },
  { id: 'language', title: '语言轻量练习', detail: '日语或英语任选一个方向', minutes: 10, done: false },
]
function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}
const tasks = ref<StudyTask[]>(readStored('zhixue:tasks:' + todayKey.value, defaultTasks.map(task => ({ ...task }))))
type CloudDashboard = {
  generated_from: string
  exam: { attempted_questions: number; correct_answers: number; accuracy_percent: number | null }
  practical: { completed_scenarios: number; average_score: number }
  language: { mastered_cards: number; tracked_cards: number }
  vocabulary: { saved_terms: number }
  today: { tasks_completed: number; tasks_tracked: number }
}
const cloudDashboard = ref<CloudDashboard | null>(null)
const cloudDashboardError = ref('')
async function loadCloudDashboard() {
  try {
    const response = await fetch('/api/dashboard')
    const data = await response.json() as CloudDashboard & { error?: string }
    if (!response.ok) throw new Error(data.error || '云端学习统计暂不可用')
    cloudDashboard.value = data
    cloudDashboardError.value = ''
  } catch (error) {
    cloudDashboardError.value = error instanceof Error ? error.message : '云端学习统计暂不可用'
  }
}
const dailyTaskSaveQueues = new Map<string, Promise<void>>()
const dailyTaskSaveRequestIds = new Map<string, number>()
type PendingDailyTask = { id: string; date: string; taskId: string; base: boolean; completed: boolean }
const storedDailyPending = readStored<unknown>('zhixue:daily-pending-v1', [])
const pendingDailyTasks = reactive(new Map<string, PendingDailyTask>())
const dailyCloudStates = reactive(new Map<string, boolean>())
if (Array.isArray(storedDailyPending)) {
  for (const item of storedDailyPending) {
    if (item && typeof item.id === 'string' && typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.taskId === 'string' && typeof item.base === 'boolean' && typeof item.completed === 'boolean') {
      pendingDailyTasks.set(item.date + ':' + item.taskId, item)
    }
  }
}
function applyPendingDailyTasks(date: string) {
  tasks.value = tasks.value.map(task => {
    const pending = pendingDailyTasks.get(date + ':' + task.id)
    return pending ? { ...task, done: pending.completed } : task
  })
}
applyPendingDailyTasks(todayKey.value)
function persistDailyPending() {
  try { localStorage.setItem('zhixue:daily-pending-v1', JSON.stringify([...pendingDailyTasks.values()])) }
  catch { cloudDashboardError.value = '本设备存储不可用，待同步任务可能无法保留。' }
}
async function saveDailyTask(task: StudyTask, previousDone: boolean, replay?: PendingDailyTask) {
  const taskId = task.id
  const date = replay?.date || todayKey.value
  const queueKey = date + ':' + taskId
  const completed = replay?.completed ?? task.done
  const prior = pendingDailyTasks.get(queueKey)
  const intent = replay || { id: String(Date.now()) + '-' + Math.random(), date, taskId, base: prior?.base ?? previousDone, completed }
  pendingDailyTasks.set(queueKey, intent)
  persistDailyPending()
  const requestId = (dailyTaskSaveRequestIds.get(queueKey) || 0) + 1
  dailyTaskSaveRequestIds.set(queueKey, requestId)

  // Serialize writes for each task so a slow earlier toggle cannot overwrite the latest choice.
  const previous = dailyTaskSaveQueues.get(queueKey) || Promise.resolve()
  const pending = previous.catch(() => undefined).then(async () => {
    try {
      const response = await fetch('/api/daily-tasks', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, study_date: date, completed }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error || '每日任务云端保存失败')
      }
      const remaining = pendingDailyTasks.get(queueKey)
      if (remaining?.id === intent.id) pendingDailyTasks.delete(queueKey)
      else if (remaining) pendingDailyTasks.set(queueKey, { ...remaining, base: completed })
      persistDailyPending()
      if (todayKey.value === date && dailyTaskSaveRequestIds.get(queueKey) === requestId) {
        cloudDashboardError.value = ''
        void loadCloudDashboard()
      }
    } catch (error) {
      if (todayKey.value === date && dailyTaskSaveRequestIds.get(queueKey) === requestId) {
        cloudDashboardError.value = error instanceof Error ? error.message : '网络异常：每日任务暂未同步到云端。'
      }
    }
  })
  dailyTaskSaveQueues.set(queueKey, pending)
  await pending
  if (dailyTaskSaveQueues.get(queueKey) === pending) dailyTaskSaveQueues.delete(queueKey)
}
let dailyHydrationRun = 0
function rolloverDailyTasks() {
  const next = tokyoDate()
  if (next === todayKey.value) return
  // The synchronous watcher has already persisted the prior day's latest value.
  todayKey.value = next
  tasks.value = readStored('zhixue:tasks:' + next, defaultTasks.map(task => ({ ...task })))
  applyPendingDailyTasks(next)
  if (authenticated.value) { void refreshDailyTasks(next); void reconcilePriorDailyTasks() }
}
async function reconcilePriorDailyTasks() {
  const generation = dailyHydrationRun
  const pending = [...pendingDailyTasks.values()].filter(item => item.date !== todayKey.value)
  for (const item of pending) {
    if (!authenticated.value || generation !== dailyHydrationRun) return
    const key = item.date + ':' + item.taskId
    if (dailyTaskSaveQueues.has(key) || pendingDailyTasks.get(key)?.id !== item.id) continue
    try {
      const response = await fetch('/api/daily-tasks?date=' + encodeURIComponent(item.date))
      if (!response.ok) continue
      const data = await response.json() as { items?: Array<{ task_id: string; completed: number }> }
      if (!authenticated.value || generation !== dailyHydrationRun) return
      if (!Array.isArray(data.items) || pendingDailyTasks.get(key)?.id !== item.id) continue
      const cloud = Boolean(data.items.find(row => row.task_id === item.taskId)?.completed)
      dailyCloudStates.set(key, cloud)
      if (cloud === item.completed) { pendingDailyTasks.delete(key); persistDailyPending() }
      else cloudDashboardError.value = '此前的每日任务尚未同步，请在学习计划中处理。'
    } catch { /* Retain the pending action until a later retry. */ }
  }
}
function toggleDailyTask(id: string, checked: boolean) {
  const previousDate = todayKey.value
  rolloverDailyTasks()
  const task = tasks.value.find(item => item.id === id)
  if (!task) return
  const previousDone = task.done
  task.done = previousDate === todayKey.value ? checked : !task.done
  void saveDailyTask(task, previousDone)
}
async function refreshDailyTasks(date: string) {
  const run = ++dailyHydrationRun
  const initial = tasks.value.map(task => ({ ...task }))
  const revisions = new Map(initial.map(task => [task.id, dailyTaskSaveRequestIds.get(date + ':' + task.id) || 0]))
  const pendingIds = new Set(initial.filter(task => dailyTaskSaveQueues.has(date + ':' + task.id)).map(task => task.id))
  try {
    // Atomic import cannot undo a newer change from another device.
    const results = await Promise.all(initial.filter(task => task.done && !pendingDailyTasks.has(date + ':' + task.id)).map(task => fetch('/api/daily-tasks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, study_date: date, completed: true, import_only: true }),
    })))
    if (run !== dailyHydrationRun || !authenticated.value || todayKey.value !== date) return
    if (results.some(response => !response.ok)) throw new Error('部分每日任务尚未同步，本设备数据已保留。')
    const response = await fetch('/api/daily-tasks?date=' + encodeURIComponent(date))
    if (!response.ok) throw new Error('每日任务暂时无法读取，本设备数据已保留。')
    const data = await response.json() as { items?: Array<{ task_id: string; completed: number }> }
    if (!Array.isArray(data.items)) throw new Error('每日任务返回格式异常，本设备数据已保留。')
    if (run !== dailyHydrationRun || !authenticated.value || todayKey.value !== date) return
    const cloudStates = new Map(data.items.map(item => [item.task_id, Boolean(item.completed)]))
    for (const pending of [...pendingDailyTasks.values()]) {
      if (pending.date !== date || pendingIds.has(pending.taskId)) continue
      const key = date + ':' + pending.taskId
      if (pendingDailyTasks.get(key)?.id !== pending.id) continue
      const cloud = cloudStates.get(pending.taskId) ?? false
      dailyCloudStates.set(key, cloud)
      if (cloud === pending.completed) {
        pendingDailyTasks.delete(key)
        persistDailyPending()
      } else {
        cloudDashboardError.value = '每日任务尚未同步，请在学习计划中处理。'
      }
    }
    tasks.value = mergeDailyTaskStates(tasks.value, data.items, id =>
      !pendingIds.has(id) && !pendingDailyTasks.has(date + ':' + id) && (dailyTaskSaveRequestIds.get(date + ':' + id) || 0) === revisions.get(id))
  } catch (error) {
    if (run === dailyHydrationRun && authenticated.value && todayKey.value === date) cloudDashboardError.value = error instanceof Error ? error.message : '每日任务同步失败。'
  }
}
function retryPendingDailyTask(intent: PendingDailyTask) {
  const key = intent.date + ':' + intent.taskId
  if (!authenticated.value || dailyTaskSaveQueues.has(key) || pendingDailyTasks.get(key)?.id !== intent.id) return
  void saveDailyTask({ id: intent.taskId, done: intent.completed } as StudyTask, intent.base, intent)
}
let dailyRolloverTimer: ReturnType<typeof setInterval> | undefined
function onDailyVisibilityChange() { if (document.visibilityState === 'visible') rolloverDailyTasks() }
const examRecords = ref<ExamRecord[]>(readStored('zhixue:exam-records', []))
const examHistorySyncing = ref(false)
const dailyGoalMinutes = ref(40)
const completedMinutes = computed(() => tasks.value.filter(task => task.done).reduce((sum, task) => sum + task.minutes, 0))
const dailyPercent = computed(() => Math.min(100, Math.round(completedMinutes.value / dailyGoalMinutes.value * 100)))
const totalAnswered = computed(() => examRecords.value.reduce((sum, record) => sum + record.total, 0))
const totalCorrect = computed(() => examRecords.value.reduce((sum, record) => sum + record.correct, 0))
const overallAccuracy = computed(() => totalAnswered.value ? Math.round(totalCorrect.value / totalAnswered.value * 100) : null)
const latestRecord = computed(() => examRecords.value.length ? examRecords.value[examRecords.value.length - 1] : null)
const curveRecords = computed(() => {
  const days: { date: string; label: string; accuracy: number | null; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayKey.value + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    const records = examRecords.value.filter(record => record.date === key)
    const total = records.reduce((sum, record) => sum + record.total, 0)
    const correct = records.reduce((sum, record) => sum + record.correct, 0)
    days.push({ date: key, label: (d.getUTCMonth() + 1) + '/' + d.getUTCDate(), accuracy: total ? Math.round(correct / total * 100) : null, count: total })
  }
  return days
})
watch(tasks, value => { try { localStorage.setItem('zhixue:tasks:' + todayKey.value, JSON.stringify(value)) } catch { cloudDashboardError.value = '本设备存储不可用，每日任务可能无法离线保留。' } }, { deep: true, flush: 'sync' })
watch(examRecords, value => localStorage.setItem('zhixue:exam-records', JSON.stringify(value)), { deep: true })

// 将旧版本保存在浏览器的手动成绩记录迁移到 D1。先上传，再读取云端；每条记录带稳定 ID，失败时保留本地副本。
let examHistorySyncStarted = false
async function syncExamHistory() {
  if (examHistorySyncStarted) return
  examHistorySyncStarted = true
  examHistorySyncing.value = true
  try {
    const localRecords = examRecords.value.map(record => {
      const id = (record as ExamRecord & { id?: string }).id || crypto.randomUUID()
      return { ...record, id }
    })
    examRecords.value = localRecords
    let uploadFailed = false
    for (const record of localRecords) {
      try {
        const response = await fetch('/api/exam-history', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify(record),
        })
        if (!response.ok) uploadFailed = true
      } catch { uploadFailed = true }
    }
    const response = await fetch('/api/exam-history')
    if (!response.ok) throw new Error('云端考试历史暂不可用')
    const data = await response.json() as { items?: Array<ExamRecord & { id: string }> }
    // If any upload failed, do not replace local data with an incomplete cloud list.
    if (!uploadFailed) {
      examRecords.value = mergeExamHistory(data.items || [], examRecords.value, localRecords.map(record => record.id))
    } else {
      cloudDashboardError.value = '部分本地考试记录尚未同步，原始记录仍保留在本设备。'
    }
  } catch {
    cloudDashboardError.value = '考试记录暂未完成云端迁移；本地数据仍保留。'
  } finally {
    examHistorySyncStarted = false
    examHistorySyncing.value = false
  }
}
async function saveExamRecord(record: ExamRecord) {
  const savedRecord = { ...record, id: record.id || crypto.randomUUID() }
  examRecords.value.push(savedRecord)
  try {
    const response = await fetch('/api/exam-history', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(savedRecord),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || '考试成绩未能同步到云端。')
    cloudDashboardError.value = ''
    void loadCloudDashboard()
  } catch (error) {
    cloudDashboardError.value = error instanceof Error
      ? error.message + ' 成绩仍保留在本设备，之后可重试同步。'
      : '考试成绩未能同步到云端；本地记录仍保留。'
  }
}
function addExamRecord() {
  const exam = window.prompt('记录哪项考试？例如 SG', 'SG')
  if (!exam?.trim()) return
  const totalRaw = window.prompt('本次共做了多少题？请输入题目总数')
  if (totalRaw === null) return
  const total = Number(totalRaw)
  if (!Number.isInteger(total) || total <= 0) { window.alert('请填写大于 0 的整数题数。'); return }
  const correctRaw = window.prompt('答对了多少题？', String(total))
  if (correctRaw === null) return
  const correct = Number(correctRaw)
  if (!Number.isInteger(correct) || correct < 0 || correct > total) { window.alert('答对题数应为 0 到总题数之间的整数。'); return }
  void saveExamRecord({ date: tokyoDate(), correct, total, exam: exam.trim().toUpperCase() })
}
async function removeExamRecords() {
  if (!window.confirm('确定清除全部历史考试成绩吗？云端和本设备记录都会删除，且无法恢复。')) return
  const confirmation = window.prompt('二次确认：此操作无法恢复。请输入「清除」以继续。')
  if (confirmation !== '清除') return
  try {
    const response = await fetch('/api/exam-history', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirmation }) })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || '云端记录清除失败。')
    examRecords.value = []
    localStorage.setItem('zhixue:exam-records', '[]')
    cloudDashboardError.value = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : '记录清除失败，请检查网络后重试。'
    cloudDashboardError.value = message
    window.alert(message + ' 原有记录未从页面清除。')
  }
}

type PracticeOption = { id: string; text: string }
type QuestionReviewProgress = { question_id: string; review_count: number; correct_streak: number; last_result: 'again' | 'remembered'; next_review_at: string; mastered: number }
const questionProgressById = ref<Record<string, QuestionReviewProgress>>({})
let questionProgressRequestId = 0
let practiceLoadRequestId = 0
let practiceAnswerRequestId = 0
type PracticeQuestion = {
  id: string; track_id: string; topic: string; difficulty: string; prompt: string;
  options: PracticeOption[]; answer: string; explanation: string; source_type: string; source_reference?: string; language: string; exam_section?: 'A' | 'B' | null; exam_section_method?: 'explicit' | 'case_pattern' | 'default_a' | 'unclassified' | null
}
// IPA FE questions use Japanese answer labels ア～コ; internal answer IDs remain a～j.
function practiceOptionLabel(question: PracticeQuestion, optionId: string): string {
  if (question.track_id === 'exam-fe' && question.source_type === 'official') {
    const index = 'abcdefghij'.indexOf(optionId.toLowerCase())
    if (index >= 0) return 'アイウエオカキクケコ'[index]
  }
  return optionId.toUpperCase()
}
type QuestionExplanationTranslation = { source_text: string; translation_zh: string }
const questionExplanationTranslations = ref<Record<string, QuestionExplanationTranslation>>(readStored('zhixue:question-explanation-zh', {}))
const questionExplanationTranslating = ref<Record<string, boolean>>({})
const questionExplanationTranslationErrors = ref<Record<string, string>>({})
watch(questionExplanationTranslations, value => localStorage.setItem('zhixue:question-explanation-zh', JSON.stringify(value)), { deep: true })
const quizQuestions = ref<PracticeQuestion[]>([])
const quizIndex = ref(0)
const selectedOption = ref('')
const quizSubmitted = ref(false)
const quizLoading = ref(false)
const quizError = ref('')
const quizCorrect = ref(0)
const questionBankTotal = ref(0)
const questionBatchOffset = ref(0)
const questionBatchSize = 10
const questionBankHasMore = ref(false)
const practiceYear = ref('')
const practiceSection = ref<'all' | 'A' | 'B'>('all')
const practiceTopic = ref('')
const practiceTopicOptions = ref<{ topic: string; question_count: number }[]>([])
let practiceTopicLoadId = 0
const practiceYearOptions = computed(() => selectedTrackId.value === 'exam-sg'
  ? [2026, 2025, 2024, 2023, 2019, 2018, 2017, 2016]
  : [2026, 2025, 2024, 2023, 2019])
const practiceHasDetailedFilters = computed(() => selectedTrackId.value === 'exam-fe' || selectedTrackId.value === 'exam-sg')
type ExamTrack = { id: string; kind: string; title: string; subtitle: string; question_count: number; official_question_count?: number; prediction_question_count?: number; adapted_question_count?: number }
const examTracks = ref<ExamTrack[]>([])
const selectedTrackId = ref('exam-sg')
const tracksLoading = ref(false)
const tracksError = ref('')
const questionSourceFilter = ref<'all' | 'official' | 'generated' | 'licensed'>('all')
const activeReviewMode = ref<'all' | 'unlearned' | 'mastered' | 'due' | 'wrong'>('all')
const questionSourceFilters = [
  { id: 'all', label: '全部题目' },
  { id: 'official', label: '历年真题' },
  { id: 'generated', label: '预测题库' },
  { id: 'licensed', label: '真题改编' },
] as const
const selectedTrack = computed(() => examTracks.value.find(track => track.id === selectedTrackId.value) || null)
const quizStartedAt = ref(0)
const quizFinished = ref(false)
const currentQuestion = computed(() => quizQuestions.value[quizIndex.value] || null)
const isLastQuestion = computed(() => quizIndex.value >= quizQuestions.value.length - 1)

// 限时模拟考试：独立于逐题练习，交卷前不展示答案和解析。
const feMockSection = ref<'A' | 'B'>('A')
const mockQuestions = ref<PracticeQuestion[]>([])
const mockAnswers = ref<Record<string, string>>({})
const mockStarted = ref(false)
const mockSubmitted = ref(false)
const mockLoading = ref(false)
const mockError = ref('')
const mockDeadline = ref(0)
const mockStartedAt = ref(0)
const mockNow = ref(Date.now())
const mockDurationMinutes = ref(30)
const MOCK_ACTIVE_KEY = 'zhixue:mock-active-v1'
const MOCK_REVIEW_KEY = 'zhixue:mock-review-v1'
const mockStorageWarning = ref('')
let mockTimer: ReturnType<typeof setInterval> | undefined
function persistActiveMockExam() {
  if (!mockStarted.value) return
  const snapshot: MockSnapshot<PracticeQuestion> = {
    track: selectedTrackId.value === 'exam-fe' ? 'exam-fe' : 'exam-sg',
    section: selectedTrackId.value === 'exam-fe' ? feMockSection.value : 'SG',
    questions: mockQuestions.value,
    answers: mockAnswers.value,
    started_at: mockStartedAt.value,
    deadline: mockDeadline.value,
    duration_minutes: mockDurationMinutes.value,
  }
  try {
    localStorage.setItem(MOCK_ACTIVE_KEY, JSON.stringify(snapshot))
    mockStorageWarning.value = ''
  } catch {
    mockStorageWarning.value = '本机空间不足，模拟考试无法保存中途进度。请勿刷新页面。'
  }
}
watch([mockStarted, mockAnswers], persistActiveMockExam, { deep: true, flush: 'sync' })
function restoreActiveMockExam() {
  if (!authenticated.value || mockStarted.value || mockPendingSubmission.value) return
  const raw = readStored<unknown>(MOCK_ACTIVE_KEY, null)
  if (!raw) return
  const snapshot = parseMockSnapshot<PracticeQuestion>(raw)
  if (!snapshot) {
    mockError.value = '本机保存的模拟考试已损坏，未恢复旧答卷。'
    return
  }
  selectedTrackId.value = snapshot.track
  if (snapshot.track === 'exam-fe') feMockSection.value = snapshot.section === 'B' ? 'B' : 'A'
  mockQuestions.value = snapshot.questions
  mockAnswers.value = snapshot.answers
  mockStartedAt.value = snapshot.started_at
  mockDeadline.value = snapshot.deadline
  mockDurationMinutes.value = snapshot.duration_minutes
  mockNow.value = Date.now()
  mockSubmitted.value = false
  mockStarted.value = true
  if (mockTimer) clearInterval(mockTimer)
  mockTimer = setInterval(() => {
    mockNow.value = Date.now()
    if (mockRemainingSeconds.value <= 0) void finishMockExam(true)
  }, 500)
  if (mockRemainingSeconds.value <= 0) void finishMockExam(true)
}

// Keep a pending/graded review on the device when the browser reloads while
// the server is saving an exam. No answer keys are cached before grading.
function restoreMockReview() {
  if (!authenticated.value || mockStarted.value || mockQuestions.value.length) return
  const raw = readStored<unknown>(MOCK_REVIEW_KEY, null)
  const snapshot = parseMockSnapshot<PracticeQuestion>(raw)
  if (!snapshot || (!mockPendingSubmission.value && !(raw as { graded?: boolean }).graded)) return
  selectedTrackId.value = snapshot.track
  if (snapshot.track === 'exam-fe') feMockSection.value = snapshot.section === 'B' ? 'B' : 'A'
  mockQuestions.value = snapshot.questions
  mockAnswers.value = snapshot.answers
  mockSubmitted.value = true
  mockStarted.value = false
}

const mockRemainingSeconds = computed(() => mockStarted.value && !mockSubmitted.value
  ? Math.max(0, Math.ceil((mockDeadline.value - mockNow.value) / 1000))
  : 0)
const mockCorrectCount = computed(() => mockQuestions.value.filter(question => mockAnswers.value[question.id] === question.answer).length)
const mockAnsweredCount = computed(() => Object.values(mockAnswers.value).filter(Boolean).length)
const mockAccuracy = computed(() => mockQuestions.value.length ? Math.round(mockCorrectCount.value / mockQuestions.value.length * 100) : 0)
function formatMockTime(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
async function startMockExam() {
  if (mockPendingSubmission.value) { mockError.value = '上一次答卷尚未完成同步，请先点击重新同步。'; return }
  if (selectedTrackId.value === 'exam-fe' && feBankLoading.value) return
  const isFe = selectedTrack.value?.id === 'exam-fe'
  const required = isFe && feMockSection.value === 'B' ? 20 : 60
  if (!selectedTrack.value || selectedTrack.value.question_count < required) {
    mockError.value = `当前可用题量不足 ${required} 道，请先完成题库导入。`
    return
  }
  mockLoading.value = true
  mockError.value = ''
  try {
    const response = await fetch('/api/mock-exam-questions?track=' + encodeURIComponent(selectedTrack.value.id) + (isFe ? '&section=' + feMockSection.value : ''))
    const data = await response.json() as { items?: PracticeQuestion[]; error?: string; section?: string; duration_minutes?: number; section_counts?: { A: number; B: number } }
    if (!response.ok) throw new Error(data.error || '模拟考试题目加载失败')
    if (!data.items || data.items.length !== required || (isFe ? data.section !== feMockSection.value || data.duration_minutes !== (feMockSection.value === 'A' ? 90 : 100) : data.section_counts?.A !== 48 || data.section_counts?.B !== 12)) {
      throw new Error('组卷结果不符合所选考试的题型、题数或时间要求，请稍后重试。')
    }
    try { localStorage.removeItem(MOCK_REVIEW_KEY) } catch { /* best effort */ }
    mockQuestions.value = data.items
    mockAnswers.value = {}
    mockDurationMinutes.value = isFe ? (feMockSection.value === 'A' ? 90 : 100) : 120
    mockStartedAt.value = Date.now()
    mockDeadline.value = mockStartedAt.value + mockDurationMinutes.value * 60 * 1000
    mockNow.value = mockStartedAt.value
    mockStarted.value = true
    mockSubmitted.value = false
    if (mockTimer) clearInterval(mockTimer)
    mockTimer = setInterval(() => {
      mockNow.value = Date.now()
      if (mockRemainingSeconds.value <= 0) void finishMockExam(true)
    }, 500)
  } catch (error) {
    mockError.value = error instanceof Error ? error.message : '模拟考试启动失败，请稍后重试。'
  } finally {
    mockLoading.value = false
  }
}
type PendingMockSubmission = {
  submission_id: string
  track: string
  section: string
  study_date: string
  duration_seconds: number
  answers: Array<{ question_id: string; answer: string }>
}
const mockPendingSubmission = ref<PendingMockSubmission | null>(readStored('zhixue:mock-pending-v1', null))
const mockSyncing = ref(false)

async function syncPendingMockSubmission() {
  const pending = mockPendingSubmission.value
  if (!pending || mockSyncing.value || !authenticated.value) return
  mockSyncing.value = true
  try {
    const response = await fetch('/api/mock-exam/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pending),
    })
    const data = await response.json() as {
      error?: string; submission_id?: string; correct_count?: number; total?: number; exam_name?: string; study_date?: string
      review?: Array<{ id: string; answer: string; explanation: string }>
    }
    if (!response.ok || data.submission_id !== pending.submission_id || !Number.isInteger(data.correct_count) || data.total !== pending.answers.length) {
      throw new Error(data.error || '交卷结果暂未成功同步。')
    }
    if (!Array.isArray(data.review) || data.review.length !== pending.answers.length ||
      data.review.some(item => typeof item.id !== 'string' || typeof item.answer !== 'string' || typeof item.explanation !== 'string') ||
      new Set(data.review.map(item => item.id)).size !== pending.answers.length ||
      data.review.some(item => !pending.answers.some(answer => answer.question_id === item.id))) {
      throw new Error('交卷已保存，但复盘数据不完整，请使用原交卷编号重试。')
    }
    const reviewMap = new Map(data.review.map(item => [item.id, item]))
    mockQuestions.value = mockQuestions.value.map(question => {
      const review = reviewMap.get(question.id)
      return review ? { ...question, answer: review.answer, explanation: review.explanation } : question
    })
    const snapshot = readStored<MockSnapshot<PracticeQuestion> | null>(MOCK_REVIEW_KEY, null)
    if (snapshot) {
      try { localStorage.setItem(MOCK_REVIEW_KEY, JSON.stringify({ ...snapshot, questions: mockQuestions.value, graded: true })) }
      catch { /* server has the immutable graded receipt */ }
    }
    const record: ExamRecord = { id: pending.submission_id, date: pending.study_date,
      correct: data.correct_count!, total: data.total!, exam: data.exam_name || pending.track }
    if (!examRecords.value.some(item => item.id === record.id)) examRecords.value.push(record)
    mockPendingSubmission.value = null
    try { localStorage.removeItem('zhixue:mock-pending-v1') } catch { /* cloud receipt prevents duplicates */ }
    mockError.value = ''
    void loadCloudDashboard()
  } catch (error) {
    mockError.value = (error instanceof Error ? error.message : '网络异常。') + ' 答卷已保留在本设备，可点击「重新同步」。'
  } finally {
    mockSyncing.value = false
  }
}
async function finishMockExam(autoSubmit = false) {
  if (!mockStarted.value || mockSubmitted.value) return
  mockSubmitted.value = true
  mockStarted.value = false
  if (mockTimer) { clearInterval(mockTimer); mockTimer = undefined }
  const unanswered = mockQuestions.value.length - mockAnsweredCount.value
  mockError.value = autoSubmit ? '考试时间已到，未作答按错题计。'
    : unanswered ? '有 ' + unanswered + ' 道未作答题，按错题计。' : ''
  const submission: PendingMockSubmission = {
    submission_id: crypto.randomUUID(),
    track: selectedTrackId.value,
    section: selectedTrackId.value === 'exam-fe' ? feMockSection.value : 'SG',
    study_date: tokyoDate(),
    duration_seconds: Math.max(0, Math.min(86400, Math.floor((Date.now() - mockStartedAt.value) / 1000))),
    answers: mockQuestions.value.map(item => ({ question_id: item.id, answer: mockAnswers.value[item.id] || '' })),
  }
  mockPendingSubmission.value = submission
  try {
    localStorage.setItem(MOCK_REVIEW_KEY, JSON.stringify({
      track: selectedTrackId.value, section: submission.section,
      questions: mockQuestions.value, answers: mockAnswers.value,
      started_at: mockStartedAt.value, deadline: mockDeadline.value,
      duration_minutes: mockDurationMinutes.value, graded: false,
    }))
    localStorage.setItem('zhixue:mock-pending-v1', JSON.stringify(submission))
    localStorage.removeItem(MOCK_ACTIVE_KEY)
  } catch {
    mockError.value += ' 浏览器本地保存失败；请勿关闭此页面直到同步完成。'
  }
  await syncPendingMockSubmission()
}
onUnmounted(() => { if (mockTimer) clearInterval(mockTimer); if (dailyRolloverTimer) clearInterval(dailyRolloverTimer); document.removeEventListener('visibilitychange', onDailyVisibilityChange) })

type ScenarioOption = { id: string; text: string }
type PracticalScenario = {
  id: string; track_id: string; title: string; category: string; difficulty: string;
  situation: string; task: string; options: ScenarioOption[]; explanation?: string; source_type: string; exam_section?: 'A' | 'B' | null
}
type ScenarioExplanationTranslation = { source_text: string; translation_zh: string }
const scenarios = ref<PracticalScenario[]>([])
const scenariosLoading = ref(false)
const scenariosError = ref('')
const practicalSection = ref<'all' | 'A' | 'B'>('all')
const practicalCategory = ref('')
const practicalCategoryOptions = computed(() => [...new Set(scenarios.value
  .filter(item => practicalSection.value === 'all' || item.exam_section === practicalSection.value)
  .map(item => item.category))].sort((a, b) => a.localeCompare(b, 'ja')))
const visibleScenarios = computed(() => scenarios.value.filter(item =>
  (selectedTrackId.value !== 'exam-fe' || practicalSection.value === 'all' || item.exam_section === practicalSection.value)
  && (!practicalCategory.value || item.category === practicalCategory.value)))
const selectedScenarioId = ref('')
const selectedScenarioOption = ref('')
const scenarioSubmitting = ref(false)
const scenarioResult = ref<{ score: number; best_option: string; correct: boolean; feedback: string } | null>(null)
const scenarioExplanationTranslations = ref<Record<string, ScenarioExplanationTranslation>>(
  readStored('zhixue:scenario-explanations-zh', {}),
)
const scenarioExplanationTranslating = ref<Record<string, boolean>>({})
const scenarioExplanationTranslationErrors = ref<Record<string, string>>({})
watch(scenarioExplanationTranslations, value => {
  localStorage.setItem('zhixue:scenario-explanations-zh', JSON.stringify(value))
}, { deep: true })
const currentScenario = computed(() => visibleScenarios.value.find(item => item.id === selectedScenarioId.value) || visibleScenarios.value[0] || null)
const practicalPosition = computed(() => currentScenario.value
  ? visibleScenarios.value.findIndex(item => item.id === currentScenario.value?.id) + 1 : 0)
function resetScenarioSelection() {
  stopSpeech()
  scenarioSubmissionId += 1
  selectedScenarioId.value = ''
  selectedScenarioOption.value = ''
  scenarioResult.value = null
  scenariosError.value = ''
}
function selectPracticalSection(section: 'all' | 'A' | 'B') {
  if (practicalSection.value === section) return
  practicalSection.value = section
  practicalCategory.value = ''
  resetScenarioSelection()
}
function selectPracticalCategory(category: string) {
  if (practicalCategory.value === category) return
  practicalCategory.value = category
  resetScenarioSelection()
}
function getScenarioExplanationLanguage(text: string): 'ja-JP' | 'en-US' | 'zh-CN' {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP'
  if (/[a-z]{4,}/i.test(text) && !/[\u3400-\u9fff]/.test(text)) return 'en-US'
  if (/[\u3400-\u9fff]/.test(text)) return 'zh-CN'
  return 'ja-JP'
}

async function translateScenarioExplanation(scenarioId: string, text: string) {
  const sourceText = text.trim()
  if (!sourceText) return
  const source = getScenarioExplanationLanguage(sourceText)
  delete scenarioExplanationTranslationErrors.value[scenarioId]
  if (source === 'zh-CN') {
    scenarioExplanationTranslations.value[scenarioId] = {
      source_text: sourceText,
      translation_zh: sourceText,
    }
    return
  }
  const cached = scenarioExplanationTranslations.value[scenarioId]
  if (cached?.source_text === sourceText || scenarioExplanationTranslating.value[scenarioId]) return
  scenarioExplanationTranslating.value[scenarioId] = true
  try {
    const response = await fetch('/api/translate-explanation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: sourceText, source }),
    })
    const data = await response.json() as { translation?: string; error?: string }
    if (!response.ok || !data.translation) throw new Error(data.error || '在线中文解析暂时不可用。')
    scenarioExplanationTranslations.value[scenarioId] = {
      source_text: sourceText,
      translation_zh: data.translation,
    }
  } catch (error) {
    scenarioExplanationTranslationErrors.value[scenarioId] = error instanceof Error ? error.message : '中文解析翻译失败。'
  } finally {
    scenarioExplanationTranslating.value[scenarioId] = false
  }
}

function speakScenario(scenario: PracticalScenario | null) {
  if (!scenario) return
  const options = scenario.options.map(option => `${option.id.toUpperCase()}。 ${option.text}`).join('。')
  // 情境内容统一为日语；显式绑定当前情境，状态和控制按钮不会串到其他模块。
  speakJapaneseQuestion(`${scenario.title}。状況：${scenario.situation}。課題：${scenario.task}。選択肢：${options}`, `practical:${scenario.id}`)
}

let scenarioLoadRequestId = 0
async function loadScenarios() {
  const requestId = ++scenarioLoadRequestId
  const trackId = selectedTrack.value?.id
  if (!trackId) { scenarios.value = []; scenariosLoading.value = false; return }
  scenariosLoading.value = true
  scenariosError.value = ''
  scenarioResult.value = null
  selectedScenarioOption.value = ''
  try {
    const response = await fetch('/api/scenarios?track=' + encodeURIComponent(trackId))
    const data = await response.json() as { items?: PracticalScenario[]; error?: string }
    if (requestId !== scenarioLoadRequestId) return
    if (!response.ok) throw new Error(data.error || '实战任务加载失败')
    scenarios.value = data.items || []
    selectedScenarioId.value = scenarios.value[0]?.id || ''
  } catch (error) {
    if (requestId !== scenarioLoadRequestId) return
    scenariosError.value = error instanceof Error ? error.message : '实战任务加载失败，请稍后重试。'
    scenarios.value = []
  } finally {
    if (requestId === scenarioLoadRequestId) scenariosLoading.value = false
  }
}
let scenarioSubmissionId = 0
function nextScenario() {
  stopSpeech()
  // Invalidate any in-flight submission without unlocking it: a previous
  // request may still be writing and must retain the same idempotency key.
  scenarioSubmissionId += 1
  if (!visibleScenarios.value.length) return
  const index = visibleScenarios.value.findIndex(item => item.id === currentScenario.value?.id)
  const next = visibleScenarios.value[(index + 1) % visibleScenarios.value.length]
  selectedScenarioId.value = next.id
  selectedScenarioOption.value = ''
  scenarioResult.value = null
  scenariosError.value = ''
}

type PendingScenarioAttempt = {
  attempt_id: string
  scenario_id: string
  selected_option: string
  duration_seconds: number
}
const pendingScenarioAttempt = ref<PendingScenarioAttempt | null>(readStored('zhixue:scenario-pending-v1', null))
async function syncPendingScenarioAttempt() {
  const pending = pendingScenarioAttempt.value
  if (!pending || scenarioSubmitting.value || !authenticated.value) return
  const requestId = ++scenarioSubmissionId
  scenarioSubmitting.value = true
  scenariosError.value = ''
  try {
    const response = await fetch('/api/scenario-attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pending),
    })
    const data = await response.json() as {
      attempt_id?: string; score?: number; best_option?: string; correct?: boolean; feedback?: string; error?: string
    }
    if (!response.ok || data.attempt_id !== pending.attempt_id) {
      throw new Error(data.error || '实战结果尚未保存。')
    }
    if (pendingScenarioAttempt.value?.attempt_id === pending.attempt_id) {
      pendingScenarioAttempt.value = null
      try { localStorage.removeItem('zhixue:scenario-pending-v1') } catch { /* cloud result is durable */ }
    }
    if (requestId === scenarioSubmissionId && currentScenario.value?.id === pending.scenario_id) {
      const feedback = String(data.feedback || '')
      scenarioResult.value = {
        score: Number(data.score || 0),
        best_option: String(data.best_option || ''),
        correct: Boolean(data.correct),
        feedback,
      }
      void translateScenarioExplanation(pending.scenario_id, feedback)
    }
    void loadCloudDashboard()
  } catch (error) {
    if (requestId === scenarioSubmissionId) {
      scenariosError.value = (error instanceof Error ? error.message : '网络异常。') + ' 实战答题保存在本设备，请重试同步。'
    }
  } finally {
    // Switching scenarios doesn't unlock an in-flight save; a newer
    // submission cannot start until this request has settled.
    scenarioSubmitting.value = false
  }
}
async function submitScenario() {
  const scenario = currentScenario.value
  const selected = selectedScenarioOption.value
  if (!scenario || !selected || scenarioSubmitting.value || scenarioResult.value) return
  if (pendingScenarioAttempt.value) {
    if (pendingScenarioAttempt.value.scenario_id === scenario.id &&
        pendingScenarioAttempt.value.selected_option === selected) {
      await syncPendingScenarioAttempt()
    } else {
      scenariosError.value = '上一笔实战答题尚未同步，请先重新同步。'
    }
    return
  }
  const pending: PendingScenarioAttempt = {
    attempt_id: crypto.randomUUID(), scenario_id: scenario.id, selected_option: selected,
    duration_seconds: 0,
  }
  pendingScenarioAttempt.value = pending
  try { localStorage.setItem('zhixue:scenario-pending-v1', JSON.stringify(pending)) }
  catch { scenariosError.value = '本机无法保存待同步实战答题，请勿关闭页面。' }
  await syncPendingScenarioAttempt()
}
watch([selectedTrackId, examTracks, activeModule], () => {
  if (activeModule.value === 'practical') void loadScenarios()
})
watch(selectedTrackId, () => {
  practicalSection.value = 'all'
  practicalCategory.value = ''
  resetScenarioSelection()
})
async function loadExamTracks(silent = false) {
  // Background FE count refresh should not add a loading row above the exam cards.
  if (!silent) {
    tracksLoading.value = true
    tracksError.value = ''
  }
  try {
    const response = await fetch('/api/tracks')
    const data = await response.json() as { items?: ExamTrack[]; error?: string }
    if (!response.ok) throw new Error(data.error || '考试列表加载失败')
    examTracks.value = (data.items || []).filter(track => track.kind === 'exam')
    if (!examTracks.value.some(track => track.id === selectedTrackId.value)) selectedTrackId.value = examTracks.value[0]?.id || ''
    // SG is the initial exam; populate its domain selector on first load too.
    if (selectedTrackId.value === 'exam-sg') void loadPracticeTopics()
  } catch (error) {
    if (silent) throw error
    tracksError.value = error instanceof Error ? error.message : '考试列表加载失败，请稍后重试。'
  } finally {
    if (!silent) tracksLoading.value = false
  }
}
const feBankLoading = ref(false)
const feBankPrepared = ref(false)
const feBankError = ref('')
async function loadPracticeTopics() {
  const requestId = ++practiceTopicLoadId
  if (!practiceHasDetailedFilters.value) return
  try {
    const params = new URLSearchParams({
      track: selectedTrackId.value,
      source: questionSourceFilter.value,
      year: practiceYear.value,
      section: practiceSection.value === 'all' ? '' : practiceSection.value,
    })
    const response = await fetch('/api/question-categories?' + params)
    if (!response.ok) return
    const data = await response.json() as { items?: { topic: string; question_count: number }[] }
    if (requestId !== practiceTopicLoadId) return
    practiceTopicOptions.value = data.items || []
    if (practiceTopic.value && !practiceTopicOptions.value.some(item => item.topic === practiceTopic.value)) {
      practiceTopic.value = ''
    }
  } catch {
    if (requestId === practiceTopicLoadId) practiceTopicOptions.value = []
  }
}
function applyPracticeFilter(changed: 'year' | 'section' | 'topic') {
  // SG's legacy and CBT year filters represent IPA official questions only.
  if (changed === 'year' && selectedTrackId.value === 'exam-sg' && practiceYear.value) {
    questionSourceFilter.value = 'official'
  }
  if (changed !== 'topic') {
    practiceTopic.value = ''
    void loadPracticeTopics()
  }
  selectReviewMode('all')
}
async function prepareFeBank() {
  if (feBankLoading.value || feBankPrepared.value) return
  feBankLoading.value = true
  feBankError.value = ''
  try {
    const response = await fetch('/api/fe-question-bank/install', { method: 'POST' })
    const data = await response.json() as { error?: string }
    if (!response.ok) throw new Error(data.error || 'FE 题库加载失败。')
    await loadExamTracks(true)
    feBankPrepared.value = true
    if (selectedTrackId.value === 'exam-fe') await loadPracticeTopics()
  } catch (error) {
    feBankError.value = error instanceof Error ? error.message : 'FE 题库加载失败，请重试。'
  } finally { feBankLoading.value = false }
}
function selectExam(track: ExamTrack) {
  // Tapping the already-selected card must not reset filters, questions or scroll position.
  if (selectedTrackId.value === track.id) return
  stopSpeech()
  practiceAnswerRequestId += 1
  practiceLoadRequestId += 1
  questionProgressRequestId += 1
  questionBatchOffset.value = 0
  questionBankTotal.value = 0
  questionBankHasMore.value = false
  selectedTrackId.value = track.id
  // Both SG and FE expose the same question source, year, section and topic controls.
  // Reset all filters on exam switch so SG is not affected by the previous FE selection.
  questionSourceFilter.value = 'all'
  practiceYear.value = ''
  practiceSection.value = 'all'
  practiceTopic.value = ''
  practiceTopicOptions.value = []
  if (track.id === 'exam-fe') void prepareFeBank()
  else if (track.id === 'exam-sg') void loadPracticeTopics()
  quizQuestions.value = []
  quizIndex.value = 0
  selectedOption.value = ''
  quizSubmitted.value = false
  quizCorrect.value = 0
  quizFinished.value = false
  quizError.value = ''
}

async function selectQuestionSource(source: 'all' | 'official' | 'generated' | 'licensed') {
  if (selectedTrackId.value === 'exam-fe' && feBankLoading.value) return
  stopSpeech()
  practiceAnswerRequestId += 1
  practiceLoadRequestId += 1
  questionProgressRequestId += 1
  questionSourceFilter.value = source
  if (practiceHasDetailedFilters.value) {
    // SG years only apply to official papers; do not leave an impossible
    // generated + legacy-year combination after switching question sources.
    if (selectedTrackId.value === 'exam-sg' && source !== 'official') practiceYear.value = ''
    practiceTopic.value = ''
    await loadPracticeTopics()
  }
  questionBatchOffset.value = 0
  activeReviewMode.value = 'all'
  questionBankTotal.value = 0
  questionBankHasMore.value = false
  quizQuestions.value = []
  quizIndex.value = 0
  selectedOption.value = ''
  quizSubmitted.value = false
  quizCorrect.value = 0
  quizFinished.value = false
  quizError.value = ''
  await startPractice()
}
async function loadQuestionProgress(trackId = selectedTrack.value?.id || '') {
  if (!trackId) return
  const requestId = ++questionProgressRequestId
  try {
    const response = await fetch('/api/question-progress?track=' + encodeURIComponent(trackId))
    if (!response.ok || requestId !== questionProgressRequestId) return
    const data = await response.json() as { items?: QuestionReviewProgress[] }
    if (requestId !== questionProgressRequestId) return
    questionProgressById.value = Object.fromEntries((data.items || []).map(item => [item.question_id, item]))
  } catch { /* Keep the last known progress visible if the network is temporarily unavailable. */ }
}
function selectReviewMode(mode: 'all' | 'unlearned' | 'wrong' | 'due' | 'mastered') {
  if (selectedTrackId.value === 'exam-fe' && feBankLoading.value) return
  stopSpeech()
  practiceAnswerRequestId += 1
  practiceLoadRequestId += 1
  questionProgressRequestId += 1
  activeReviewMode.value = mode
  questionBatchOffset.value = 0
  questionBankTotal.value = 0
  questionBankHasMore.value = false
  quizQuestions.value = []
  quizIndex.value = 0
  selectedOption.value = ''
  quizSubmitted.value = false
  quizCorrect.value = 0
  quizFinished.value = false
  quizError.value = ''
}
async function startPractice() {
  if (selectedTrackId.value === 'exam-fe' && feBankLoading.value) return
  stopSpeech()
  const requestId = ++practiceLoadRequestId
  const trackId = selectedTrack.value?.id || ''
  if (!selectedTrack.value) { quizError.value = '尚未加载考试列表，请刷新页面后重试。'; return }
  if (!selectedTrack.value.question_count) {
    quizError.value = '该考试尚未接入题库。目前正式接入的是 SG；不会用其他考试题目代替。'
    return
  }
  quizLoading.value = true
  quizError.value = ''
  try {
    let response: Response
    let data: { items?: PracticeQuestion[]; error?: string; total?: number; has_more?: boolean }
    if (activeReviewMode.value === 'all') {
      const params = new URLSearchParams({
        track: selectedTrack.value.id,
        source: questionSourceFilter.value,
        mode: 'ordered',
        limit: String(questionBatchSize),
        offset: String(questionBatchOffset.value),
      })
      if (trackId === 'exam-fe' || trackId === 'exam-sg') {
        if (practiceYear.value) params.set('year', practiceYear.value)
        if (practiceSection.value !== 'all') params.set('section', practiceSection.value)
        if (practiceTopic.value) params.set('topic', practiceTopic.value)
      }
      response = await fetch('/api/questions?' + params.toString())
      data = await response.json() as typeof data
    } else {
      const mode = activeReviewMode.value
      const reviewBatchLimit = questionBatchSize
      // Due/unlearned results leave the filtered pool when submitted. Fetch the
      // next remaining batch at offset zero instead of skipping shifted rows.
      const params = new URLSearchParams({
        track: selectedTrack.value.id,
        limit: String(reviewBatchLimit),
        offset: String(mode === 'unlearned' || mode === 'due' ? 0 : questionBatchOffset.value),
        mode,
        source: questionSourceFilter.value,
      })
      if (trackId === 'exam-fe' || trackId === 'exam-sg') {
        if (practiceYear.value) params.set('year', practiceYear.value)
        if (practiceSection.value !== 'all') params.set('section', practiceSection.value)
        if (practiceTopic.value) params.set('topic', practiceTopic.value)
      }
      response = await fetch('/api/wrong-questions?' + params.toString())
      data = await response.json() as typeof data
    }
    if (requestId !== practiceLoadRequestId) return
    if (!response.ok) throw new Error(data.error || '题库加载失败')
    if (!data.items?.length) {
      const messages = {
        all: questionSourceFilter.value === 'official' ? '当前筛选下暂无官方历年真题。' : questionSourceFilter.value === 'licensed' ? '当前没有可作答的真题改编。' : questionSourceFilter.value === 'generated' ? '当前没有可用的预测题，请稍后重试。' : '当前筛选下暂无题目。',
        unlearned: '当前题库中没有尚未作答的题目。',
        wrong: '当前筛选下没有错题。答错题目后会自动进入错题集。',
        due: '当前没有到期的复习题。答错题会先安排短间隔复习。',
        mastered: '当前没有已掌握的题目。连续答对三次或手动标记掌握后会显示在这里。',
      }
      throw new Error(messages[activeReviewMode.value])
    }
    quizQuestions.value = data.items
    questionBankTotal.value = data.total ?? data.items.length
    questionBankHasMore.value = Boolean(data.has_more)
    quizIndex.value = 0
    selectedOption.value = ''
    quizSubmitted.value = false
    quizCorrect.value = 0
    quizFinished.value = false
    quizStartedAt.value = Date.now()
    await loadQuestionProgress(trackId)
  } catch (error) {
    if (requestId === practiceLoadRequestId) quizError.value = error instanceof Error ? error.message : '题库加载失败，请稍后重试。'
  } finally {
    if (requestId === practiceLoadRequestId) quizLoading.value = false
  }
}
async function nextQuestionBatch() {
  if (questionBankHasMore.value && activeReviewMode.value !== 'unlearned' && activeReviewMode.value !== 'due') {
    questionBatchOffset.value += questionBatchSize
  } else {
    questionBatchOffset.value = 0
  }
  quizError.value = ''
  await startPractice()
}
type PendingPracticeAttempt = {
  attempt_id: string
  question_id: string
  answer: string
  duration_seconds: number
}
// Persist the request before sending. Retrying after an ambiguous network failure
// uses the same server-side idempotency key, so one answer creates one review event.
const pendingPracticeAttempt = ref<PendingPracticeAttempt | null>(readStored('zhixue:practice-pending-v1', null))
const practiceSaving = ref(false)

async function syncPendingPracticeAttempt() {
  const pending = pendingPracticeAttempt.value
  if (!pending || practiceSaving.value || !authenticated.value) return
  practiceSaving.value = true
  try {
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pending),
    })
    const data = await response.json() as { error?: string; attempt_id?: string; progress?: QuestionReviewProgress }
    if (!response.ok || data.attempt_id !== pending.attempt_id) {
      throw new Error(data.error || '答题记录尚未同步。')
    }
    if (data.progress) questionProgressById.value[pending.question_id] = data.progress
    if (pendingPracticeAttempt.value?.attempt_id === pending.attempt_id) {
      pendingPracticeAttempt.value = null
      try { localStorage.removeItem('zhixue:practice-pending-v1') } catch { /* cloud receipt is durable */ }
    }
    quizError.value = ''
    void loadCloudDashboard()
  } catch (error) {
    quizError.value = (error instanceof Error ? error.message : '网络异常。') + ' 答题保存在本设备，请重新同步。'
  } finally {
    practiceSaving.value = false
  }
}
async function submitPracticeAnswer() {
  const question = currentQuestion.value
  if (!question || !selectedOption.value || practiceSaving.value) return
  if (quizSubmitted.value) {
    if (pendingPracticeAttempt.value?.question_id === question.id) await syncPendingPracticeAttempt()
    return
  }
  if (pendingPracticeAttempt.value) {
    quizError.value = '上一笔答题还未同步，请先完成同步。'
    return
  }
  const answer = selectedOption.value
  const pending: PendingPracticeAttempt = {
    attempt_id: crypto.randomUUID(), question_id: question.id, answer,
    duration_seconds: quizStartedAt.value ? Math.max(0, Math.floor((Date.now() - quizStartedAt.value) / 1000)) : 0,
  }
  pendingPracticeAttempt.value = pending
  try { localStorage.setItem('zhixue:practice-pending-v1', JSON.stringify(pending)) }
  catch { quizError.value = '本机无法保存待同步答题，请勿关闭页面，直到同步成功。' }
  quizSubmitted.value = true
  if (answer === question.answer) quizCorrect.value += 1
  void translateQuestionExplanation(question)
  await syncPendingPracticeAttempt()
}
function getExplanationLanguage(question: PracticeQuestion): 'ja-JP' | 'en-US' | 'zh-CN' {
  // question.language describes the question stem (usually Japanese), not the explanation.
  // Detect the explanation itself so authored Chinese explanations aren't sent to a zh→zh translator.
  const text = (question.explanation || '').trim()
  if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP'
  if (/[a-z]{4,}/i.test(text) && !/[\u3400-\u9fff]/.test(text)) return 'en-US'
  if (/[\u3400-\u9fff]/.test(text)) return 'zh-CN'
  const language = (question.language || '').toLowerCase().replace('_', '-')
  if (language.startsWith('en')) return 'en-US'
  if (language.startsWith('zh')) return 'zh-CN'
  return 'ja-JP'
}
async function translateQuestionExplanation(question: PracticeQuestion | null) {
  if (!question?.explanation?.trim()) return
  const source = getExplanationLanguage(question)
  delete questionExplanationTranslationErrors.value[question.id]

  // Most prediction questions already contain hand-written Chinese explanations; show them as-is.
  if (source === 'zh-CN') {
    questionExplanationTranslations.value[question.id] = {
      source_text: question.explanation,
      translation_zh: question.explanation,
    }
    return
  }

  const cached = questionExplanationTranslations.value[question.id]
  if (cached?.source_text === question.explanation) return
  if (questionExplanationTranslating.value[question.id]) return
  questionExplanationTranslating.value[question.id] = true
  try {
    const response = await fetch('/api/translate-explanation', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: question.explanation, source }),
    })
    const data = await response.json() as { translation?: string; error?: string }
    if (!response.ok || !data.translation) throw new Error(data.error || '中文解析翻译暂时不可用。')
    questionExplanationTranslations.value[question.id] = { source_text: question.explanation, translation_zh: data.translation }
  } catch (error) {
    questionExplanationTranslationErrors.value[question.id] = error instanceof Error ? error.message : '中文解析翻译失败。'
  } finally {
    questionExplanationTranslating.value[question.id] = false
  }
}
async function setQuestionMastery(questionId: string, mastered: boolean) {
  try {
    const response = await fetch('/api/question-progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, mastered }),
    })
    const data = await response.json() as { error?: string; progress?: QuestionReviewProgress }
    if (!response.ok) throw new Error(data.error || '掌握状态保存失败。')
    if (data.progress) questionProgressById.value[questionId] = data.progress
  } catch (error) {
    quizError.value = error instanceof Error ? error.message : '掌握状态暂未保存。'
  }
}
function nextPracticeQuestion() {
  stopSpeech()
  practiceAnswerRequestId += 1
  if (!isLastQuestion.value) {
    quizIndex.value += 1
    quizStartedAt.value = Date.now()
    selectedOption.value = ''
    quizSubmitted.value = false
    return
  }
  void saveExamRecord({ date: tokyoDate(), correct: quizCorrect.value, total: quizQuestions.value.length, exam: selectedTrack.value?.title || selectedTrackId.value })
  quizFinished.value = true
}

const moduleInfo = {
  home: { title: '学习首页', subtitle: '考试、语言与 IT 知识，一站练习。' },
  exam: { title: '考试备考', subtitle: '刷题、错题复习与模拟考试。' },
  practical: { title: '实战训练', subtitle: '工作情境判断与答题复盘。' },
  language: { title: '语言学习', subtitle: '日语与英语的例句、发音和复习。' },
  dictionary: { title: '词典与 IT 术语', subtitle: '中日英互译、发音与离线词库。' },
} as const

const currentInfo = computed(() => moduleInfo[activeModule.value])
const searchPlaceholder = computed(() => activeModule.value === 'dictionary' ? '输入中、日、英文或 IT 缩写…' : '搜索考试、课程、知识点…')

const modules = [
  { id: 'exam' as const, title: '考试备考', desc: '刷题 · 错题 · 模拟考试', icon: GraduationCap, tone: 'lavender', count: 'SG / FE 练习' },
  { id: 'practical' as const, title: '实战训练', desc: '情境判断 · 朗读 · 复盘', icon: ShieldCheck, tone: 'blue', count: 'SG / FE 情境' },
  { id: 'language' as const, title: '语言学习', desc: '日语 · 英语 · 复习', icon: Languages, tone: 'peach', count: '日语 / 英语' },
  { id: 'dictionary' as const, title: '词典与 IT 术语', desc: '互译 · 发音 · 离线 IT 词库', icon: BookMarked, tone: 'blue', count: '中 / 日 / 英' },
]

type LanguageHighlight = { start: number; end: number; type: 'vocabulary' | 'grammar'; term: string; meaning: string; explanation: string }
type LanguageExpansion = { term: string; meaning: string; explanation: string }
type LanguageCard = {
  id: string; language: 'ja' | 'en'; category: string; term: string; reading?: string;
  meaning_zh: string; explanation: string; example: string; example_meaning_zh: string;
  example_source_url?: string; source_url?: string; source_type: string; content_type?: string;
  highlight_json?: string; vocabulary_expansion_json?: string; grammar_expansion_json?: string
}
const languageCards = ref<LanguageCard[]>([])
const languageCategories = computed(() => [
  { title: '全部', desc: '全部句子', icon: BookOpen },
  { title: '日常句子', desc: '日常生活中自然会说的话', icon: BookMarked },
  { title: '职场语言', desc: '工作沟通、确认、汇报与协作', icon: BookMarked },
])
const languageCardsLoading = ref(false)
const languageCardsError = ref('')
type LanguageReview = { card_id: string; review_count: number; correct_streak: number; next_review_at: string; last_reviewed_at: string; last_result: 'again' | 'remembered'; is_due?: number }
const languageReviews = ref<LanguageReview[]>(readStored('zhixue:language-reviews', []))
const languageReviewBusy = ref('')
const selectedLanguageMastery = ref<'all' | 'unlearned' | 'unmastered' | 'mastered'>('all')
const languageReviewByCardId = computed(() => new Map<string, LanguageReview>(languageReviews.value.map(review => [review.card_id, review] as const)))
const masteredLanguageIds = computed(() => new Set(completedLanguageCards.value))
const reviewClockNow = ref(Date.now())
const reviewDueByCardId = computed(() => new Map<string, boolean>(
  [...languageReviewByCardId.value].map(([id, review]) => [id, utcReviewMillis(review.next_review_at) <= reviewClockNow.value] as const),
))
const isLanguageCardUnlearned = (card: LanguageCard) => {
  const review = languageReviewByCardId.value.get(card.id)
  return !masteredLanguageIds.value.has(card.id) && (!review || review.review_count === 0)
}
const unlearnedLanguageCount = computed(() => languageCards.value.filter(isLanguageCardUnlearned).length)
const visibleLanguageCards = computed(() => languageCards.value.filter(card => {
  const matchesCategory = selectedLanguageCategory.value === '全部' || card.category === selectedLanguageCategory.value
  const isMastered = masteredLanguageIds.value.has(card.id)
  const isUnlearned = isLanguageCardUnlearned(card)
  const matchesMastery = selectedLanguageMastery.value === 'all'
    || (selectedLanguageMastery.value === 'unlearned' && isUnlearned)
    || (selectedLanguageMastery.value === 'mastered' && isMastered)
    || (selectedLanguageMastery.value === 'unmastered' && !isMastered && !isUnlearned)
  return matchesCategory && matchesMastery
}).sort((a, b) => {
  const aReview = languageReviewByCardId.value.get(a.id)
  const bReview = languageReviewByCardId.value.get(b.id)
  const aDue = !aReview || reviewDueByCardId.value.get(a.id) === true
  const bDue = !bReview || reviewDueByCardId.value.get(b.id) === true
  return Number(bDue) - Number(aDue)
}))
const languagePage = ref(1)
const languagePageSize = 30
const languagePageCount = computed(() => Math.max(1, Math.ceil(visibleLanguageCards.value.length / languagePageSize)))
const paginatedLanguageCards = computed(() => visibleLanguageCards.value.slice(
  (languagePage.value - 1) * languagePageSize,
  languagePage.value * languagePageSize,
))
const dueLanguageReviewCount = computed(() => visibleLanguageCards.value.filter(card => {
  const review = languageReviewByCardId.value.get(card.id)
  return Boolean(review && review.review_count > 0 && reviewDueByCardId.value.get(card.id))
}).length)
const languagePracticeIndex = ref(0)
const languagePracticeRevealed = ref(false)
const languagePracticeCard = computed(() => visibleLanguageCards.value.length
  ? visibleLanguageCards.value[languagePracticeIndex.value % visibleLanguageCards.value.length]
  : null)
function parseLanguageExpansion(value?: string): LanguageExpansion[] {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed.filter((item): item is LanguageExpansion => Boolean(item && typeof item.term === 'string')) : []
  } catch { return [] }
}
const fallbackHighlightNotes: Record<string, { meaning: string; explanation: string }> = {
  '旅行': { meaning: '旅行、旅游', explanation: '名词，指外出旅行；在「旅行が楽しみです」中，是令人期待的事情。' },
  'もう一度': { meaning: '再一次', explanation: '用于请求对方重复说明、确认或操作。' },
  '確認': { meaning: '确认、核实', explanation: '职场常用词，常见搭配是「内容を確認する」。' },
  '連絡': { meaning: '联系', explanation: '常见于工作沟通，如「ご連絡します」。' },
  '相談': { meaning: '商量、咨询', explanation: '表示向他人征求意见或讨论问题。' },
  '資料': { meaning: '资料、文件', explanation: '职场中常指文件、会议材料或参考资料。' },
  '会議': { meaning: '会议', explanation: '常见搭配「会議に参加する」。' },
  '予定': { meaning: '安排、计划', explanation: '用于表达日程和计划。' },
  '仕事': { meaning: '工作', explanation: '可指工作内容或职业。' },
  '会社': { meaning: '公司', explanation: '常见于职场与商务语境。' },
  'ください': { meaning: '请……', explanation: '接在动词て形后，用于礼貌请求。' },
  'ありがとうございます': { meaning: '非常感谢', explanation: '礼貌的感谢表达。' },
  'すみません': { meaning: '不好意思、对不起', explanation: '可用于道歉、搭话或轻度致谢。' },
  '大丈夫': { meaning: '没关系、没问题', explanation: '根据语境表达许可或状态良好。' },
  'Could you': { meaning: '可以请你……吗', explanation: '英语中自然、礼貌的请求开头。' },
  'Would you': { meaning: '能否请你……', explanation: '常用于礼貌地请求对方做某事。' },
  'one more time': { meaning: '再一次', explanation: '常用于请求对方重复内容或动作。' },
  'get back to you': { meaning: '之后回复你', explanation: '自然的职场口语，表示稍后联系或答复。' },
  'check': { meaning: '确认、核实', explanation: '工作场景中常用于核对信息或细节。' },
  'confirm': { meaning: '确认', explanation: '常用于确认安排、内容或结果。' },
  'schedule': { meaning: '日程、安排', explanation: '可作名词或动词，常用于工作安排。' },
}
const fallbackGrammarPatterns: Array<{ language: 'ja' | 'en'; pattern: RegExp; label: string; meaning: string; explanation: string }> = [
  { language: 'ja', pattern: /ていただけますか|でいただけますか/, label: '〜ていただけますか', meaning: '可以请您……吗', explanation: '使用「て形＋いただけますか」委婉地请求对方做某事。' },
  { language: 'ja', pattern: /てください/, label: '〜てください', meaning: '请……', explanation: '动词て形＋ください，用于礼貌请求。' },
  { language: 'ja', pattern: /てから/, label: '〜てから', meaning: '……之后', explanation: '表示先完成前项动作，再进行后项动作。' },
  { language: 'ja', pattern: /なければなりません|なければならない/, label: '〜なければなりません', meaning: '必须……', explanation: '表达义务或必要性。' },
  { language: 'ja', pattern: /てもいいですか|てもいいです/, label: '〜てもいいですか', meaning: '可以……吗', explanation: '用于征求许可或表达允许。' },
  { language: 'ja', pattern: /と思います/, label: '〜と思います', meaning: '我认为……', explanation: '用于表达个人意见或判断。' },
  { language: 'ja', pattern: /ので/, label: '〜ので', meaning: '因为……', explanation: '较柔和地说明原因。' },
  { language: 'ja', pattern: /ています/, label: '〜ています', meaning: '正在……／持续……', explanation: '表示动作进行或状态持续。' },
  { language: 'ja', pattern: /が楽しみです/, label: 'N が楽しみです', meaning: '期待……／盼望……', explanation: '「が」标记期待的事情；「楽しみです」表达对未来事情的期待。例如「旅行が楽しみです」＝很期待这次旅行。这里的「楽しみ」表示盼望、期待，不是单纯的“有趣”。' },
  { language: 'ja', pattern: /たいです/, label: '〜たいです', meaning: '想要……', explanation: '用于表达愿望。' },
  { language: 'ja', pattern: /までに/, label: '〜までに', meaning: '在……之前', explanation: '表示截止时间。' },
  { language: 'en', pattern: /\bcould you\b/i, label: 'Could you + 动词原形', meaning: '礼貌请求句型', explanation: 'could you 后接动词原形，语气自然且委婉。' },
  { language: 'en', pattern: /\bwould you\b/i, label: 'Would you + 动词原形', meaning: '礼貌请求句型', explanation: 'would you 后接动词原形，常用于礼貌请求。' },
  { language: 'en', pattern: /\bwould like to\b/i, label: 'would like to + 动词', meaning: '较礼貌地表达意愿', explanation: '用于表达希望或意愿，比 want 更委婉。' },
  { language: 'en', pattern: /\bhave to\b/i, label: 'have to + 动词', meaning: '必须……', explanation: '表示外部要求或必要性。' },
  { language: 'en', pattern: /\bneed to\b/i, label: 'need to + 动词', meaning: '需要……', explanation: '表示需要做某事。' },
  { language: 'en', pattern: /\bwill\b/i, label: 'will + 动词原形', meaning: '将会……', explanation: '常用于未来安排、承诺或预测。' },
  { language: 'en', pattern: /\bshould\b/i, label: 'should + 动词原形', meaning: '应该……', explanation: '表达建议或合理预期。' },
  { language: 'en', pattern: /\bbecause\b/i, label: 'because 原因从句', meaning: '因为……', explanation: '引导原因说明。' },
  { language: 'en', pattern: /\bif\b/i, label: 'if 条件从句', meaning: '如果……', explanation: '引出条件，主句说明条件成立时的结果。' },
  { language: 'en', pattern: /\bwhen\b/i, label: 'when 时间从句', meaning: '当……时', explanation: '引导时间从句。' },
]
function languageHighlights(card: LanguageCard | null): LanguageHighlight[] {
  if (!card) return []
  let stored: LanguageHighlight[] = []
  try {
    const parsed = JSON.parse(card.highlight_json || '[]')
    if (Array.isArray(parsed)) stored = parsed.filter((item): item is LanguageHighlight =>
      Number.isInteger(item?.start) && Number.isInteger(item?.end) &&
      item.start >= 0 && item.end > item.start && item.end <= card.term.length &&
      ['vocabulary', 'grammar'].includes(item.type) && typeof item.term === 'string' && !(item.type === 'vocabulary' && ['です', 'ます', 'でした', 'ました'].includes(item.term.trim())))
  } catch { stored = [] }
  stored.sort((a, b) => a.start - b.start || (a.type === b.type ? b.end - a.end : a.type === 'grammar' ? -1 : 1))
  const highlights: LanguageHighlight[] = []
  let lastEnd = 0
  for (const item of stored) {
    if (item.start < lastEnd) continue
    highlights.push(item)
    lastEnd = item.end
  }
  const grammarPresent = highlights.some(item => item.type === 'grammar')
  if (!grammarPresent) {
    for (const rule of fallbackGrammarPatterns.filter(item => item.language === card.language)) {
      const match = rule.pattern.exec(card.term)
      if (!match) continue
      const start = match.index
      const end = start + match[0].length
      if (highlights.some(item => start < item.end && end > item.start)) continue
      highlights.push({ start, end, type: 'grammar', term: match[0], meaning: rule.meaning, explanation: rule.explanation })
      break
    }
  }
  if (!highlights.some(item => item.type === 'vocabulary')) {
    const candidates = Object.keys(fallbackHighlightNotes).sort((a, b) => b.length - a.length)
    for (const term of candidates) {
      const index = card.term.toLocaleLowerCase().indexOf(term.toLocaleLowerCase())
      if (index < 0) continue
      const note = fallbackHighlightNotes[term]
      const end = index + term.length
      if (highlights.some(item => index < item.end && end > item.start)) continue
      highlights.push({ start: index, end, type: 'vocabulary', term: card.term.slice(index, end), meaning: note.meaning, explanation: note.explanation })
      break
    }
  }
  return highlights.sort((a, b) => a.start - b.start || (a.type === 'grammar' ? -1 : 1))
}
function languageExpansions(card: LanguageCard | null, type: 'vocabulary' | 'grammar'): LanguageExpansion[] {
  if (!card) return []
  const stored = parseLanguageExpansion(type === 'vocabulary' ? card.vocabulary_expansion_json : card.grammar_expansion_json)
  const highlights = languageHighlights(card).filter(item => item.type === type)
  const merged = [...stored]
  for (const item of highlights) {
    if (merged.some(existing => existing.term.trim().toLocaleLowerCase() === item.term.trim().toLocaleLowerCase())) continue
    merged.push({ term: item.term, meaning: item.meaning || '结合整句理解', explanation: item.explanation || '请结合上下文理解该表达的用法。' })
  }
  if (merged.length) return merged
  if (type === 'grammar') {
    const rule = fallbackGrammarPatterns.find(item => item.language === card.language && item.pattern.test(card.term))
    if (rule) return [{ term: rule.label, meaning: rule.meaning, explanation: rule.explanation }]
  }
  return []
}
function sentenceParts(card: LanguageCard | null): Array<{ text: string; type: string; detail: string }> {
  if (!card) return []
  const highlights = languageHighlights(card)
  const parts: Array<{ text: string; type: string; detail: string }> = []
  let cursor = 0
  for (const item of highlights) {
    if (item.start < cursor) continue
    if (item.start > cursor) parts.push({ text: card.term.slice(cursor, item.start), type: '', detail: '' })
    parts.push({ text: card.term.slice(item.start, item.end), type: item.type, detail: [item.term, item.meaning, item.explanation].filter(Boolean).join(' · ') })
    cursor = item.end
  }
  if (cursor < card.term.length) parts.push({ text: card.term.slice(cursor), type: '', detail: '' })
  return parts.length ? parts : [{ text: card.term, type: '', detail: '' }]
}
function speakLanguageCard(card: LanguageCard | null, example = false, practice = false) {
  if (!card) return
  const text = example ? card.example : card.term
  const lang = card.language === 'ja' ? 'ja-JP' : 'en-US'
  speak(text || '', lang, `${practice ? 'language-practice' : 'language-card'}:${card.id}:${example ? 'example' : 'term'}`)
}
function nextLanguagePractice() {
  stopSpeech()
  if (!visibleLanguageCards.value.length) return
  languagePracticeIndex.value = (languagePracticeIndex.value + 1) % visibleLanguageCards.value.length
  languagePracticeRevealed.value = false
}
watch([studyLanguage, selectedLanguageCategory, selectedLanguageMastery], () => {
  stopSpeech()
  languagePage.value = 1
  languagePracticeIndex.value = 0
  languagePracticeRevealed.value = false
})
const languageProgress = computed(() => {
  const ids = languageCards.value.map(card => card.id)
  const done = ids.filter(id => masteredLanguageIds.value.has(id)).length
  return { done, total: ids.length, percent: ids.length ? Math.round(done / ids.length * 100) : 0 }
})
let languageCardsLoadGeneration = 0
let languageCardsAbort: AbortController | undefined
async function loadLanguageCards() {
  const generation = ++languageCardsLoadGeneration
  const language = studyLanguage.value
  languageCardsAbort?.abort()
  const controller = new AbortController()
  languageCardsAbort = controller
  languageCardsLoading.value = true
  languageCardsError.value = ''
  languageCards.value = []
  try {
    // Each response is bounded to keep peak network/JSON parsing memory down
    // on iPhone Safari. Existing 5,000-card filters and progress are unchanged.
    const batchSize = 1000
    for (let offset = 0; offset <= 10000; offset += batchSize) {
      const params = new URLSearchParams({ lang: language, limit: String(batchSize), offset: String(offset) })
      const response = await fetch('/api/language-cards?' + params, { signal: controller.signal })
      const data = await response.json() as { items?: LanguageCard[]; error?: string }
      if (generation !== languageCardsLoadGeneration || language !== studyLanguage.value) return
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error || '语言学习内容加载失败')
      languageCards.value.push(...data.items)
      if (data.items.length < batchSize) break
    }
  } catch (error) {
    if (generation !== languageCardsLoadGeneration || controller.signal.aborted) return
    // Do not present a partially loaded deck as the complete curriculum.
    languageCards.value = []
    languageCardsError.value = error instanceof Error ? error.message : '语言学习内容加载失败，请稍后再试。'
  } finally {
    if (generation === languageCardsLoadGeneration) {
      languageCardsLoading.value = false
      languageCardsAbort = undefined
    }
  }
}
async function submitLanguageReview(result: 'again' | 'remembered') {
  const card = languagePracticeCard.value
  if (!card || languageReviewBusy.value) return
  languageReviewBusy.value = card.id
  languageCardsError.value = ''
  try {
    const response = await fetch('/api/language-review', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, result }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || '复习记录保存失败。')
    const refreshed = await fetch('/api/language-review')
    if (refreshed.ok) {
      const rows = await refreshed.json() as { items?: LanguageReview[] }
      languageReviews.value = rows.items || []
    }
    languagePracticeRevealed.value = false
    if (result === 'remembered') {
      languagePracticeIndex.value = visibleLanguageCards.value.length
        ? (languagePracticeIndex.value + 1) % visibleLanguageCards.value.length : 0
    }
  } catch (error) {
    languageCardsError.value = error instanceof Error ? error.message : '复习记录暂时无法保存，请稍后重试。'
  } finally {
    languageReviewBusy.value = ''
  }
}
const languageProgressHydrating = ref(true)
const languageProgressReady = ref(false)
const languageSyncError = ref('')
const languageCardSaving = ref(new Set<string>())
async function toggleLanguageCard(id: string) {
  if (languageProgressHydrating.value || !languageProgressReady.value || languageCardSaving.value.has(id)) return
  languageCardSaving.value = new Set([...languageCardSaving.value, id])
  const previous = completedLanguageCards.value
  const wasMastered = previous.includes(id)
  const mastered = !wasMastered
  // Optimistic UI update; roll back if D1 does not confirm the write.
  completedLanguageCards.value = mastered
    ? [...previous, id]
    : previous.filter(item => item !== id)
  languageCardsError.value = ''
  try {
    const response = await fetch('/api/language-progress', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ card_id: id, mastered, explicit: true }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || '掌握进度未能保存到云端。')
    void loadCloudDashboard()
  } catch (error) {
    completedLanguageCards.value = restoreMasteredCard(completedLanguageCards.value, id, wasMastered)
    languageCardsError.value = error instanceof Error
      ? error.message
      : '网络异常：掌握进度未能同步到云端，已恢复原状态。'
  } finally {
    const next = new Set(languageCardSaving.value); next.delete(id); languageCardSaving.value = next
  }
}
watch(studyLanguage, value => {
  localStorage.setItem('zhixue:study-language', JSON.stringify(value))
  selectedLanguageCategory.value = '全部'
  void loadLanguageCards()
})
watch(completedLanguageCards, value => localStorage.setItem('zhixue:completed-language-cards', JSON.stringify(value)), { deep: true })
watch(languageReviews, value => localStorage.setItem('zhixue:language-reviews', JSON.stringify(value)), { deep: true })
async function hydrateCloudProgress() {
  void hydrateVocabulary()
  const generation = ++masterySyncGeneration
  const isCurrent = () => generation === masterySyncGeneration && authenticated.value
  languageProgressHydrating.value = true
  languageProgressReady.value = false
  languageSyncError.value = ''
  try {
    await Promise.all([loadCloudDashboard(), loadExamTracks(), loadLanguageCards()])
  } catch {
    // Continue progress hydration even if an independent preload fails.
  }

  if (!isCurrent()) return

  // Old browser snapshots have no timestamps. Import missing rows atomically so
  // an existing cloud unmaster action always wins over a stale local snapshot.
  try {
    const storedIds = readStored<unknown>('zhixue:mastery-imported-v1', [])
    const importedIds = new Set(Array.isArray(storedIds) ? storedIds.filter((id): id is string => typeof id === 'string') : [])
    const hydratedCards = await hydrateMastery(completedLanguageCards.value, fetch, {
      has: id => importedIds.has(id),
      add: ids => {
        ids.forEach(id => importedIds.add(id))
        try { localStorage.setItem('zhixue:mastery-imported-v1', JSON.stringify([...importedIds])) } catch { /* retry safely next time */ }
      },
    }, undefined, isCurrent)
    if (!isCurrent()) return
    completedLanguageCards.value = hydratedCards
    languageProgressReady.value = true
  } catch {
    if (isCurrent()) languageSyncError.value = '语言进度同步失败，本机记录已保留。请刷新后重试。'
  } finally {
    if (isCurrent()) languageProgressHydrating.value = false
  }
  if (!isCurrent()) return

  try {
    const reviewResponse = await fetch('/api/language-review')
    if (reviewResponse.ok) {
      const reviews = await reviewResponse.json() as { items?: LanguageReview[] }
      const cloudReviews = reviews.items || []
      languageReviews.value = [...cloudReviews, ...languageReviews.value.filter(local =>
        !cloudReviews.some(cloud => cloud.card_id === local.card_id))]
    }
  } catch {
    // Keep local reviews usable if the cloud is unavailable.
  }
}
onMounted(async () => {
  rolloverDailyTasks()
  dailyRolloverTimer = setInterval(() => { rolloverDailyTasks(); reviewClockNow.value = Date.now() }, 30000)
  document.addEventListener('visibilitychange', onDailyVisibilityChange)
  // Preload the browser's speech voices before the user taps a pronunciation button.
  // iOS Safari may initially return an empty voice list; waiting until the first tap
  // makes that tap appear to do nothing and forces the user to tap a second time.
  try {
    const synthesis = window.speechSynthesis
    synthesis?.getVoices()
    synthesis?.addEventListener('voiceschanged', () => { synthesis.getVoices() }, { once: true })
  } catch {
    // Speech playback will report its own browser/device error when requested.
  }
  await checkAuth()
  if (authenticated.value) { restoreMockReview(); restoreActiveMockExam(); void syncExamHistory(); void hydrateCloudProgress(); void refreshDailyTasks(todayKey.value); void reconcilePriorDailyTasks(); void syncPendingMockSubmission(); void syncPendingPracticeAttempt(); void syncPendingScenarioAttempt() }
})

type DictionaryEntry = {
  term: string
  reading?: string
  phonetic?: string
  en: string
  zh?: string
  tag: string
  example?: string
  language?: 'ja' | 'en' | 'zh'
  source?: string
  translationJa?: string
  englishTerm?: string
  japaneseTerm?: string
  technical?: boolean
}
const dictionaryEntries: DictionaryEntry[] = []
const onlineEntries = ref<DictionaryEntry[]>([])
const recentDictionaryEntries = ref<DictionaryEntry[]>(readStored('zhixue:recent-dictionary', []))
const savedDictionaryEntries = ref<DictionaryEntry[]>(readStored('zhixue:saved-dictionary-entries', []))
const dictionaryLoading = ref(false)
const dictionaryError = ref('')
const dictionaryDetectedLanguage = ref<'ja' | 'en' | 'zh' | 'it' | ''>('')
const dictionaryAiRemaining = ref<number | null>(null)
const dictionaryAiBusy = ref(false)
const dictionaryAiActiveKey = ref('')
const dictionaryAiAnswers = ref<Record<string, string>>({})
const dictionaryAiErrors = ref<Record<string, string>>({})
let dictionaryAiRequestId = 0
const speechStatus = ref('')
const speechStatusTarget = ref('')
const lastSearchedTerm = ref('')
let dictionaryRequestId = 0
const speechPaused = ref(false)
const speechPlaying = ref(false)
watch(recentDictionaryEntries, value => localStorage.setItem('zhixue:recent-dictionary', JSON.stringify(value)), { deep: true })
watch(savedDictionaryEntries, value => localStorage.setItem('zhixue:saved-dictionary-entries', JSON.stringify(value)), { deep: true })
const savedVocabularyEntries = computed(() => savedWords.value.map(term =>
  savedDictionaryEntries.value.find(entry => entry.term === term) ||
  recentDictionaryEntries.value.find(entry => entry.term === term) ||
  { term, en: '', reading: '', translationJa: '', language: 'ja' as const, tag: '生词本' }
))
const filteredEntries = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return dictionaryEntries
  return dictionaryEntries.filter((item) => [item.term, item.reading || '', item.phonetic || '', item.en || '', item.zh || ''].some((v) => v.toLowerCase().includes(q)))
})
const displayedEntries = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  const remote = lastSearchedTerm.value.trim().toLowerCase() === q ? onlineEntries.value : []
  const local = filteredEntries.value.filter((item) => !remote.some((result) => result.term.toLowerCase() === item.term.toLowerCase()))
  return [...remote, ...local]
})

const vocabularyHydrating = ref(true)
const vocabularySyncReady = ref(false)
const vocabularyPending = ref(new Map<string, 'deleted' | 'unknown'>())
const vocabularyStatus = ref('')
let vocabularyLoadId = 0
watch(authenticated, value => {
  if (!value) { vocabularyLoadId++; vocabularyHydrating.value = true }
}, { flush: 'sync' })

async function hydrateVocabulary() {
  const loadId = ++vocabularyLoadId
  vocabularyHydrating.value = true
  vocabularySyncReady.value = false
  vocabularyStatus.value = ''
  try {
    const rows = await fetchVocabularySnapshot(fetch)
    if (loadId !== vocabularyLoadId || !authenticated.value) return
    const localWords = [...savedWords.value]
    const cloudRows = new Map(rows.map(row => [row.term, row]))
    const pending = new Map<string, 'deleted' | 'unknown'>()
    for (const term of localWords) {
      const row = cloudRows.get(term)
      if (!row) pending.set(term, 'unknown')
      else if (row.deleted) pending.set(term, 'deleted')
    }
    const liveRows = rows.filter(row => !row.deleted && row.entry)
    // The old snapshot is retained intact. Missing records could be either unsynced
    // legacy saves or historical deletions; require an explicit restore decision.
    savedWords.value = [...new Set([...localWords, ...liveRows.map(row => row.term)])]
    const entries = [...savedDictionaryEntries.value]
    // The successful complete cloud snapshot is authoritative for live words.
    // Keep unknown local-only copies and tombstones pending explicit reconciliation.
    for (const row of liveRows) {
      const index = entries.findIndex(entry => entry.term === row.term)
      if (index < 0) entries.push(row.entry as DictionaryEntry)
      else entries[index] = row.entry as DictionaryEntry
    }
    savedDictionaryEntries.value = entries
    vocabularyPending.value = pending
    vocabularySyncReady.value = true
    if (pending.size) vocabularyStatus.value = '有未同步的旧收藏，请选择同步或移除。'
  } catch {
    if (loadId === vocabularyLoadId) {
      vocabularyPending.value = new Map(savedWords.value.map(term => [term, 'unknown' as const]))
      vocabularyStatus.value = '生词本同步失败，本机收藏已保留；刷新可重试。'
    }
  } finally {
    if (loadId === vocabularyLoadId) vocabularyHydrating.value = false
  }
}

async function restoreVocabulary(term: string) {
  if (vocabularyHydrating.value || !vocabularySyncReady.value || savedWordRequests.has(term)) return
  const entry = savedDictionaryEntries.value.find(item => item.term === term) || recentDictionaryEntries.value.find(item => item.term === term)
  if (!entry) { vocabularyStatus.value = '请先查询该词条，再同步。'; return }
  savedWordRequests.add(term)
  const sessionId = vocabularyLoadId
  try {
    const response = await fetch('/api/vocabulary/saved', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ term, language: entry.language || 'auto', entry, explicit: true }) })
    if (!response.ok) throw new Error('同步未成功，请稍后重试。')
    if (sessionId !== vocabularyLoadId || !authenticated.value) return
    const pending = new Map(vocabularyPending.value); pending.delete(term); vocabularyPending.value = pending
    vocabularyStatus.value = ''
    void loadCloudDashboard()
  } catch { vocabularyStatus.value = '同步未成功，本机收藏已保留。' }
  finally { savedWordRequests.delete(term) }
}
const savedWordRequests = new Set<string>()
async function toggleSaved(term: string) {
  // Serialize changes for the same term and update the UI only after the cloud write succeeds.
  if (vocabularyHydrating.value || !vocabularySyncReady.value || savedWordRequests.has(term)) return
  savedWordRequests.add(term)
  const sessionId = vocabularyLoadId
  try {
    if (savedWords.value.includes(term)) {
      if (vocabularyPending.value.has(term)) {
        // This is a local copy with uncertain cloud history; do not delete a
        // concurrent remote save based on an earlier paginated snapshot.
        const pending = new Map(vocabularyPending.value); pending.delete(term); vocabularyPending.value = pending
        savedWords.value = savedWords.value.filter(word => word !== term)
        savedDictionaryEntries.value = savedDictionaryEntries.value.filter(entry => entry.term !== term)
        return
      }
      const response = await fetch('/api/vocabulary/saved', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ term, action: 'remove' }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || '云端生词删除失败；本地收藏状态未更改。')
      if (sessionId !== vocabularyLoadId || !authenticated.value) return
      const pending = new Map(vocabularyPending.value); pending.delete(term); vocabularyPending.value = pending
      savedWords.value = savedWords.value.filter(word => word !== term)
      savedDictionaryEntries.value = savedDictionaryEntries.value.filter(entry => entry.term !== term)
      void loadCloudDashboard()
      return
    }

    const entry = displayedEntries.value.find(item => item.term === term) ||
      recentDictionaryEntries.value.find(item => item.term === term)
    if (!entry) {
      // Preserve an explicitly local-only save, but never imply it reached D1.
      savedWords.value = [...savedWords.value, term]
      cloudDashboardError.value = '请先查询到完整词条，再收藏以同步到生词本。'
      return
    }

    const response = await fetch('/api/vocabulary/saved', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ term, language: entry.language || 'auto', entry, explicit: true }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || '生词未能保存到云端；本地收藏状态未更改。')
    if (sessionId !== vocabularyLoadId || !authenticated.value) return
    savedWords.value = [...savedWords.value, term]
    if (!savedDictionaryEntries.value.some(item => item.term === term)) {
      savedDictionaryEntries.value = [entry, ...savedDictionaryEntries.value]
    }
    void loadCloudDashboard()
  } catch (error) {
    cloudDashboardError.value = error instanceof Error
      ? error.message
      : '网络异常：生词本未能同步到云端，本地收藏状态未更改。'
  } finally {
    savedWordRequests.delete(term)
  }
}

function dictionaryAiKey(entry: DictionaryEntry | null): string {
  return [dictSourceLang.value, lastSearchedTerm.value || searchText.value.trim(), entry?.term || '', entry?.tag || ''].join('|')
}
function resetDictionaryAiDisplay() {
  dictionaryAiRequestId += 1
  dictionaryAiBusy.value = false
  dictionaryAiActiveKey.value = ''
  dictionaryAiAnswers.value = {}
  dictionaryAiErrors.value = {}
}
async function loadDictionaryAiQuota() {
  if (!authenticated.value) return
  try {
    const response = await fetch('/api/dictionary/ai/status')
    if (!response.ok) return
    const data = await response.json() as { remaining?: number }
    if (typeof data.remaining === 'number') dictionaryAiRemaining.value = data.remaining
  } catch { /* The ordinary dictionary is independent of the AI quota endpoint. */ }
}
async function supplementDictionaryWithAi(entry: DictionaryEntry | null) {
  if (dictionaryAiBusy.value || !authenticated.value) return
  const term = (entry?.term || searchText.value).normalize('NFKC').trim()
  if (!term || term.length > 100) return
  const key = dictionaryAiKey(entry)
  const requestId = ++dictionaryAiRequestId
  dictionaryAiBusy.value = true
  dictionaryAiActiveKey.value = key
  const errors = { ...dictionaryAiErrors.value }; delete errors[key]; dictionaryAiErrors.value = errors
  try {
    const response = await fetch('/api/dictionary/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        term,
        language: dictSourceLang.value === 'auto' ? (entry?.language || 'auto') : dictSourceLang.value,
        known: { zh: entry?.zh || '', ja: entry?.translationJa || entry?.japaneseTerm || '',
          en: entry?.en || entry?.englishTerm || '' },
      }),
      signal: AbortSignal.timeout(25000),
    })
    const data = await response.json() as { explanation?: string; error?: string; remaining?: number }
    if (requestId !== dictionaryAiRequestId) return
    if (typeof data.remaining === 'number') dictionaryAiRemaining.value = data.remaining
    if (!response.ok || !data.explanation) throw new Error(data.error || 'AI 补充失败，请稍后重试。')
    dictionaryAiAnswers.value = { ...dictionaryAiAnswers.value, [key]: data.explanation }
  } catch (error) {
    if (requestId !== dictionaryAiRequestId) return
    dictionaryAiErrors.value = { ...dictionaryAiErrors.value, [key]:
      error instanceof Error && error.name === 'TimeoutError'
        ? 'AI 请求超时，服务端可能仍在处理。请确认今日剩余次数后再试。'
        : error instanceof Error ? error.message : 'AI 补充失败。' }
    void loadDictionaryAiQuota()
  } finally {
    if (requestId === dictionaryAiRequestId) {
      dictionaryAiBusy.value = false
      dictionaryAiActiveKey.value = ''
    }
  }
}
watch([activeModule, authenticated], () => {
  if (activeModule.value === 'dictionary' && authenticated.value) void loadDictionaryAiQuota()
})

async function lookupDictionary() {
  resetDictionaryAiDisplay()
  const q = searchText.value.normalize('NFKC').trim().replace(/\s+/g, ' ')
  const requestedLanguage = dictSourceLang.value
  const requestId = ++dictionaryRequestId
  speechStatus.value = ''
  speechStatusTarget.value = ''
  if (!q) {
    dictionaryError.value = '请先输入中文、日语、英语词句或 IT 术语。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  if (q.length > 100) {
    dictionaryError.value = '一次最多查询 100 个字符，请缩短查询内容。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  // Respect the user's selected dictionary: when the input clearly belongs to the other language,
  // guide them to switch instead of silently querying a different dictionary.
  const containsJapaneseKana = /[\u3040-\u30ff]/.test(q)
  const looksEnglishOnly = /^[A-Za-z][A-Za-z0-9\s._'’/-]*$/.test(q)
  const containsHan = /[\u3400-\u9fff]/.test(q)
  const likelyChinese = /[们这说问请谢学语汉译证权脑简体门车马爱过时现发为见听写买卖东觉欢医约应还钱]/.test(q)
    || /(?:你好|谢谢|什么|怎么|为什么|可以|已经|今天|明天|学习|翻译|中文|英语|日语|天气|电脑|网络|密码)/.test(q)
  if (requestedLanguage === 'en' && containsJapaneseKana) {
    dictionaryError.value = '检测到日语输入，请切换到「日语」后再查询。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  if (requestedLanguage === 'ja' && looksEnglishOnly) {
    dictionaryError.value = '检测到英语输入，请切换到「英语」后再查询。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  if (requestedLanguage === 'en' && containsHan) {
    dictionaryError.value = '检测到汉字输入，请选择「中文」或「日语」后查询。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  if (requestedLanguage === 'ja' && likelyChinese && !containsJapaneseKana) {
    dictionaryError.value = '检测到常见中文表达，请切换到「中文」后查询。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  if (requestedLanguage === 'zh' && (containsJapaneseKana || looksEnglishOnly)) {
    dictionaryError.value = containsJapaneseKana
      ? '检测到日语假名，请切换到「日语」后查询。'
      : '检测到英语输入，请切换到「英语」后查询。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    dictionaryLoading.value = false
    return
  }
  dictionaryLoading.value = true
  dictionaryError.value = ''
  onlineEntries.value = []
  lastSearchedTerm.value = ''
  try {
    const response = await fetch('/api/dictionary?q=' + encodeURIComponent(q) + '&lang=' + encodeURIComponent(requestedLanguage), {
      signal: AbortSignal.timeout(18000),
    })
    const data = await response.json() as { items?: DictionaryEntry[]; error?: string; detected_language?: 'ja' | 'en' | 'zh' | 'it' }
    // Ignore late responses from an older query or language selection.
    if (requestId !== dictionaryRequestId) return
    if (!response.ok) throw new Error(data.error || '在线词典暂时不可用，请稍后再试。')
    onlineEntries.value = data.items || []
    dictionaryDetectedLanguage.value = data.detected_language || ''
    lastSearchedTerm.value = q
    if (onlineEntries.value.length) {
      const stamped = onlineEntries.value.filter(entry => entry.term).slice(0, 3)
      recentDictionaryEntries.value = [
        ...stamped,
        ...recentDictionaryEntries.value.filter(old => !stamped.some(entry => old.term === entry.term)),
      ].slice(0, 12)
    }
    if (!onlineEntries.value.length) dictionaryError.value = data.error || '没有找到匹配词条。试试单个单词、日语假名或常见表达。'
  } catch (error) {
    if (requestId !== dictionaryRequestId) return
    dictionaryError.value = error instanceof Error && error.name === 'TimeoutError'
      ? '查询超时，请检查网络后重试。'
      : error instanceof Error ? error.message : '查询失败，请检查网络后重试。'
  } finally {
    if (requestId === dictionaryRequestId) dictionaryLoading.value = false
  }
}
function clearDictionarySearch() {
  resetDictionaryAiDisplay()
  dictionaryRequestId += 1
  dictionaryLoading.value = false
  speechStatus.value = ''
  speechStatusTarget.value = ''
  searchText.value = ''
  onlineEntries.value = []
  dictionaryDetectedLanguage.value = ''
  lastSearchedTerm.value = ''
  dictionaryError.value = ''
}
function setDictionaryLanguage(language: 'auto' | 'ja' | 'en' | 'zh' | 'it') {
  if (dictSourceLang.value === language) return
  resetDictionaryAiDisplay()
  dictSourceLang.value = language
  dictionaryRequestId += 1
  dictionaryLoading.value = false
  dictionaryDetectedLanguage.value = ''
  onlineEntries.value = []
  lastSearchedTerm.value = ''
  dictionaryError.value = ''
  speechStatus.value = ''
  speechStatusTarget.value = ''
}
function quickDictionarySearch(term: string, language: 'ja' | 'en' | 'zh' | 'it') {
  searchText.value = term
  dictSourceLang.value = language
  void lookupDictionary()
}
watch(savedWords, value => localStorage.setItem('zhixue:saved-words', JSON.stringify(value)), { deep: true })

function navigate(id: ModuleId) {
  stopSpeech()
  resetDictionaryAiDisplay()
  activeModule.value = id
  showMobileMenu.value = false
  searchText.value = ''
}

// 浏览器 TTS 的声音质量因设备而异：优先选择匹配语言的自然/增强语音，
 // 并放慢语速，避免快速连点造成语音重叠或被取消后不播放。
let speechRequestId = 0
function speakQuestion(question: PracticeQuestion | null) {
  if (!question) return
  // Exam content is Japanese; target its own control/status area and never use a Chinese voice.
  const options = question.options.map(option => `${practiceOptionLabel(question, option.id)}。 ${option.text}`).join('。')
  speakJapaneseQuestion(`${question.prompt}。選択肢：${options}`, `exam:${question.id}`)
}
function speakJapaneseQuestion(text: string, statusTarget = '') {
  // Use the same synchronous path as the dictionary play buttons to avoid Safari activation loss.
  speak(text, 'ja-JP', statusTarget)
}
// Where supported, request a media-playback audio session for speech so iOS can route it
// like page media rather than a short ambient sound. This is best-effort only: Safari/iOS
// decides whether the API is supported and how system volume/silent mode are applied.
type BrowserAudioSession = { type: string }
function setSpeechAudioSessionType(type: 'playback' | 'auto') {
  const audioSession = (navigator as Navigator & { audioSession?: BrowserAudioSession }).audioSession
  if (!audioSession) return
  try { audioSession.type = type } catch { /* Unsupported/locked audio-session implementation. */ }
}

/**
 * iOS Safari can route Web Speech through the ambient audio path, which is muted
 * by the hardware silent switch on some versions. Start a very short silent
 * HTMLMediaElement clip from the same user gesture to prime the media-playback
 * path before invoking SpeechSynthesis. This is best-effort; Safari still owns
 * the final audio-session behavior.
 */
function primeMediaAudioSession() {
  let objectUrl = ''
  let audio: HTMLAudioElement | null = null
  const cleanup = () => {
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.remove()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    audio = null
  }

  try {
    const sampleRate = 8000
    const dataBytes = Math.floor(sampleRate * 0.18) * 2
    const buffer = new ArrayBuffer(44 + dataBytes)
    const view = new DataView(buffer)
    const writeText = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
    }
    writeText(0, 'RIFF')
    view.setUint32(4, 36 + dataBytes, true)
    writeText(8, 'WAVE')
    writeText(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeText(36, 'data')
    view.setUint32(40, dataBytes, true)
    objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
    audio = document.createElement('audio')
    audio.preload = 'auto'
    audio.volume = 0.01
    audio.setAttribute('aria-hidden', 'true')
    audio.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none'
    audio.src = objectUrl
    audio.addEventListener('ended', cleanup, { once: true })
    audio.addEventListener('error', cleanup, { once: true })
    document.body.appendChild(audio)
    const playResult = audio.play()
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(cleanup)
    }
  } catch {
    cleanup()
    // The primary SpeechSynthesis path must still run if media priming is blocked.
  }
}

function speak(text: string, lang: 'ja-JP' | 'en-US' | 'zh-CN' = 'ja-JP', statusTarget = '') {
  speechStatusTarget.value = statusTarget
  const spokenText = text.trim()
  speechPlaying.value = false
  if (!spokenText) {
    speechStatus.value = '没有可播放的文字。'
    return
  }
  const synthesis = window.speechSynthesis
  if (typeof synthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    speechStatus.value = '当前浏览器不支持语音合成。请使用 Safari/Chrome，并检查系统语音功能。'
    return
  }

  // 在用户点击的同步路径上尽早请求媒体播放音频会话，帮助移动 Safari 使用媒体音量路由。
  // 浏览器不允许网页直接修改系统音量；不支持 Audio Session API 的设备会自动使用系统默认行为。
  setSpeechAudioSessionType('playback')
  // Keep this synchronous with the user's tap so iOS Safari can treat the clip as media playback.
  primeMediaAudioSession()

  // Call speak() synchronously in the click handler. Delaying with setTimeout may lose
  // browser user activation and cause silent playback failures on Safari/iOS.
  const requestId = ++speechRequestId
  speechPaused.value = false
  speechPlaying.value = false
  try {
    // iOS Safari can silently drop the first utterance when cancel() is called
    // while the speech queue is already idle. Cancel only an actual queued/current
    // utterance; for a fresh tap, preserve the user-activation playback path.
    if (synthesis.speaking || synthesis.pending) synthesis.cancel()
    if (synthesis.paused) synthesis.resume()
  } catch {
    // Continue and report playback failure via utterance.onerror if needed.
  }

  const utterance = new SpeechSynthesisUtterance(spokenText)
  utterance.lang = lang
  utterance.rate = 0.82
  utterance.pitch = 1
  utterance.volume = 1

  const normalize = (value: string) => value.toLowerCase().replace('_', '-')
  const normalizedLang = normalize(lang)
  const prefix = normalizedLang.slice(0, 2)
  const availableVoices = synthesis.getVoices()
  // If Safari still has no voice list on the first tap, keep the utterance's explicit
  // language and let the browser resolve its voice. Returning here used to discard
  // the first tap and require a second tap after voiceschanged fired.
  const voices = availableVoices.filter(voice => normalize(voice.lang).startsWith(prefix))
  // Prefer an on-device voice first. On iOS, a remote/enhanced voice can sometimes
  // fire onstart/onend while producing no audible output (for example, if its asset
  // is unavailable). Only use the preferred-name heuristic within local voices.
  const exactLanguageVoices = voices.filter(candidate => normalize(candidate.lang) === normalizedLang)
  const voice = exactLanguageVoices.find(candidate => candidate.localService && /natural|enhanced|premium|siri|daniel|karen|ava|alex|samantha|kyoko|otoya/i.test(candidate.name))
    || exactLanguageVoices.find(candidate => candidate.localService)
    || exactLanguageVoices.find(candidate => /natural|enhanced|premium|siri|daniel|karen|ava|alex|samantha|kyoko|otoya/i.test(candidate.name))
    || exactLanguageVoices[0]

  // Never fall back to voices[0]: that voice may be Chinese or the opposite target language.
  // If the browser has loaded voices but none for this language, fail visibly rather than
  // silently speaking Japanese text with an English voice (or vice versa).
  if (availableVoices.length > 0 && voices.length === 0) {
    setSpeechAudioSessionType('auto')
    speechStatus.value = lang === 'ja-JP'
      ? '未检测到日语语音。请在系统语音设置中安装日语语音后重试。'
      : lang === 'zh-CN'
        ? '未检测到中文语音。请在系统语音设置中安装中文普通话语音后重试。'
        : '未检测到英语语音。请在系统语音设置中安装英语语音后重试。'
    return
  }
  if (voice) utterance.voice = voice

  let hasStarted = false
  utterance.onstart = () => {
    hasStarted = true
    if (requestId === speechRequestId) {
      speechPlaying.value = true
      speechPaused.value = false
      speechStatus.value = '正在播放：' + spokenText
    }
  }
  utterance.onend = () => {
    setSpeechAudioSessionType('auto')
    if (requestId === speechRequestId) {
      speechPlaying.value = false
      speechPaused.value = false
      speechStatus.value = '播放完成。'
    }
  }
  utterance.onerror = event => {
    setSpeechAudioSessionType('auto')
    if (requestId !== speechRequestId || ['canceled', 'interrupted'].includes(String(event.error))) return
    speechPlaying.value = false
    speechPaused.value = false
    const languageName = lang === 'ja-JP' ? '日语' : lang === 'en-US' ? '英语' : '中文'
    speechStatus.value = '播放失败（' + String(event.error) + '）。请检查浏览器声音、设备静音状态和系统中的' + languageName + '语音。'
  }

  // Audio Session API is not available in every Safari version; use it only when present.
  speechStatus.value = '正在请求播放：' + spokenText
  try {
    synthesis.speak(utterance)
    synthesis.resume()
    // Some browser/system voice failures never fire onerror; avoid leaving a silent
    // "requesting playback" message forever. This watchdog does not delay speak().
    window.setTimeout(() => {
      if (requestId === speechRequestId && !hasStarted && speechStatus.value === '正在请求播放：' + spokenText) {
        setSpeechAudioSessionType('auto')
        speechStatus.value = '浏览器尚未启动语音播放。请检查系统对应语言的语音、浏览器权限与设备静音状态后重试。'
      }
    }, 3500)
  } catch {
    setSpeechAudioSessionType('auto')
    speechStatus.value = '浏览器没有接受这次语音请求，请再次点击播放。'
  }
}

function toggleSpeechPause() {
  const synthesis = window.speechSynthesis
  if (typeof synthesis === 'undefined') return
  if (synthesis.paused) {
    synthesis.resume()
    speechPaused.value = false
    speechPlaying.value = true
    speechStatus.value = '继续播放。'
  } else {
    synthesis.pause()
    speechPaused.value = true
    speechPlaying.value = false
    speechStatus.value = '已暂停播放。'
  }
}
function stopSpeech() {
  setSpeechAudioSessionType('auto')
  const synthesis = window.speechSynthesis
  speechRequestId += 1
  try { synthesis?.cancel() } catch { /* The browser may already have stopped playback. */ }
  speechPaused.value = false
  speechPlaying.value = false
  speechStatus.value = '播放已停止。'
}

function speakDictionaryEnglish(entry: DictionaryEntry) {
  speechStatusTarget.value = entry.term
  const term = entry.englishTerm || (entry.language === 'en' ? entry.term : '')
  if (!term) {
    speechStatus.value = '该词暂未收录可靠的英语对应词，无法播放英语发音。'
    return
  }
  speak(term, 'en-US', entry.term)
}

function speakDictionaryJapanese(entry: DictionaryEntry) {
  speechStatusTarget.value = entry.term
  const text = entry.language === 'ja' ? (entry.reading || entry.term) : (entry.translationJa || entry.reading || '')
  if (!text) {
    speechStatus.value = '该词暂无可靠的日语读音或译文。可试试切换语言再次查询。'
    return
  }
  speak(text, 'ja-JP', entry.term)
}
function speakDictionaryChinese(entry: DictionaryEntry) {
  speechStatusTarget.value = entry.term
  const text = entry.language === 'zh' ? entry.term : entry.zh || ''
  if (!text) {
    speechStatus.value = '该词暂无可播放的中文翻译，请重新查询。'
    return
  }
  speak(text, 'zh-CN', entry.term)
}
</script>

<template>
<section v-if="!authReady" class="auth-screen" aria-live="polite">
    <div class="auth-card"><div class="auth-mark"><BookOpen :size="28" /></div><h1>知学</h1><p>正在确认登录状态…</p></div>
  </section>
  <section v-else-if="!authenticated" class="auth-screen">
    <form class="auth-card" @submit.prevent="login">
      <div class="auth-mark"><ShieldCheck :size="28" /></div>
          <h1>欢迎回来</h1>

      <label class="auth-label" for="study-password">登录密码</label>
      <input id="study-password" v-model="authPassword" class="auth-input" type="password" autocomplete="current-password" required minlength="1" maxlength="256" placeholder="输入你设置的登录密码" :disabled="authLoading || !authConfigured" />
      <p v-if="!authConfigured" class="auth-error" role="alert">登录暂不可用，请联系管理员。</p>
      <p v-else-if="authError" class="auth-error" role="alert">{{ authError }}</p>
      <button class="auth-submit" type="submit" :disabled="authLoading || !authConfigured || !authPassword">
        {{ authLoading ? '正在登录…' : '登录学习平台' }}
      </button>

    </form>
  </section>
  <div v-else class="app-shell">
    <aside class="sidebar">
      <button class="brand" @click="navigate('home')" aria-label="返回首页">
        <span class="brand-mark"><BookOpen :size="23" /></span>
        <span class="brand-copy"><strong>知学</strong></span>
      </button>
      <div class="side-label">学习导航</div>
      <nav class="nav-list">
        <button class="nav-item" :class="{ active: activeModule === 'home' }" @click="navigate('home')"><span class="nav-icon"><Sparkles :size="18" /></span>首页</button>
        <button v-for="item in modules" :key="item.id" class="nav-item" :class="{ active: activeModule === item.id }" @click="navigate(item.id)">
          <span class="nav-icon"><component :is="item.icon" :size="18" /></span>{{ item.title }}
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="focus-card">
          <span class="focus-symbol"><Flame :size="17" /></span>
          <div><strong>每天进步一点点</strong><p>稳定练习，比一次学很多更重要。</p></div>
        </div>
        <div class="profile-row"><div class="avatar">知</div><div class="profile-text"><strong>我的学习空间</strong><small>个人学习</small></div><Menu :size="17" class="muted" /></div>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <button class="mobile-brand" @click="navigate('home')"><span class="brand-mark"><BookOpen :size="20" /></span><strong>知学</strong></button>
        <div class="breadcrumb"><span>我的空间</span><ChevronRight :size="14" /><strong>{{ activeModule === 'home' ? '学习首页' : currentInfo.title }}</strong></div>
        <div class="top-actions">
          <button class="auth-logout" type="button" :disabled="authLoading" @click="logout" aria-label="退出登录">退出登录</button>
          <button class="icon-button mobile-menu-button" @click="showMobileMenu = !showMobileMenu" :aria-label="showMobileMenu ? '关闭菜单' : '打开菜单'" :aria-expanded="showMobileMenu" aria-controls="mobile-nav-list"><X v-if="showMobileMenu" :size="19" /><Menu v-else :size="19" /></button>
        </div>
      </header>

      <p v-if="authError" class="auth-error" role="alert">{{ authError }}</p>
      <nav v-if="showMobileMenu" id="mobile-nav-list" class="mobile-nav" aria-label="主导航">
        <button type="button" :class="{ active: activeModule === 'home' }" :aria-current="activeModule === 'home' ? 'page' : undefined" @click="navigate('home')">首页</button>
        <button v-for="item in modules" :key="item.id" type="button" :class="{ active: activeModule === item.id }" :aria-current="activeModule === item.id ? 'page' : undefined" @click="navigate(item.id)">{{ item.title }}</button>
      </nav>

      <div class="content-wrap">
        <section class="welcome-row">
          <div>
            
            <h1>{{ currentInfo.title }}</h1>
            <p class="welcome-subtitle">{{ currentInfo.subtitle }}</p>
          </div>
          
        </section>

        <template v-if="activeModule === 'home'">
          <section class="hero-panel">
            <div class="hero-content">

              <h2>每天学一点，<br /><span>进步看得见。</span></h2>

              <button class="primary-button" @click="navigate('exam')">开始练习 <ArrowRight :size="17" /></button>

            </div>
            <div class="hero-art" aria-hidden="true">
              <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
              <div class="art-sun"></div>
              <div class="art-book"><div class="book-page page-left"></div><div class="book-page page-right"></div><div class="book-spine"></div><span class="book-star">✳</span></div>

              <span class="art-spark spark-a">✦</span><span class="art-spark spark-b">✳</span><span class="art-dot dot-a"></span><span class="art-dot dot-b"></span>
            </div>
          </section>

          <section class="section-block">
            <div class="section-heading"><div><h2>选择学习模块</h2></div></div>
            <div class="module-grid">
              <button v-for="item in modules" :key="item.id" class="module-card" @click="navigate(item.id)">
                <div class="module-card-top"><span class="module-icon" :class="item.tone"><component :is="item.icon" :size="22" /></span><span class="card-arrow"><ArrowRight :size="17" /></span></div>
                <h3>{{ item.title }}</h3><p>{{ item.desc }}</p>
                <div class="module-card-foot"><span>{{ item.count }}</span><ChevronRight :size="15" /></div>
              </button>
            </div>
          </section>

          <section class="progress-dashboard">
            <div class="section-heading"><div><h2>学习概览</h2></div></div>
            <p v-if="cloudDashboardError" class="dictionary-status dictionary-error">{{ cloudDashboardError }}</p>
            <div v-if="cloudDashboard" class="metric-grid">
              <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>云端答题</small><strong>{{ cloudDashboard.exam.attempted_questions }}</strong><span>{{ cloudDashboard.exam.accuracy_percent === null ? '暂无记录' : '正确率 ' + cloudDashboard.exam.accuracy_percent + '%' }}</span></div>
              <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>实战训练</small><strong>{{ cloudDashboard.practical.completed_scenarios }}</strong><span>{{ cloudDashboard.practical.completed_scenarios ? '平均得分 ' + Math.round(cloudDashboard.practical.average_score) + ' 分' : '暂无记录' }}</span></div>
              <div class="panel metric-card"><span class="metric-icon"><BookMarked :size="18" /></span><small>云端生词</small><strong>{{ cloudDashboard.vocabulary.saved_terms }}</strong><span>个已收藏词条</span></div>
            </div>
          </section>
          <section class="progress-dashboard">
            <div class="section-heading"><div><h2>今日进度</h2></div></div>
            <div class="progress-overview">
              <div class="panel daily-progress-panel">
                <div class="progress-title"><span class="metric-icon"><Target :size="18" /></span><div><strong>每日学习目标</strong><small>目标 {{ dailyGoalMinutes }} 分钟</small></div><b>{{ dailyPercent }}%</b></div>
                <div class="big-progress-track"><span :style="{ width: dailyPercent + '%' }"></span></div>
                <p>{{ completedMinutes >= dailyGoalMinutes ? '今日目标达成，做得不错！' : '再学习 ' + (dailyGoalMinutes - completedMinutes) + ' 分钟即可达成今日目标。' }}</p>
              </div>
              <div class="panel task-panel">
                <div class="panel-heading"><div><h3><ListChecks :size="16" /> 今日学习计划</h3><p>{{ tasks.filter(task => task.done).length }} / {{ tasks.length }} 项已完成</p></div></div>
                <div v-if="pendingDailyTasks.size" class="dictionary-status" role="status">
                  <p>有任务尚未同步。覆盖会将本机状态写入云端，可能覆盖其他设备的更改。</p>
                  <p v-for="item in Array.from(pendingDailyTasks.values())" :key="item.id">
                    {{ item.date }} · {{ defaultTasks.find(task => task.id === item.taskId)?.title || item.taskId }}<br>
                    本机待同步：{{ item.completed ? '已完成' : '未完成' }} · 上次读取的云端：{{ dailyCloudStates.has(item.date + ':' + item.taskId) ? (dailyCloudStates.get(item.date + ':' + item.taskId) ? '已完成' : '未完成') : '尚未读取' }}
                    <button type="button" class="text-link" @click="retryPendingDailyTask(item)">以本机状态覆盖云端</button>
                  </p>
                </div>
                <label v-for="task in tasks" :key="task.id" class="study-task" :class="{ completed: task.done }">
                  <input :checked="task.done" type="checkbox" @change="toggleDailyTask(task.id, ($event.target as HTMLInputElement).checked)" />
                  <span class="task-copy"><strong>{{ task.title }}</strong><small>{{ task.detail }}</small></span>
                  <span class="task-minutes">{{ task.minutes }} 分钟</span>
                </label>
              </div>
            </div>
          </section>
          <section class="progress-dashboard">
            <div class="section-heading"><div><h2>练习成绩</h2></div><button class="text-link" @click="navigate('exam')">查看考试记录 <ArrowRight :size="14" /></button></div>
            <div class="metric-grid">
              <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>累计答题</small><strong>{{ totalAnswered }}</strong><span>道题</span></div>
              <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>总体正确率</small><strong>{{ overallAccuracy === null ? '—' : overallAccuracy + '%' }}</strong><span>{{ overallAccuracy === null ? '记录首次练习后显示' : totalCorrect + ' 道答对' }}</span></div>
              <div class="panel metric-card"><span class="metric-icon"><TrendingUp :size="18" /></span><small>最近一次练习</small><strong>{{ latestRecord ? Math.round(latestRecord.correct / latestRecord.total * 100) + '%' : '—' }}</strong><span>{{ latestRecord ? latestRecord.exam + ' · ' + latestRecord.date : '暂无历史成绩' }}</span></div>
            </div>
            <div class="panel curve-panel">
              <div class="panel-heading"><div><h3>近 7 天正确率</h3></div><span class="curve-legend"><i></i>正确率</span></div>
              <div v-if="examRecords.length" class="curve-chart">
                <div v-for="day in curveRecords" :key="day.date" class="curve-column">
                  <div class="curve-value">{{ day.accuracy === null ? '—' : day.accuracy + '%' }}</div>
                  <div class="curve-bar-area"><span v-if="day.accuracy !== null" class="curve-bar" :style="{ height: Math.max(4, day.accuracy) + '%' }"></span><span v-else class="curve-empty"></span></div>
                  <small>{{ day.label }}</small>
                </div>
              </div>
              <div v-else class="curve-empty-state"><TrendingUp :size="24" /><strong>完成第一次练习，学习曲线就会开始生长</strong><button class="text-link" @click="navigate('exam')">去记录成绩 <ArrowRight :size="14" /></button></div>
            </div>
          </section>
          <section class="bottom-grid">
            <div class="panel recent-panel">
              <div class="panel-heading"><div><h3>最近查过的词</h3></div><button class="text-link" @click="navigate('dictionary')">打开词典 <ArrowRight :size="14" /></button></div>
              <div v-for="entry in recentDictionaryEntries.slice(0, 2)" :key="entry.term" class="word-row">
                <div class="word-letter">{{ (entry.language === 'en' && entry.englishTerm ? entry.englishTerm : entry.term).slice(0,1) }}</div>
                <div class="word-details"><strong>{{ entry.language === 'en' && entry.englishTerm ? entry.englishTerm : entry.term }} <small>{{ entry.reading || entry.phonetic || '' }}</small></strong><span>{{ entry.en || entry.translationJa || '' }}</span></div>
                <button v-if="entry.englishTerm || entry.language === 'en'" class="round-action pronunciation-button" @click="speakDictionaryEnglish(entry)" aria-label="播放英语发音" title="播放英语发音"><Volume2 :size="14" /><span>EN</span></button>
                <button v-if="entry.reading || entry.language === 'ja' || entry.language === 'en' || entry.englishTerm" class="round-action pronunciation-button" @click="speakDictionaryJapanese(entry)" aria-label="播放日语辅助读音" title="播放日语辅助读音（片假名为近似提示）"><Languages :size="14" /><span>日</span></button>
              </div>
              <div v-if="recentDictionaryEntries.length === 0" class="recent-dictionary-empty">查词记录将显示在这里。</div>
            </div>
            <div class="panel daily-panel">
              <div class="daily-icon"><Clock3 :size="19" /></div><div class="daily-copy"><h3>今日小目标</h3><button class="text-link" @click="navigate('language')">开始轻量练习 <ArrowRight :size="14" /></button></div>
            </div>
          </section>
        </template>

        <template v-else-if="activeModule === 'exam'">
          <section class="section-block module-page-section">
            <div class="section-heading"><div><h2>选择要准备的考试</h2></div></div>
            <p v-if="tracksLoading" class="dictionary-status">正在加载可用考试…</p>
            <p v-else-if="tracksError" class="dictionary-status dictionary-error">{{ tracksError }}</p>
            <div class="exam-list">
              <button v-for="exam in examTracks" :key="exam.id" class="exam-card" :class="{ 'exam-card-selected': selectedTrackId === exam.id }" :disabled="mockStarted || mockLoading" @click="selectExam(exam)">
                <span class="exam-code" :class="exam.id.endsWith('sg') ? 'purple' : exam.id.endsWith('fe') ? 'blue' : 'green'">{{ exam.id.split('-').pop()?.toUpperCase() }}</span>
                <span class="exam-info"><strong>{{ exam.title }}</strong><small>{{ exam.subtitle }}</small></span>
                <span class="exam-progress">{{ '真题 ' + (exam.official_question_count || 0) + ' · 预测 ' + (exam.prediction_question_count || 0) + (exam.id === 'exam-fe' ? ' · 改编 ' + (exam.adapted_question_count || 0) : '') }}</span><ChevronRight :size="18" class="muted" />
              </button>
              <div v-if="!tracksLoading && !tracksError && examTracks.length === 0" class="empty-state"><GraduationCap :size="25" /><strong>暂无已启用的考试</strong><p>目前没有可用的考试内容，请稍后刷新。</p></div>
            </div>

            <section class="practice-section">
              <div class="section-heading practice-heading">
                <div><h2>{{ selectedTrack ? selectedTrack.title + ' · 练习题' : '练习题' }}</h2></div>
                <span v-if="selectedTrackId === 'exam-fe'" class="fe-bank-inline-status" :class="{ 'fe-bank-inline-status-idle': !feBankLoading }" :role="feBankLoading ? 'status' : undefined" :aria-hidden="!feBankLoading">同步题库中…</span>
              </div>
              <p v-if="selectedTrackId === 'exam-fe' && feBankError" class="dictionary-status dictionary-error" role="alert">{{ feBankError }} <button class="text-link" @click="prepareFeBank">重试</button></p>
              <p v-if="pendingPracticeAttempt" class="dictionary-status" role="status">
                答题待同步。
                <button type="button" class="text-link" :disabled="practiceSaving" @click="syncPendingPracticeAttempt">{{ practiceSaving ? '同步中…' : '重试同步' }}</button>
              </p>
              <div class="question-source-filters" role="group" aria-label="题目来源筛选">
                <button v-for="filter in questionSourceFilters.filter(item => item.id !== 'licensed' || selectedTrackId === 'exam-fe')" :key="filter.id" type="button" class="source-filter-button" :class="{ active: questionSourceFilter === filter.id }" :aria-pressed="questionSourceFilter === filter.id" :disabled="selectedTrackId === 'exam-fe' && feBankLoading" @click="selectQuestionSource(filter.id)">{{ filter.label }}（{{ filter.id === 'all' ? (selectedTrack?.question_count || 0) : filter.id === 'official' ? (selectedTrack?.official_question_count || 0) : filter.id === 'licensed' ? (selectedTrack?.adapted_question_count || 0) : (selectedTrack?.prediction_question_count || 0) }}）</button>
              </div>
              <div v-if="practiceHasDetailedFilters" class="question-category-section">
                <div class="question-category-heading"><strong>筛选题目</strong></div>
                <div class="fe-filter-controls">
                  <label>年度
                    <select v-model="practiceYear" :aria-label="selectedTrackId === 'exam-sg' ? 'SG 年度' : 'FE 年度'" @change="applyPracticeFilter('year')">
                      <option value="">全部</option>
                      <option v-for="year in practiceYearOptions" :key="year" :value="String(year)">{{ year }} 年</option>
                    </select>
                  </label>
                  <label>科目
                    <select v-model="practiceSection" :aria-label="selectedTrackId === 'exam-sg' ? 'SG 科目' : 'FE 科目'" @change="applyPracticeFilter('section')">
                      <option value="all">全部</option>
                      <option value="A">{{ selectedTrackId === 'exam-sg' ? '科目 A（含旧午前题）' : '科目 A' }}</option>
                      <option value="B">科目 B</option>
                    </select>
                  </label>
                  <label>领域
                    <select v-model="practiceTopic" :aria-label="selectedTrackId === 'exam-sg' ? 'SG 领域' : 'FE 领域'" @change="applyPracticeFilter('topic')">
                      <option value="">全部</option>
                      <option v-for="item in practiceTopicOptions" :key="item.topic" :value="item.topic">{{ item.topic }}（{{ item.question_count }}）</option>
                    </select>
                  </label>
                </div>

              </div>
              <div class="question-category-section">
                <div class="question-category-heading"><strong>学习状态</strong></div>
                <div class="question-category-filters question-review-filters" role="group" aria-label="题目学习状态">
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'all' }" :aria-pressed="activeReviewMode === 'all'" :disabled="selectedTrackId === 'exam-fe' && feBankLoading" @click="selectReviewMode('all')">全部</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'unlearned' }" :aria-pressed="activeReviewMode === 'unlearned'" :disabled="selectedTrackId === 'exam-fe' && feBankLoading" @click="selectReviewMode('unlearned')">未学习</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'mastered' }" :aria-pressed="activeReviewMode === 'mastered'" :disabled="selectedTrackId === 'exam-fe' && feBankLoading" @click="selectReviewMode('mastered')">已掌握</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'due' }" :aria-pressed="activeReviewMode === 'due'" :disabled="selectedTrackId === 'exam-fe' && feBankLoading" @click="selectReviewMode('due')">待复习</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'wrong' }" :aria-pressed="activeReviewMode === 'wrong'" :disabled="selectedTrackId === 'exam-fe' && feBankLoading" @click="selectReviewMode('wrong')">错题集</button>
                </div>
              </div>
              <div v-if="!quizQuestions.length || quizFinished" class="panel practice-start-card">
                <template v-if="quizFinished">
                  <div class="practice-result-icon"><CheckCircle2 :size="28" /></div>
                  <div class="practice-result-score">{{ quizCorrect }} / {{ quizQuestions.length }}</div>
                  <h3>本次练习完成</h3>
                  <p>正确率 {{ Math.round(quizCorrect / quizQuestions.length * 100) }}%。成绩已保存到本机。</p>
                  <p class="muted">当前筛选题量 {{ questionBankTotal }} 题 · 本组 {{ questionBatchOffset + 1 }}–{{ Math.min(questionBatchOffset + quizQuestions.length, questionBankTotal) }} 题</p>
                  <p v-if="quizError" class="practice-error" role="alert">{{ quizError }}</p>
                  <button class="primary-button" @click="nextQuestionBatch" :disabled="quizLoading">{{ quizLoading ? '正在加载…' : questionBankHasMore ? '继续下一组（10 题）' : '从头再练' }} <ArrowRight :size="16" /></button>
                </template>
                <template v-else>
                  <div class="practice-start-icon"><GraduationCap :size="25" /></div>
                  <h3>开始刷题</h3>
                  <p v-if="selectedTrack?.question_count">每组最多 10 题，提交后查看解析。</p>
                  <p v-else>选择考试后开始练习。</p>
                  <div class="practice-start-actions">
                    <button class="primary-button" @click="startPractice" :disabled="quizLoading || (selectedTrackId === 'exam-fe' && feBankLoading) || !selectedTrack || selectedTrack.question_count === 0">{{ quizLoading || (selectedTrackId === 'exam-fe' && feBankLoading) ? '正在加载题目…' : selectedTrack?.question_count ? '开始练习（10 题）' : '当前暂无可练习题目' }} <ArrowRight :size="16" /></button>
                  </div>
                  <p v-if="quizError" class="practice-error">{{ quizError }}</p>
                </template>
              </div>
              <div v-else-if="currentQuestion" class="panel question-card">
                <div class="question-topline"><span>{{ selectedTrack?.title || '考试练习' }} · 第 {{ quizIndex + 1 }} / {{ quizQuestions.length }} 题 · {{ currentQuestion.exam_section ? '科目' + currentQuestion.exam_section : '题型待复核' }}<template v-if="currentQuestion.exam_section && currentQuestion.exam_section_method !== 'explicit'"></template></span><span class="source-pill">{{ currentQuestion?.source_type === 'generated' ? '预测题库 · 原创' : currentQuestion?.source_type === 'official' ? '历年真题' : currentQuestion?.source_type === 'licensed' ? '真题改编' : '其他题目' }}</span></div>
                <div class="question-progress"><span :style="{ width: ((quizIndex + 1) / quizQuestions.length * 100) + '%' }"></span></div>
                <div class="question-topic">{{ currentQuestion.topic }}</div>
                <div class="question-mastery-row">
                  <span class="question-mastery-badge" :class="{ mastered: Boolean(questionProgressById[currentQuestion.id]?.mastered) }">
                    {{ !questionProgressById[currentQuestion.id] ? '未开始' : questionProgressById[currentQuestion.id].mastered ? '已掌握' : questionProgressById[currentQuestion.id].last_result === 'again' ? '需要复习' : '学习中' }}
                  </span>
                  <span>连续答对 {{ questionProgressById[currentQuestion.id]?.correct_streak || 0 }} 次</span>
                  <span>复习 {{ questionProgressById[currentQuestion.id]?.review_count || 0 }} 次</span>
                </div>
                <a v-if="(currentQuestion.source_type === 'official' || currentQuestion.source_type === 'licensed') && currentQuestion.source_reference" class="language-source" :href="currentQuestion.source_reference" target="_blank" rel="noreferrer">查看 IPA 原题 ↗</a>
                <p v-if="currentQuestion.id === 'fe-ipa-official-2026-a-06'" class="dictionary-status">波形图以 0、1 表示各区间；可查看 IPA 原图。</p>
                <div class="question-prompt-row">
                  <h3 class="question-prompt">{{ currentQuestion.prompt }}</h3>
                  <button type="button" class="question-speak-button" @click="speakQuestion(currentQuestion)" aria-label="日语朗读题目" title="日语朗读题目"><Volume2 :size="14" /> 听题</button>
                </div>
                <div v-if="speechStatus && speechStatusTarget === 'exam:' + currentQuestion.id" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                <div class="question-options">
                  <button v-for="option in currentQuestion.options" :key="option.id" class="question-option" :class="{ selected: selectedOption === option.id, correct: quizSubmitted && option.id === currentQuestion.answer, incorrect: quizSubmitted && selectedOption === option.id && option.id !== currentQuestion.answer }" :disabled="quizSubmitted" @click="selectedOption = option.id">
                    <span>{{ practiceOptionLabel(currentQuestion, option.id) }}</span><strong>{{ option.text }}</strong><CheckCircle2 v-if="quizSubmitted && option.id === currentQuestion.answer" :size="17" />
                  </button>
                </div>
                <div v-if="quizSubmitted" class="answer-explanation" :class="{ right: selectedOption === currentQuestion.answer }">
                  <strong>{{ selectedOption === currentQuestion.answer ? '回答正确！' : '这题答错了' }} 正确答案：{{ practiceOptionLabel(currentQuestion, currentQuestion.answer) }}</strong>
                  <template v-if="getExplanationLanguage(currentQuestion) !== 'zh-CN'">
                    <p class="explanation-original-label">原文解析</p>
                    <p>{{ currentQuestion.explanation }}</p>
                  </template>
                  <div class="explanation-chinese">
                    <strong>中文解析</strong>
                    <p v-if="getExplanationLanguage(currentQuestion) === 'zh-CN'">{{ currentQuestion.explanation }}</p>
                    <p v-else-if="questionExplanationTranslating[currentQuestion.id]">正在翻译解析…</p>
                    <p v-else-if="questionExplanationTranslations[currentQuestion.id]?.source_text === currentQuestion.explanation">{{ questionExplanationTranslations[currentQuestion.id].translation_zh }}</p>
                    <div v-else>
                      <p v-if="questionExplanationTranslationErrors[currentQuestion.id]">{{ questionExplanationTranslationErrors[currentQuestion.id] }}</p>
                      <button type="button" class="text-link" @click="translateQuestionExplanation(currentQuestion)">{{ questionExplanationTranslationErrors[currentQuestion.id] ? '重试中文翻译' : '翻译为中文' }}</button>
                    </div>
                  </div>
                </div>
                <div class="question-actions">
                  <span v-if="!quizSubmitted" class="question-hint">选择一个答案后提交</span><span v-else class="question-hint">当前得分：{{ quizCorrect }} / {{ quizIndex + 1 }}</span>
                  <button v-if="quizSubmitted && !questionProgressById[currentQuestion.id]?.mastered" class="secondary-button" @click="setQuestionMastery(currentQuestion.id, true)">标记掌握</button>
                  <button v-else-if="quizSubmitted && questionProgressById[currentQuestion.id]?.mastered" class="secondary-button" @click="setQuestionMastery(currentQuestion.id, false)">重新加入复习</button>
                  <button v-if="!quizSubmitted" class="primary-button" :disabled="!selectedOption || practiceSaving || Boolean(pendingPracticeAttempt)" @click="submitPracticeAnswer">提交答案 <ArrowRight :size="15" /></button>
                  <button v-else-if="pendingPracticeAttempt?.question_id === currentQuestion.id" class="primary-button" :disabled="practiceSaving" @click="submitPracticeAnswer">{{ practiceSaving ? '同步中…' : '重试同步' }}</button>
                  <button v-else class="primary-button" @click="nextPracticeQuestion">{{ isLastQuestion ? '查看本次成绩' : '下一题' }} <ArrowRight :size="15" /></button>
                </div>
              </div>
            </section>
            <section class="section-block mock-exam-section">
              <div class="section-heading"><div><h2>限时模拟考试</h2><p v-if="selectedTrackId === 'exam-fe'">科目 A、B 分别计时；科目 B 为近似题型比例。</p><p v-else>共 60 题，限时 120 分钟。</p></div><span v-if="selectedTrackId !== 'exam-fe'" class="source-pill">A 48 题 · B 12 题</span></div>
              <div v-if="selectedTrackId === 'exam-fe' && !mockStarted && !mockSubmitted" class="question-source-filters" role="group" aria-label="选择 FE 模拟科目">
                <button v-for="section in (['A', 'B'] as const)" :key="section" type="button" class="source-filter-button" :class="{ active: feMockSection === section }" :aria-pressed="feMockSection === section" :disabled="mockLoading" @click="feMockSection = section; mockError = ''">科目 {{ section }} · {{ section === 'A' ? '60 题 / 90 分钟' : '20 题 / 100 分钟' }}</button>
              </div>
              <div v-if="mockPendingSubmission" class="dictionary-status" role="status">
                <span>未同步的模拟考试答卷已保留在本设备（{{ mockPendingSubmission.study_date }}）。</span>
                <button type="button" class="text-link" :disabled="mockSyncing" @click="syncPendingMockSubmission">{{ mockSyncing ? '同步中…' : '重试同步' }}</button>
              </div>
              <div v-if="!mockStarted && !mockSubmitted" class="panel practice-start-card">
                <div class="practice-start-icon"><Clock3 :size="25" /></div><h3>模拟考试</h3>
                <p v-if="selectedTrackId === 'exam-fe'">科目 {{ feMockSection }} 模拟{{ feMockSection === 'A' ? '60 题、90 分钟' : '20 题、100 分钟；算法与程序设计 16 题、信息安全 4 题（按官方约占比近似）' }}。题量不足时不会用重复题补足。</p><p v-else>当前题库有 {{ selectedTrack?.question_count || 0 }} 道可用题目。模拟固定 60 题、限时 120 分钟；题量不足时不会用重复题补足。</p>
                <button class="primary-button" @click="startMockExam"  :disabled="mockLoading || (selectedTrackId === 'exam-fe' && feBankLoading) || !selectedTrack || (selectedTrack.id !== 'exam-fe' && selectedTrack.id !== 'exam-sg')">{{ mockLoading ? '正在准备题目…' : '开始限时模拟' }} <ArrowRight :size="16" /></button>
                <p v-if="mockError" class="practice-error">{{ mockError }}</p>
              </div>
              <div v-else-if="mockSubmitted" class="panel practice-start-card">
                <p v-if="mockPendingSubmission || mockSyncing" class="dictionary-status" role="status">答卷正在保存，正确答案将在交卷成功后显示。</p>
                <template v-else>
                <div class="practice-result-icon"><CheckCircle2 :size="28" /></div>
                <div class="practice-result-score">{{ mockAccuracy }}% 正确率</div>
                <h3>模拟考试已交卷</h3><p>答对 {{ mockCorrectCount }} / {{ mockQuestions.length }} 题 · 已作答 {{ mockAnsweredCount }} / {{ mockQuestions.length }} 题。正确率不代表官方标准分。</p>
                <p v-if="mockError" class="practice-error">{{ mockError }}</p>
                <div class="mock-review-list">
                  <article v-for="(question, index) in mockQuestions" :key="question.id" class="mock-review-item">
                    <div class="question-topic">第 {{ index + 1 }} 题 · {{ question.topic }}</div>
                    <strong>{{ question.prompt }}</strong>
                    <p>你的答案：{{ question.options.find(option => option.id === mockAnswers[question.id])?.text || '未作答' }}</p>
                    <p>正确答案：{{ question.options.find(option => option.id === question.answer)?.text || question.answer }}</p>
                    <p class="answer-explanation">{{ question.explanation }}</p>
                  </article>
                </div>
                <button class="primary-button" @click="mockSubmitted = false; mockQuestions = []; mockAnswers = {}; mockError = ''; localStorage.removeItem(MOCK_REVIEW_KEY)">结束复盘 <ArrowRight :size="16" /></button>
                </template>
              </div>
              <div v-else class="mock-exam-active">
                <p v-if="mockStorageWarning" class="dictionary-status dictionary-error" role="alert">{{ mockStorageWarning }}</p>
                <div class="panel mock-timer-panel">
                  <div><small>剩余时间</small><strong :class="{ 'mock-time-warning': mockRemainingSeconds <= 60 }">{{ formatMockTime(mockRemainingSeconds) }}</strong></div>
                  <div><small>已作答</small><strong>{{ mockAnsweredCount }} / {{ mockQuestions.length }}</strong></div>
                  <button class="primary-button" @click="finishMockExam(false)">交卷并查看结果</button>
                </div>
                <article v-for="(question, index) in mockQuestions" :key="question.id" class="panel question-card mock-question-card">
                  <div class="question-topline"><span>第 {{ index + 1 }} / {{ mockQuestions.length }} 题 · 科目{{ question.exam_section }} · {{ question.topic }}</span><span class="source-pill">{{ question.source_type === 'generated' ? '预测题库 · 原创' : question.source_type === 'official' ? '历年真题' : question.source_type === 'licensed' ? '真题改编' : '其他题目' }}</span></div>
                  <a v-if="(question.source_type === 'official' || question.source_type === 'licensed') && question.source_reference" class="language-source" :href="question.source_reference" target="_blank" rel="noreferrer">查看 IPA 原题 ↗</a>
                  <p v-if="question.id === 'fe-ipa-official-2026-a-06'" class="dictionary-status">波形图以 0、1 表示；可查看 IPA 原图。</p>
                  <div class="question-prompt-row">
                    <h3 class="question-prompt">{{ question.prompt }}</h3>
                    <button type="button" class="question-speak-button" @click="speakQuestion(question)" aria-label="日语朗读题目" title="日语朗读题目"><Volume2 :size="14" /> 听题</button>
                  </div>
                  <div v-if="speechStatus && speechStatusTarget === 'exam:' + question.id" class="dictionary-speech-controls" role="status" aria-live="polite">
                    <p class="dictionary-status">{{ speechStatus }}</p>
                    
                    <button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button>
                    <button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button>
                  </div>
                  <div class="question-options">
                    <button v-for="option in question.options" :key="option.id" class="question-option" :class="{ selected: mockAnswers[question.id] === option.id }" @click="mockAnswers[question.id] = option.id">
                      <span>{{ practiceOptionLabel(question, option.id) }}</span><strong>{{ option.text }}</strong>
                    </button>
                  </div>
                </article>
                <p v-if="mockError" class="practice-error">{{ mockError }}</p>
              </div>
            </section>
            <section class="exam-performance">
              <div class="section-heading"><div><h2>正确率与历史成绩</h2></div><button class="primary-button" @click="addExamRecord"><PlusCircle :size="16" /> 记录一次练习成绩</button></div>
              <div class="metric-grid">
                <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>累计答题</small><strong>{{ totalAnswered }}</strong><span>道题</span></div>
                <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>总体正确率</small><strong>{{ overallAccuracy === null ? '—' : overallAccuracy + '%' }}</strong><span>{{ overallAccuracy === null ? '暂无成绩，记录后自动计算' : totalCorrect + ' 道答对' }}</span></div>
                <div class="panel metric-card"><span class="metric-icon"><TrendingUp :size="18" /></span><small>考试记录</small><strong>{{ examRecords.length }}</strong><span>次练习</span></div>
              </div>
              <div class="panel curve-panel">
                <div class="panel-heading"><div><h3>近 7 天正确率</h3><p>每日答题正确率按题量加权计算，不存在记录的日期不绘制数据。</p></div><button v-if="examRecords.length" class="text-link" :disabled="examHistorySyncing" @click="removeExamRecords">{{ examHistorySyncing ? '正在同步…' : '清除记录' }}</button></div>
                <div v-if="examRecords.length" class="curve-chart">
                  <div v-for="day in curveRecords" :key="day.date" class="curve-column">
                    <div class="curve-value">{{ day.accuracy === null ? '—' : day.accuracy + '%' }}</div>
                    <div class="curve-bar-area"><span v-if="day.accuracy !== null" class="curve-bar" :style="{ height: Math.max(4, day.accuracy) + '%' }"></span><span v-else class="curve-empty"></span></div>
                    <small>{{ day.label }}</small>
                  </div>
                </div>
                <div v-else class="curve-empty-state"><TrendingUp :size="24" /><strong>还没有历史成绩</strong><p>完成练习后，记录答对数和总题数，就能查看正确率与学习曲线。</p></div>
                <div v-if="examRecords.length" class="history-list">
                  <div v-for="(record, index) in [...examRecords].reverse()" :key="record.date + record.exam + index" class="history-row">
                    <div><strong>{{ record.exam }} 练习</strong><small>{{ record.date }}</small></div>
                    <span>{{ record.correct }} / {{ record.total }} 题</span>
                    <strong class="history-accuracy">{{ Math.round(record.correct / record.total * 100) }}%</strong>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </template>

        <template v-else-if="activeModule === 'practical'">
          <p v-if="pendingScenarioAttempt" class="dictionary-status" role="status">
            实战答题待同步。
            <button type="button" class="text-link" :disabled="scenarioSubmitting" @click="syncPendingScenarioAttempt">{{ scenarioSubmitting ? '同步中…' : '重试同步' }}</button>
          </p>
          <section class="section-block module-page-section">
            <div class="section-heading"><div><h2>情境练习</h2></div></div>
            <div class="panel practice-start-card">
              <div class="section-heading"><div><h3>选择训练方向</h3></div></div>
              <div class="exam-list">
                <button v-for="exam in examTracks.filter(item => item.id === 'exam-sg' || item.id === 'exam-fe')" :key="exam.id" class="exam-card" :class="{ 'exam-card-selected': selectedTrackId === exam.id }" :disabled="mockStarted || mockLoading" @click="selectExam(exam)">
                  <span class="exam-code" :class="exam.id === 'exam-fe' ? 'blue' : 'purple'">{{ exam.id.split('-').pop()?.toUpperCase() }}</span>
                  <span class="exam-info"><strong>{{ exam.title }}</strong><small>{{ exam.subtitle }}</small></span>
                  <ChevronRight :size="18" class="muted" />
                </button>
              </div>
            </div>
            <div v-if="selectedTrackId === 'exam-fe'" class="question-category-section">
              <div class="question-category-heading"><strong>FE 实战训练</strong><span>原创情境，不作为 IPA 官方真题</span></div>
              <div class="question-review-filters question-category-filters" role="group" aria-label="FE 实战训练科目">
                <button v-for="part in [{ id: 'all', label: '全部' }, { id: 'A', label: '科目A' }, { id: 'B', label: '科目B' }]"
                  :key="part.id" type="button" class="question-category-button" :class="{ active: practicalSection === part.id }"
                  :aria-pressed="practicalSection === part.id" @click="selectPracticalSection(part.id as 'all' | 'A' | 'B')">{{ part.label }}（{{ part.id === 'all' ? scenarios.length : scenarios.filter(item => item.exam_section === part.id).length }}）</button>
              </div>
            </div>
            <div v-if="scenarios.length > 0" class="question-category-section">
              <div class="question-category-heading"><strong>领域</strong><span>{{ visibleScenarios.length }} / {{ scenarios.length }} 情境</span></div>
              <div class="fe-filter-controls">
                <label>领域
                  <select :value="practicalCategory" aria-label="实战训练领域" @change="selectPracticalCategory(($event.target as HTMLSelectElement).value)">
                    <option value="">全部</option>
                    <option v-for="category in practicalCategoryOptions" :key="category" :value="category">{{ category }}</option>
                  </select>
                </label>
              </div>
            </div>
            <p v-if="scenariosLoading" class="dictionary-status">正在加载实战情境…</p>
            <p v-else-if="scenariosError" class="dictionary-status dictionary-error">{{ scenariosError }}</p>
            <div v-else-if="!currentScenario" class="empty-state">
              <ShieldCheck :size="25" /><strong>实战情境暂时为空</strong>
              <p>{{ scenarios.length ? '当前筛选没有匹配情境，请切换科目或分野。' : '暂时没有可用的实战情境，请稍后刷新再试。' }}</p>
              <button class="secondary-button" @click="loadScenarios">重新加载</button>
            </div>
            <article v-else class="panel question-card practical-scenario-card">
              <div class="question-topline"><span>{{ selectedTrackId.toUpperCase().replace('EXAM-', '') }}{{ currentScenario.exam_section ? ' · 科目' + currentScenario.exam_section : '' }} · {{ currentScenario.category }} · {{ practicalPosition }} / {{ visibleScenarios.length }} · {{ currentScenario.difficulty === 'intermediate' ? '中等' : '标准' }}</span><span class="source-pill">{{ currentScenario.source_type === 'official' ? '官方来源' : '平台原创情境' }}</span></div>
              <div class="question-prompt-row">
                <h3 class="question-prompt">{{ currentScenario.title }}</h3>
                <button type="button" class="secondary-button question-speak-button" @click="speakScenario(currentScenario)" aria-label="日语语音朗读实战情境" title="日语语音朗读实战情境"><Volume2 :size="14" /> 听情境</button>
              </div>
              <div v-if="speechStatus && speechStatusTarget === 'practical:' + currentScenario.id" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
              <p class="scenario-situation">{{ currentScenario.situation }}</p>
              <h4>{{ currentScenario.task }}</h4>
              <div class="question-options">
                <button v-for="option in currentScenario.options" :key="option.id" class="question-option" :class="{ selected: selectedScenarioOption === option.id, correct: scenarioResult && option.id === scenarioResult.best_option, incorrect: scenarioResult && option.id === selectedScenarioOption && !scenarioResult.correct }" :disabled="Boolean(scenarioResult) || scenarioSubmitting" @click="selectedScenarioOption = option.id">
                  <span>{{ option.id.toUpperCase() }}</span><strong>{{ option.text }}</strong>
                  <CheckCircle2 v-if="scenarioResult && option.id === scenarioResult.best_option" :size="17" />
                </button>
              </div>
              <div v-if="scenarioResult" class="answer-explanation" :class="{ right: scenarioResult.correct }">
                <strong>{{ scenarioResult.correct ? '判断正确' : '可以做得更好' }} · 得分 {{ scenarioResult.score }}/100 · 推荐选项 {{ scenarioResult.best_option.toUpperCase() }}</strong>
                <p class="explanation-original-label">日文解析</p>
                <p>{{ scenarioResult.feedback }}</p>
                <div class="explanation-chinese">
                  <strong>中文解析</strong>
                  <p v-if="scenarioExplanationTranslating[currentScenario.id]">正在翻译中文解析…</p>
                  <p v-else-if="scenarioExplanationTranslations[currentScenario.id]?.source_text === scenarioResult.feedback.trim()">{{ scenarioExplanationTranslations[currentScenario.id].translation_zh }}</p>
                  <div v-else>
                    <p v-if="scenarioExplanationTranslationErrors[currentScenario.id]">{{ scenarioExplanationTranslationErrors[currentScenario.id] }}</p>
                    <button type="button" class="text-link" @click="translateScenarioExplanation(currentScenario.id, scenarioResult.feedback)">{{ scenarioExplanationTranslationErrors[currentScenario.id] ? '重试中文翻译' : '翻译为中文' }}</button>
                  </div>
                </div>
              </div>
              <p v-if="scenariosError" class="practice-error">{{ scenariosError }}</p>
              <div class="practice-start-actions">
                <button v-if="!scenarioResult" class="primary-button" :disabled="!selectedScenarioOption || scenarioSubmitting" @click="submitScenario">{{ scenarioSubmitting ? '正在提交…' : '提交判断并查看复盘' }} <ArrowRight :size="16" /></button>
                <button v-else class="primary-button" @click="nextScenario">下一个情境 <ArrowRight :size="16" /></button>
                <button class="text-link" @click="loadScenarios">重新载入情境</button>
              </div>
            </article>
          </section>
        </template>

        <template v-else-if="activeModule === 'language'">
          <section class="language-banner" :class="studyLanguage === 'ja' ? 'japanese' : 'english'">
            <div><span class="banner-tag">{{ studyLanguage === 'ja' ? '日语学习' : '英语学习' }}</span>
              <h2>{{ studyLanguage === 'ja' ? '练习实用日语' : '练习实用英语' }}</h2>
              <p>日常与职场表达 · 例句 · 发音</p>
            </div>
            <div class="banner-decoration"><Languages :size="64" stroke-width="1.1" /></div>
          </section>
          <section class="section-block language-study-section">
            <div class="language-choice" role="group" aria-label="选择学习语言">
              <button :class="{ chosen: studyLanguage === 'ja' }" @click="studyLanguage = 'ja'"><span>日本語</span><small>日语学习</small></button>
              <button :class="{ chosen: studyLanguage === 'en' }" @click="studyLanguage = 'en'"><span>English</span><small>英语学习</small></button>
            </div>
            <div class="language-progress panel">
              <div><strong>学习进度</strong><p>已标记掌握 {{ languageProgress.done }} / {{ languageProgress.total }} 张卡片</p></div>
              <div class="language-progress-number">{{ languageProgress.percent }}%</div>
              <div class="language-progress-track"><span :style="{ width: languageProgress.percent + '%' }"></span></div>
            </div>
            <section class="language-practice panel" aria-label="主动回忆练习">
              <div class="language-practice-heading">
                <div><span class="banner-tag">主动回忆</span><h3>先回忆，再看答案</h3></div>
                <span class="language-practice-count">待复习 {{ dueLanguageReviewCount }} · {{ visibleLanguageCards.length }} 张</span>
              </div>
              <div v-if="languagePracticeCard" class="language-practice-content">
                <span class="dict-tag">{{ languagePracticeCard.category }}</span>
                <div v-if="languagePracticeRevealed" class="language-practice-revealed-sentence">
                  <div class="sentence-highlight-legend" role="note" aria-label="句子高亮图例"><span class="sentence-legend-vocabulary"><i aria-hidden="true"></i>单词 / 短语</span><span class="sentence-legend-grammar"><i aria-hidden="true"></i>语法结构</span></div>
                  <h4 class="language-sentence"><span v-for="(part, index) in sentenceParts(languagePracticeCard)" :key="index" :class="part.type ? 'sentence-highlight-' + part.type : ''" :title="part.detail">{{ part.text }}</span></h4>

                  <p v-if="languagePracticeCard.reading" class="language-reading">{{ languagePracticeCard.reading }}</p>
                  <div class="language-speech-actions"><button type="button" class="play-button" @click="speakLanguageCard(languagePracticeCard, false, true)"><Volume2 :size="16" /> 播放原文</button><button v-if="languagePracticeCard.example" type="button" class="play-button" @click="speakLanguageCard(languagePracticeCard, true, true)"><Volume2 :size="16" /> 播放例句</button></div>
                  <div v-if="speechStatus && speechStatusTarget.startsWith('language-practice:' + languagePracticeCard.id + ':')" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                </div>
                <div v-if="languagePracticeRevealed" class="language-practice-answer">
                  <strong>{{ languagePracticeCard.meaning_zh }}</strong>
                  <p>{{ languagePracticeCard.explanation }}</p>
                  <section v-if="languageExpansions(languagePracticeCard, 'vocabulary').length" class="language-expansion">
                    <strong>词汇解析</strong>
                    <div v-for="(item, index) in languageExpansions(languagePracticeCard, 'vocabulary')" :key="'practice-vocab-' + index">
                      <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                    </div>
                  </section>
                  <section v-if="languageExpansions(languagePracticeCard, 'grammar').length" class="language-expansion grammar">
                    <strong>{{ sentenceParts(languagePracticeCard).some(part => part.type === 'grammar') ? '语法解析' : '语法提示' }}</strong>
                    <div v-for="(item, index) in languageExpansions(languagePracticeCard, 'grammar')" :key="'practice-grammar-' + index">
                      <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                    </div>
                  </section>
                  <a v-if="languagePracticeCard.source_url" class="language-source-link" :href="languagePracticeCard.source_url" target="_blank" rel="noopener noreferrer">查看句子来源 ↗</a>
                </div>
                <div v-else class="language-practice-recall-prompt">
                  <span class="banner-tag">先回忆</span>
                  <strong>{{ languagePracticeCard.meaning_zh || '请先尝试回忆这句话的意思。' }}</strong>
                  
                </div>
                <div v-if="languageReviews.some(item => item.card_id === languagePracticeCard?.id)" class="language-review-meta">
                  <span>复习 {{ languageReviews.find(item => item.card_id === languagePracticeCard?.id)?.review_count || 0 }} 次</span>
                  <span>连续记住 {{ languageReviews.find(item => item.card_id === languagePracticeCard?.id)?.correct_streak || 0 }} 次</span>
                </div>
                <div class="language-practice-actions">
                  <button type="button" class="language-reveal-button" :aria-expanded="languagePracticeRevealed" @click="languagePracticeRevealed = !languagePracticeRevealed"><span>{{ languagePracticeRevealed ? '收起答案' : '显示答案' }}</span><ChevronDown :size="16" :class="{ rotated: languagePracticeRevealed }" aria-hidden="true" /></button>
                  <button class="secondary-button" @click="nextLanguagePractice">跳过 <ArrowRight :size="15" /></button>
                  <button class="language-review-again" :disabled="languageReviewBusy === languagePracticeCard.id" @click="submitLanguageReview('again')">还不熟</button>
                  <button class="language-review-remembered" :disabled="languageReviewBusy === languagePracticeCard.id" @click="submitLanguageReview('remembered')">记住了</button>
                  <button class="language-done-button" :disabled="languageProgressHydrating || !languageProgressReady || languageCardSaving.has(languagePracticeCard.id)" @click="toggleLanguageCard(languagePracticeCard.id)">{{ completedLanguageCards.includes(languagePracticeCard.id) ? '取消掌握' : '标记掌握' }}</button>
                </div>
              </div>
              <p v-else class="language-practice-prompt">当前筛选条件下没有卡片，切换分类或掌握状态后就能开始。</p>
            </section>
            <div class="language-category-filter" role="group" aria-label="按学习类别筛选">
              <button v-for="category in languageCategories" :key="category.title" :class="{ chosen: selectedLanguageCategory === category.title }" @click="selectedLanguageCategory = category.title">{{ category.title }}</button>
            </div>
            <div class="language-mastery-filter" role="group" aria-label="按掌握状态筛选">
              <button :class="{ chosen: selectedLanguageMastery === 'all' }" @click="selectedLanguageMastery = 'all'">全部卡片 {{ languageCards.length }}</button>
              <button :class="{ chosen: selectedLanguageMastery === 'unlearned' }" @click="selectedLanguageMastery = 'unlearned'">未学习 {{ unlearnedLanguageCount }}</button>
              <button :class="{ chosen: selectedLanguageMastery === 'unmastered' }" @click="selectedLanguageMastery = 'unmastered'">学习中 / 待复习 {{ languageCards.filter(card => !completedLanguageCards.includes(card.id) && !isLanguageCardUnlearned(card)).length }}</button>
              <button :class="{ chosen: selectedLanguageMastery === 'mastered' }" @click="selectedLanguageMastery = 'mastered'">已掌握 {{ languageCards.filter(card => completedLanguageCards.includes(card.id)).length }}</button>
            </div>
            <p class="language-source">例句来源：<a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer">Tatoeba</a>，原句可查看来源链接。</p>
            <p v-if="languageProgressHydrating" class="dictionary-status" role="status">正在同步语言进度…</p>
            <p v-else-if="languageSyncError" class="dictionary-status dictionary-error" role="alert">{{ languageSyncError }}</p>
            <p v-if="languageCardsLoading" class="dictionary-status">正在从学习内容库读取课程…</p>
            <p v-else-if="languageCardsError" class="dictionary-status dictionary-error">{{ languageCardsError }} 请稍后刷新再试。</p>
            <div v-else class="language-card-list">
              <article v-for="card in paginatedLanguageCards" :key="card.id" class="language-study-card" :class="{ completed: completedLanguageCards.includes(card.id) }">
                <div class="language-card-top"><span class="dict-tag">{{ card.category }}</span><span class="language-source">{{ completedLanguageCards.includes(card.id) ? '已掌握' : isLanguageCardUnlearned(card) ? '未学习' : '学习中' }}</span><button class="language-done-button" :disabled="languageProgressHydrating || !languageProgressReady || languageCardSaving.has(card.id)" @click="toggleLanguageCard(card.id)">{{ completedLanguageCards.includes(card.id) ? '取消掌握' : '标记已掌握' }}</button></div>
                <div class="sentence-highlight-legend" role="note" aria-label="句子高亮图例"><span class="sentence-legend-vocabulary"><i aria-hidden="true"></i>单词 / 短语</span><span class="sentence-legend-grammar"><i aria-hidden="true"></i>语法结构</span></div>
                <h3 class="language-sentence"><span v-for="(part, index) in sentenceParts(card)" :key="index" :class="part.type ? 'sentence-highlight-' + part.type : ''" :title="part.detail">{{ part.text }}</span></h3>
                <p class="sentence-highlight-hint">黄色标出需要理解的词汇，蓝色标出句中的语法结构；下方会按颜色分别解释每一项。</p>
                <p v-if="card.reading" class="language-reading">{{ card.reading }}</p>
                <p class="language-meaning language-sentence-translation">{{ card.meaning_zh }}</p>
                <p class="language-explanation">{{ card.explanation }}</p>
                <section v-if="languageExpansions(card, 'vocabulary').length" class="language-expansion">
                  <strong>词汇解析</strong>
                  <div v-for="(item, index) in languageExpansions(card, 'vocabulary')" :key="'vocab-' + index">
                    <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                  </div>
                </section>
                <section v-if="languageExpansions(card, 'grammar').length" class="language-expansion grammar">
                  <strong>{{ sentenceParts(card).some(part => part.type === 'grammar') ? '语法解析' : '语法提示' }}</strong>
                  <div v-for="(item, index) in languageExpansions(card, 'grammar')" :key="'grammar-' + index">
                    <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                  </div>
                </section>
                <a v-if="card.source_url" class="language-source-link" :href="card.source_url" target="_blank" rel="noopener noreferrer">查看句子来源 ↗</a>
                <div class="language-speech-actions"><button type="button" class="play-button" @click="speakLanguageCard(card)"><Volume2 :size="17" /> 播放原文</button><button v-if="card.example" type="button" class="play-button" @click="speakLanguageCard(card, true)"><Volume2 :size="17" /> 播放例句</button></div>
                <div v-if="speechStatus && speechStatusTarget.startsWith('language-card:' + card.id + ':')" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                <small class="language-source">{{ card.source_type === 'licensed' ? '开放词库数据' : '平台自编学习内容' }}</small>
              </article>
              <div v-if="visibleLanguageCards.length > languagePageSize" class="language-pagination">
                <span>第 {{ languagePage }} / {{ languagePageCount }} 页 · 共 {{ visibleLanguageCards.length }} 张卡片</span>
                <button class="secondary-button" :disabled="languagePage <= 1" @click="languagePage = Math.max(1, languagePage - 1)">上一页</button>
                <button class="secondary-button" :disabled="languagePage >= languagePageCount" @click="languagePage = Math.min(languagePageCount, languagePage + 1)">下一页</button>
              </div>
              <div v-if="!languageCardsLoading && !languageCardsError && visibleLanguageCards.length === 0" class="empty-state"><BookOpen :size="25" /><strong>{{ selectedLanguageMastery === 'mastered' ? '还没有已掌握的卡片' : selectedLanguageMastery === 'unlearned' ? '这组卡片已经全部开始学习啦' : selectedLanguageMastery === 'unmastered' ? '没有正在学习或待复习的卡片' : '这个分类暂时没有已发布的课程' }}</strong><p>请切换分类或学习状态。</p></div>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="section-block dictionary-view-switch" aria-label="词典页面切换">
            <div class="dictionary-view-tabs" role="tablist" aria-label="词典和生词本">
              <button role="tab" :aria-selected="dictionaryView === 'search'" :class="{ chosen: dictionaryView === 'search' }" @click="dictionaryView = 'search'"><Search :size="16" /> 查词</button>
              <button role="tab" class="saved-book-tab" :aria-selected="dictionaryView === 'saved'" :class="{ chosen: dictionaryView === 'saved' }" @click="dictionaryView = 'saved'"><BookMarked :size="17" /> <span>生词本</span><span class="saved-tab-count">{{ savedWords.length }}</span></button>
            </div>
          </section>
          <template v-if="dictionaryView === 'search'">
          <section class="dictionary-search">
            <div class="dictionary-language-picker" role="group" aria-label="选择查询语言">
              <span>查询语言</span>
              <button type="button" :class="{ chosen: dictSourceLang === 'auto' }" @click="setDictionaryLanguage('auto')">自动识别</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'en' }" @click="setDictionaryLanguage('en')">英语</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'ja' }" @click="setDictionaryLanguage('ja')">日语</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'zh' }" @click="setDictionaryLanguage('zh')">中文</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'it' }" @click="setDictionaryLanguage('it')">IT 术语（离线）</button>
            </div>
            <div class="search-box">
              <Search :size="19" />
              <input v-model="searchText" :placeholder="searchPlaceholder" @keyup.enter="lookupDictionary" />
              <button v-if="searchText" class="clear-search" @click="clearDictionarySearch">清空</button>
              <button class="dictionary-search-button" :disabled="dictionaryLoading" @click="lookupDictionary">{{ dictionaryLoading ? '查找中…' : '查词' }}</button>
            </div>

            <p v-if="lastSearchedTerm && dictionaryDetectedLanguage && dictSourceLang === 'auto' && !dictionaryLoading" class="dictionary-status" role="status">识别为 {{ dictionaryDetectedLanguage === 'zh' ? '中文' : dictionaryDetectedLanguage === 'ja' ? '日语' : dictionaryDetectedLanguage === 'en' ? '英语' : 'IT 术语' }} · 可手动切换</p>
            <p v-if="dictionaryLoading" class="dictionary-status">正在查词…</p>
            <p v-else-if="dictionaryError" class="dictionary-status dictionary-error">{{ dictionaryError }} <button type="button" class="text-link" @click="lookupDictionary">重试</button></p>
            <div v-if="!searchText.trim() && !dictionaryLoading" class="dictionary-quick-start" aria-label="快捷查词示例">
              <span>试试</span>
              <button type="button" @click="quickDictionarySearch('你好', 'zh')">你好</button>
              <button type="button" @click="quickDictionarySearch('hello', 'en')">hello</button>
              <button type="button" @click="quickDictionarySearch('こんにちは', 'ja')">こんにちは</button>
              <button type="button" @click="quickDictionarySearch('API', 'it')">API</button>
            </div>
          </section>
          <section class="section-block">
            <div class="section-heading"><div><h2>查询结果</h2></div></div>
            <div class="dictionary-list">
              <article v-for="entry in displayedEntries" :key="entry.term + (entry.tag || '') + (entry.en || '')" class="dictionary-card">
                <div class="dict-main">
                  <div class="dict-term-row"><h3>{{ entry.language === 'en' && entry.englishTerm ? entry.englishTerm : entry.term }}</h3><span v-if="entry.japaneseTerm && entry.japaneseTerm !== entry.term" class="reading">日语术语：{{ entry.japaneseTerm }}</span><span v-else-if="entry.language === 'en' && entry.englishTerm && entry.englishTerm.toLowerCase() !== entry.term.toLowerCase()" class="reading">日语术语：{{ entry.term }}</span><span v-if="entry.reading" class="reading">{{ entry.language === 'en' ? '日语辅助读音（近似）' : '日语读音' }}：{{ entry.reading }}</span><span v-if="entry.phonetic" class="reading">IPA：{{ entry.phonetic }}</span><span class="dict-tag">{{ entry.tag }}</span><span v-if="entry.source" class="dict-source">{{ entry.source }}</span></div>
                  <div v-if="entry.englishTerm && entry.englishTerm.toLowerCase() !== entry.term.toLowerCase()" class="dict-en">英语对应词：{{ entry.englishTerm }}</div>
                  <div v-if="entry.en && entry.en !== entry.englishTerm" class="dict-en">{{ entry.language === 'en' ? '英语释义' : '英文释义' }}：{{ entry.en }}</div>
                  <p v-if="entry.translationJa" class="dictionary-translation-ja">{{ entry.language === 'ja' ? '日语释义' : '日语翻译／释义' }}：{{ entry.translationJa }}</p>
                  <p v-if="entry.zh" class="dictionary-translation-ja">{{ entry.language === 'zh' ? '中文原文' : '中文翻译／释义' }}：{{ entry.zh }}</p>
                  <p v-if="entry.example" class="dict-example">例句：{{ entry.example }}</p>
                  <p v-if="entry.technical" class="dictionary-tech-note">离线 IT 词库</p>
                  <div class="dictionary-ai-section">
                    <div v-if="!dictionaryAiAnswers[dictionaryAiKey(entry)]" class="dictionary-ai-action-row">
                      <button type="button" class="secondary-button dictionary-ai-button"
                        :disabled="dictionaryAiBusy"
                        @click="supplementDictionaryWithAi(entry)">
                        {{ dictionaryAiBusy && dictionaryAiActiveKey === dictionaryAiKey(entry) ? 'AI 解释中…'
                          : (!entry.zh || (!entry.en && !entry.englishTerm) || !entry.translationJa) ? 'AI 补充释义' : 'AI 语境解析' }}
                      </button>
                      <small>{{ dictionaryAiRemaining === null ? '每日最多 20 次' : 'AI 剩余 ' + dictionaryAiRemaining + ' 次' }}</small>
                    </div>
                    <div v-if="dictionaryAiAnswers[dictionaryAiKey(entry)]" class="dictionary-ai-result">
                      <strong>AI 辅助解析</strong>
                      <p>{{ dictionaryAiAnswers[dictionaryAiKey(entry)] }}</p>
                      <small>AI 仅供参考，请以词典为准。</small>
                    </div>
                    <p v-if="dictionaryAiErrors[dictionaryAiKey(entry)]" class="dictionary-status dictionary-error" role="alert">{{ dictionaryAiErrors[dictionaryAiKey(entry)] }}</p>
                  </div>
                  <div v-if="speechStatus && speechStatusTarget === entry.term" class="dictionary-speech-controls"><p class="dictionary-status" role="status" aria-live="polite">{{ speechStatus }}</p><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                </div>
                <div class="dict-actions"><button class="round-action pronunciation-button" @click="speakDictionaryEnglish(entry)" :aria-label="'播放英语发音：' + (entry.englishTerm || entry.term)" title="播放英语发音"><Volume2 :size="14" /><span>EN</span></button><button class="round-action pronunciation-button" @click="speakDictionaryJapanese(entry)" :aria-label="'播放日语辅助读音：' + (entry.englishTerm || entry.term)" title="播放日语辅助读音"><Languages :size="14" /><span>日</span></button><button class="round-action pronunciation-button" @click="speakDictionaryChinese(entry)" :aria-label="'播放中文发音：' + entry.term" title="播放中文发音"><Volume2 :size="14" /><span>中</span></button><button class="round-action" :class="{ saved: savedWords.includes(entry.term) }" :disabled="vocabularyHydrating || !vocabularySyncReady" @click="toggleSaved(entry.term)" :aria-label="(savedWords.includes(entry.term) ? '取消收藏' : '收藏') + entry.term"><Bookmark :size="17" /></button></div>
              </article>
              <div v-if="lastSearchedTerm.trim().toLowerCase() === searchText.trim().toLowerCase() && displayedEntries.length === 0 && !dictionaryLoading" class="empty-state"><Search :size="25" /><strong>没有找到匹配词条</strong><p>换个关键词或语言试试；IT 模式仅查离线词库。</p></div>
              <div v-if="searchText.trim() && !dictionaryLoading && (dictionaryError || (lastSearchedTerm && displayedEntries.length === 0))" class="dictionary-ai-section dictionary-ai-fallback">
                <button v-if="!dictionaryAiAnswers[dictionaryAiKey(null)]" type="button" class="secondary-button dictionary-ai-button"
                  :disabled="dictionaryAiBusy" @click="supplementDictionaryWithAi(null)">
                  {{ dictionaryAiBusy && dictionaryAiActiveKey === dictionaryAiKey(null) ? 'AI 解释中…' : 'AI 辅助解释' }}
                </button>
                <small>{{ dictionaryAiRemaining === null ? '每日最多 20 次' : 'AI 剩余 ' + dictionaryAiRemaining + ' 次' }}</small>
                <div v-if="dictionaryAiAnswers[dictionaryAiKey(null)]" class="dictionary-ai-result">
                  <strong>AI 辅助解析</strong><p>{{ dictionaryAiAnswers[dictionaryAiKey(null)] }}</p>
                  <small>AI 仅供参考，并非权威词典释义。</small>
                </div>
                <p v-if="dictionaryAiErrors[dictionaryAiKey(null)]" class="dictionary-status dictionary-error" role="alert">{{ dictionaryAiErrors[dictionaryAiKey(null)] }}</p>
              </div>
            </div>
          </section>
          </template>
          <section v-if="dictionaryView === 'saved'" class="section-block saved-vocabulary-block">
            <div class="section-heading vocabulary-heading"><div><h2>生词本</h2></div><span class="vocabulary-total">{{ savedVocabularyEntries.length }} 词</span></div>
            <div v-if="vocabularyStatus" class="vocabulary-inline-notice" role="status"><BookMarked :size="16" aria-hidden="true" /><span>{{ vocabularyStatus }}</span></div>
            <div v-if="savedVocabularyEntries.length" class="saved-vocabulary-list">
              <article v-for="entry in savedVocabularyEntries" :key="entry.term" class="saved-vocabulary-row">
                <header class="saved-vocabulary-header">
                  <div class="saved-vocabulary-title"><h3>{{ entry.term }}</h3><span v-if="entry.tag && entry.tag !== '生词本'" class="saved-vocabulary-tag">{{ entry.tag }}</span></div>
                  <p v-if="entry.reading || entry.phonetic" class="saved-vocabulary-reading">{{ entry.reading || entry.phonetic }}</p>
                </header>
                <div class="saved-vocabulary-definitions">
                  <div v-if="entry.en" class="saved-vocabulary-definition"><span class="saved-vocabulary-lang" lang="en">EN</span><p>{{ entry.en }}</p></div>
                  <div v-if="entry.translationJa" class="saved-vocabulary-definition"><span class="saved-vocabulary-lang" lang="ja">日</span><p>{{ entry.translationJa }}</p></div>
                  <div v-if="entry.zh" class="saved-vocabulary-definition"><span class="saved-vocabulary-lang" lang="zh">中</span><p>{{ entry.zh }}</p></div>
                  <p v-if="!entry.en && !entry.translationJa && !entry.zh" class="saved-vocabulary-missing">暂无完整释义，可重新查词补充。</p>
                </div>
                <p v-if="vocabularyPending.has(entry.term)" class="saved-vocabulary-sync-state">{{ vocabularyPending.get(entry.term) === 'deleted' ? '其他设备已取消收藏' : '仅保存在本机' }}</p>
                <div v-if="speechStatus && speechStatusTarget === entry.term" class="saved-vocabulary-speech-status" role="status" aria-live="polite">
                  <span>{{ speechStatus }}</span>
                  <button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续' : '暂停' }}</button>
                  <button v-if="speechPlaying || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button>
                </div>
                <footer class="saved-vocabulary-footer">
                  <div class="saved-vocabulary-pronunciations" role="group" :aria-label="'播放词条发音：' + entry.term">
                    <button type="button" class="vocabulary-speak-button" @click="speakDictionaryEnglish(entry)" :aria-label="'播放英语发音：' + entry.term"><Volume2 :size="15" /> EN</button>
                    <button type="button" class="vocabulary-speak-button" @click="speakDictionaryJapanese(entry)" :aria-label="'播放日语发音：' + entry.term"><Volume2 :size="15" /> 日</button>
                    <button type="button" class="vocabulary-speak-button" @click="speakDictionaryChinese(entry)" :aria-label="'播放中文发音：' + entry.term"><Volume2 :size="15" /> 中</button>
                  </div>
                  <div class="saved-vocabulary-manage">
                    <button v-if="vocabularyPending.has(entry.term)" type="button" class="saved-sync-button" :disabled="vocabularyHydrating || !vocabularySyncReady" @click="restoreVocabulary(entry.term)">同步</button>
                    <button type="button" class="saved-remove-button" :disabled="vocabularyHydrating || !vocabularySyncReady" @click="toggleSaved(entry.term)"><Bookmark :size="14" />{{ vocabularyPending.has(entry.term) ? '移除本机副本' : '取消收藏' }}</button>
                  </div>
                </footer>
              </article>
            </div>
            <div v-else class="empty-state"><BookMarked :size="25" /><strong>还没有收藏词条</strong><p>查询后点击结果卡片旁的书签按钮，即可保存并在这里复习。</p></div>
          </section>
        </template>

        <footer class="footer"><span>知学</span></footer>
      </div>
    </main>
  </div>
</template>
