<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  BookOpen, Languages, Search, GraduationCap,
  ChevronRight, Sparkles, Clock3, Flame, Bookmark, Volume2, ArrowRight,
  ShieldCheck, BookMarked, Menu, X, CheckCircle2, Target, TrendingUp, ListChecks, PlusCircle,
} from 'lucide-vue-next'

type ModuleId = 'home' | 'exam' | 'practical' | 'language' | 'dictionary'
const activeModule = ref<ModuleId>('home')
const searchText = ref('')
const dictSourceLang = ref<'auto' | 'ja' | 'en' | 'it'>('auto')
const dictionaryView = ref<'search' | 'saved'>('search')
const studyLanguage = ref<'ja' | 'en'>(readStored('zhixue:study-language', 'ja'))
const selectedLanguageCategory = ref('全部')
const completedLanguageCards = ref<string[]>(readStored('zhixue:completed-language-cards', []))
const showMobileMenu = ref(false)
const savedWords = ref<string[]>(readStored('zhixue:saved-words', []))

type StudyTask = { id: string; title: string; detail: string; minutes: number; done: boolean }
type ExamRecord = { id?: string; date: string; correct: number; total: number; exam: string }
const todayKey = new Date().toLocaleDateString('sv-SE')
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
const tasks = ref<StudyTask[]>(readStored('zhixue:tasks:' + todayKey, defaultTasks))
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
async function saveDailyTask(task: StudyTask) {
  try {
    const response = await fetch('/api/daily-tasks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, study_date: todayKey, completed: task.done }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      cloudDashboardError.value = data.error || '每日任务云端保存失败'
    } else {
      void loadCloudDashboard()
    }
  } catch { cloudDashboardError.value = '网络异常：每日任务暂未同步到云端。' }
}
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
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('sv-SE')
    const records = examRecords.value.filter(record => record.date === key)
    const total = records.reduce((sum, record) => sum + record.total, 0)
    const correct = records.reduce((sum, record) => sum + record.correct, 0)
    days.push({ date: key, label: (d.getMonth() + 1) + '/' + d.getDate(), accuracy: total ? Math.round(correct / total * 100) : null, count: total })
  }
  return days
})
watch(tasks, value => localStorage.setItem('zhixue:tasks:' + todayKey, JSON.stringify(value)), { deep: true })
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
      examRecords.value = data.items || []
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
  void saveExamRecord({ date: todayKey, correct, total, exam: exam.trim().toUpperCase() })
}
async function removeExamRecords() {
  if (!window.confirm('确定清除全部历史考试成绩吗？云端和本设备记录都会删除，且无法恢复。')) return
  try {
    const response = await fetch('/api/exam-history', { method: 'DELETE' })
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
type PracticeQuestion = {
  id: string; track_id: string; topic: string; difficulty: string; prompt: string;
  options: PracticeOption[]; answer: string; explanation: string; source_type: string; source_reference?: string; language: string; exam_section?: 'A' | 'B' | null; exam_section_method?: 'explicit' | 'case_pattern' | 'default_a' | 'unclassified' | null
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
type ExamTrack = { id: string; kind: string; title: string; subtitle: string; question_count: number; official_question_count?: number; prediction_question_count?: number }
const examTracks = ref<ExamTrack[]>([])
const selectedTrackId = ref('exam-sg')
const tracksLoading = ref(false)
const tracksError = ref('')
const questionSourceFilter = ref<'official' | 'generated'>('generated')
const activeReviewMode = ref<'all' | 'unlearned' | 'mastered' | 'due' | 'wrong'>('all')
const questionSourceFilters = [
  { id: 'official', label: '历年真题' },
  { id: 'generated', label: '预测题库' },
] as const
const selectedTrack = computed(() => examTracks.value.find(track => track.id === selectedTrackId.value) || null)
const quizStartedAt = ref(0)
const quizFinished = ref(false)
const currentQuestion = computed(() => quizQuestions.value[quizIndex.value] || null)
const isLastQuestion = computed(() => quizIndex.value >= quizQuestions.value.length - 1)

// 限时模拟考试：独立于逐题练习，交卷前不展示答案和解析。
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
let mockTimer: ReturnType<typeof setInterval> | undefined
const mockRemainingSeconds = computed(() => mockStarted.value && !mockSubmitted.value
  ? Math.max(0, Math.ceil((mockDeadline.value - mockNow.value) / 1000))
  : 0)
const mockCorrectCount = computed(() => mockQuestions.value.filter(question => mockAnswers.value[question.id] === question.answer).length)
const mockAnsweredCount = computed(() => Object.values(mockAnswers.value).filter(Boolean).length)
const mockAccuracy = computed(() => mockQuestions.value.length ? Math.round(mockCorrectCount.value / mockQuestions.value.length * 100) : 0)
const mockScore = computed(() => mockCorrectCount.value * 2)
function formatMockTime(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
async function startMockExam() {
  if (!selectedTrack.value || selectedTrack.value.question_count < 60) {
    mockError.value = '正式模拟考试固定为 60 题。当前可用题量不足 60 道，请先完成题库导入后再开始。'
    return
  }
  mockLoading.value = true
  mockError.value = ''
  try {
    const response = await fetch('/api/mock-exam-questions?track=' + encodeURIComponent(selectedTrack.value.id))
    const data = await response.json() as { items?: PracticeQuestion[]; error?: string; section_counts?: { A: number; B: number } }
    if (!response.ok) throw new Error(data.error || '模拟考试题目加载失败')
    if (!data.items || data.items.length !== 60 || data.section_counts?.A !== 48 || data.section_counts?.B !== 12) {
      throw new Error('组卷结果未达到科目 A 48 题、科目 B 12 题的真实分布。请先完善带有明确科目/案例标记的题目，系统不会用普通题目冒充科目 B。')
    }
    mockQuestions.value = data.items
    mockAnswers.value = {}
    mockDurationMinutes.value = 120
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
async function finishMockExam(autoSubmit = false) {
  if (!mockStarted.value || mockSubmitted.value) return
  mockSubmitted.value = true
  mockStarted.value = false
  if (mockTimer) { clearInterval(mockTimer); mockTimer = undefined }
  const total = mockQuestions.value.length
  const correct = mockCorrectCount.value
  void saveExamRecord({ date: todayKey, correct, total, exam: (selectedTrack.value?.title || selectedTrackId.value) + ' 模拟考试（' + (correct * 2) + '/120分）' })
  const unanswered = total - mockAnsweredCount.value
  if (autoSubmit) mockError.value = '时间到，系统已自动交卷。未作答题目按答错计。'
  else mockError.value = unanswered ? '已交卷。未作答的 ' + unanswered + ' 题按答错计。' : ''
  const attempts = mockQuestions.value
  const results = await Promise.allSettled(attempts.map(question => fetch('/api/attempts', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question_id: question.id, answer: mockAnswers.value[question.id] || '', duration_seconds: Math.max(0, Math.floor((Date.now() - mockStartedAt.value) / 1000)) }),
  })))
  if (results.some(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok))) {
    mockError.value = (mockError.value ? mockError.value + ' ' : '') + '部分答题记录未能同步到云端。'
  }
  void loadCloudDashboard()
}
onUnmounted(() => { if (mockTimer) clearInterval(mockTimer) })

type ScenarioOption = { id: string; text: string }
type PracticalScenario = {
  id: string; track_id: string; title: string; category: string; difficulty: string;
  situation: string; task: string; options: ScenarioOption[]; explanation?: string; source_type: string
}
type ScenarioExplanationTranslation = { source_text: string; translation_zh: string }
const scenarios = ref<PracticalScenario[]>([])
const scenariosLoading = ref(false)
const scenariosError = ref('')
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
const currentScenario = computed(() => scenarios.value.find(item => item.id === selectedScenarioId.value) || scenarios.value[0] || null)
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

async function loadScenarios() {
  if (!selectedTrack.value) { scenarios.value = []; return }
  scenariosLoading.value = true
  scenariosError.value = ''
  scenarioResult.value = null
  selectedScenarioOption.value = ''
  try {
    const response = await fetch('/api/scenarios?track=' + encodeURIComponent(selectedTrack.value.id))
    const data = await response.json() as { items?: PracticalScenario[]; error?: string }
    if (!response.ok) throw new Error(data.error || '实战任务加载失败')
    scenarios.value = data.items || []
    selectedScenarioId.value = scenarios.value[0]?.id || ''
  } catch (error) {
    scenariosError.value = error instanceof Error ? error.message : '实战任务加载失败，请稍后重试。'
    scenarios.value = []
  } finally {
    scenariosLoading.value = false
  }
}
function nextScenario() {
  stopSpeech()
  if (!scenarios.value.length) return
  const index = scenarios.value.findIndex(item => item.id === currentScenario.value?.id)
  const next = scenarios.value[(index + 1) % scenarios.value.length]
  selectedScenarioId.value = next.id
  selectedScenarioOption.value = ''
  scenarioResult.value = null
  scenariosError.value = ''
}

async function submitScenario() {
  if (!currentScenario.value || !selectedScenarioOption.value || scenarioSubmitting.value || scenarioResult.value) return
  scenarioSubmitting.value = true
  scenariosError.value = ''
  try {
    const response = await fetch('/api/scenario-attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scenario_id: currentScenario.value.id,
        selected_option: selectedScenarioOption.value,
        duration_seconds: 0,
      }),
    })
    const data = await response.json() as { score?: number; best_option?: string; correct?: boolean; feedback?: string; error?: string }
    if (!response.ok) throw new Error(data.error || '实战结果保存失败')
    const feedback = String(data.feedback || '')
    scenarioResult.value = {
      score: Number(data.score || 0),
      best_option: String(data.best_option || ''),
      correct: Boolean(data.correct),
      feedback,
    }
    void translateScenarioExplanation(currentScenario.value.id, feedback)
    void loadCloudDashboard()
  } catch (error) {
    scenariosError.value = error instanceof Error ? error.message : '实战结果保存失败，请稍后重试。'
  } finally {
    scenarioSubmitting.value = false
  }
}
watch([selectedTrackId, examTracks, activeModule], () => {
  if (activeModule.value === 'practical') void loadScenarios()
})
async function loadExamTracks() {
  tracksLoading.value = true
  tracksError.value = ''
  try {
    const response = await fetch('/api/tracks')
    const data = await response.json() as { items?: ExamTrack[]; error?: string }
    if (!response.ok) throw new Error(data.error || '考试列表加载失败')
    examTracks.value = (data.items || []).filter(track => track.kind === 'exam')
    if (!examTracks.value.some(track => track.id === selectedTrackId.value)) selectedTrackId.value = examTracks.value[0]?.id || ''
  } catch (error) {
    tracksError.value = error instanceof Error ? error.message : '考试列表加载失败，请稍后重试。'
  } finally {
    tracksLoading.value = false
  }
}
function selectExam(track: ExamTrack) {
  stopSpeech()
  questionBatchOffset.value = 0
  questionBankTotal.value = 0
  questionBankHasMore.value = false
  selectedTrackId.value = track.id
  quizQuestions.value = []
  quizIndex.value = 0
  selectedOption.value = ''
  quizSubmitted.value = false
  quizCorrect.value = 0
  quizFinished.value = false
  quizError.value = ''
}

async function selectQuestionSource(source: 'official' | 'generated') {
  stopSpeech()
  questionSourceFilter.value = source
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
async function loadQuestionProgress() {
  if (!selectedTrack.value) return
  try {
    const response = await fetch('/api/question-progress?track=' + encodeURIComponent(selectedTrack.value.id))
    if (!response.ok) return
    const data = await response.json() as { items?: QuestionReviewProgress[] }
    questionProgressById.value = Object.fromEntries((data.items || []).map(item => [item.question_id, item]))
  } catch { /* Keep the last known progress visible if the network is temporarily unavailable. */ }
}
function selectReviewMode(mode: 'all' | 'unlearned' | 'wrong' | 'due' | 'mastered') {
  stopSpeech()
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
  stopSpeech()
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
      response = await fetch('/api/questions?track=' + encodeURIComponent(selectedTrack.value.id) + '&source=' + encodeURIComponent(questionSourceFilter.value) + '&mode=ordered&limit=' + questionBatchSize + '&offset=' + questionBatchOffset.value)
      data = await response.json() as typeof data
    } else {
      const mode = activeReviewMode.value
      const reviewBatchLimit = mode === 'unlearned' ? questionBatchSize : 50
      // 未学习题会在答题后离开此筛选集，因此每组始终从剩余未学习题的开头取，避免 offset 导致跳题。
      response = await fetch('/api/wrong-questions?track=' + encodeURIComponent(selectedTrack.value.id) + '&limit=' + reviewBatchLimit + '&offset=0&mode=' + mode + '&source=' + encodeURIComponent(questionSourceFilter.value))
      data = await response.json() as typeof data
      if (mode !== 'unlearned') {
        data.total = data.items?.length || 0
        data.has_more = false
      }
    }
    if (!response.ok) throw new Error(data.error || '题库加载失败')
    if (!data.items?.length) {
      const messages = {
        all: questionSourceFilter.value === 'official' ? '当前没有可作答的历年真题。' : '当前没有可用的预测题，请稍后重试。',
        unlearned: '当前题库中没有尚未作答的题目。',
        wrong: '当前筛选下没有错题。答错题目后会自动进入错题集。',
        due: '当前没有到期的复习题。答错题会先安排短间隔复习。',
        mastered: '当前没有已掌握的题目。连续答对三次或手动标记掌握后会显示在这里。',
      }
      throw new Error(messages[activeReviewMode.value])
    }
    quizQuestions.value = data.items
    if (activeReviewMode.value !== 'unlearned' || questionBatchOffset.value === 0) {
      questionBankTotal.value = data.total || data.items.length
    }
    questionBankHasMore.value = Boolean(data.has_more)
    quizIndex.value = 0
    selectedOption.value = ''
    quizSubmitted.value = false
    quizCorrect.value = 0
    quizFinished.value = false
    quizStartedAt.value = Date.now()
    await loadQuestionProgress()
  } catch (error) {
    quizError.value = error instanceof Error ? error.message : '题库加载失败，请稍后重试。'
  } finally {
    quizLoading.value = false
  }
}
async function nextQuestionBatch() {
  if (questionBankHasMore.value) questionBatchOffset.value += questionBatchSize
  else questionBatchOffset.value = 0
  quizError.value = ''
  await startPractice()
}
async function submitPracticeAnswer() {
  if (!currentQuestion.value || !selectedOption.value || quizSubmitted.value) return
  const question = currentQuestion.value
  quizSubmitted.value = true
  if (selectedOption.value === question.answer) quizCorrect.value += 1
  void translateQuestionExplanation(question)
  try {
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question_id: currentQuestion.value.id,
        answer: selectedOption.value,
        duration_seconds: quizStartedAt.value ? Math.floor((Date.now() - quizStartedAt.value) / 1000) : 0,
      }),
    })
    const data = await response.json() as { error?: string; progress?: QuestionReviewProgress }
    if (!response.ok) throw new Error(data.error || '本次答题已显示，但保存到学习记录失败。')
    if (data.progress) questionProgressById.value[currentQuestion.value.id] = data.progress
    void loadCloudDashboard()
  } catch (error) {
    quizError.value = error instanceof Error ? error.message : '网络异常：本次答题结果尚未保存到云端。'
  }
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
  if (!isLastQuestion.value) {
    quizIndex.value += 1
    selectedOption.value = ''
    quizSubmitted.value = false
    return
  }
  void saveExamRecord({ date: todayKey, correct: quizCorrect.value, total: quizQuestions.value.length, exam: selectedTrack.value?.title || selectedTrackId.value })
  quizFinished.value = true
}

const moduleInfo = {
  home: { title: '今天，学一点新的。', subtitle: '把考试、语言和专业知识，放进一个顺手的学习空间。' },
  exam: { title: '考试备考', subtitle: '日常刷题、复习错题与限时模拟考试。' },
  practical: { title: '实战训练', subtitle: '在工作情境中判断风险、选择行动，并查看评分与解释。' },
  language: { title: '语言学习', subtitle: '选择日语或英语，按实际学习内容练习表达、理解和发音。' },
  dictionary: { title: '英日发音与 IT 术语', subtitle: '每个词条分别提供英语原音与日语辅助读音；结合 IPA 音标和假名提示。' },
} as const

const currentInfo = computed(() => moduleInfo[activeModule.value])
const searchPlaceholder = computed(() => activeModule.value === 'dictionary' ? '查词、查缩写，例如 MFA / 認証…' : '搜索考试、课程、知识点…')

const modules = [
  { id: 'exam' as const, title: '考试备考', en: 'EXAM PREP', desc: '日常练习 · 错题复习 · 限时模拟考试', icon: GraduationCap, tone: 'lavender', count: '题量以题库数据为准' },
  { id: 'practical' as const, title: '实战训练', en: 'PRACTICAL LAB', desc: '日语安全情境 · 日语语音 · 中日双语解析', icon: ShieldCheck, tone: 'blue', count: '400 个情境 · 评分 · 复盘' },
  { id: 'language' as const, title: '语言学习', en: 'LANGUAGE', desc: '日语 / 英语 · 例句 · 发音 · 复习', icon: Languages, tone: 'peach', count: '选择语言开始学习' },
  { id: 'dictionary' as const, title: '英日发音与 IT 术语', en: 'DICTIONARY', desc: '英语原音 · 日语辅助读音 · 本地 IT 词库', icon: BookMarked, tone: 'blue', count: '英语词汇与专业术语' },
]

type LanguageHighlight = { start: number; end: number; type: 'vocabulary' | 'grammar'; term: string; meaning: string; explanation: string }
type LanguageExpansion = { term: string; meaning: string; explanation: string }
type LanguageCard = {
  id: string; language: 'ja' | 'en'; category: string; term: string; reading?: string;
  meaning_zh: string; explanation: string; example: string; example_meaning_zh: string;
  example_source_url?: string; source_url?: string; source_type: string; content_type?: string;
  highlight_json?: string; vocabulary_expansion_json?: string; grammar_expansion_json?: string
}
const previewDemoMode = new URLSearchParams(window.location.search).get('demo') === '1'
const previewLanguageFixtures: LanguageCard[] = [
  {
    id: 'demo-ja-daily-001', language: 'ja', category: '日常句子',
    term: 'もう一度説明していただけますか。',
    reading: 'もういちど せつめいしていただけますか。',
    meaning_zh: '可以请您再解释一次吗？',
    explanation: '礼貌地请求对方重复说明，适合日常沟通与不确定时使用。',
    example: 'すみません、もう一度説明していただけますか。',
    example_meaning_zh: '不好意思，可以请您再解释一次吗？',
    source_type: 'preview-demo', content_type: 'sentence',
    highlight_json: JSON.stringify([
      { start: 0, end: 5, type: 'vocabulary', term: 'もう一度', meaning: '再一次', explanation: '用于请求重复动作。' },
      { start: 8, end: 13, type: 'grammar', term: '〜ていただけますか', meaning: '可以请您……吗', explanation: '使用「て形＋いただけますか」委婉请求对方做某事。' },
    ]),
    vocabulary_expansion_json: JSON.stringify([
      { term: 'もう一度', meaning: '再一次', explanation: '用于请对方重复说明、确认或操作。' },
    ]),
    grammar_expansion_json: JSON.stringify([
      { term: '〜ていただけますか', meaning: '可以请您……吗', explanation: '比「〜てください」更委婉，适合对不熟悉的人或职场沟通。' },
    ]),
  },
  {
    id: 'demo-ja-work-001', language: 'ja', category: '职场语言',
    term: '確認してから、改めてご連絡します。',
    reading: 'かくにんしてから、あらためてごれんらくします。',
    meaning_zh: '确认之后，我会再联系您。',
    explanation: '适合暂时不能立即答复，需要核实信息后再回复的职场场景。',
    example: '内容を確認してから、改めてご連絡します。',
    example_meaning_zh: '确认内容后，我会再联系您。',
    source_type: 'preview-demo', content_type: 'sentence',
    highlight_json: JSON.stringify([
      { start: 0, end: 5, type: 'vocabulary', term: '確認して', meaning: '确认后', explanation: '「確認する」是职场常见的核实、确认。' },
      { start: 11, end: 18, type: 'vocabulary', term: 'ご連絡します', meaning: '联系您', explanation: '「連絡する」加「ご」构成礼貌表达。' },
      { start: 0, end: 8, type: 'grammar', term: '〜てから', meaning: '做完……之后', explanation: '表示先完成前项动作，再进行后项动作。' },
    ]),
    vocabulary_expansion_json: JSON.stringify([
      { term: '確認する', meaning: '确认、核实', explanation: '常见表达：内容を確認します。' },
      { term: 'ご連絡します', meaning: '联系您', explanation: '适用于工作邮件、电话及进度沟通。' },
    ]),
    grammar_expansion_json: JSON.stringify([
      { term: '〜てから', meaning: '……之后', explanation: '连接动作的先后顺序，例如「調べてから回答します」。' },
    ]),
  },
  {
    id: 'demo-en-daily-001', language: 'en', category: '日常句子',
    term: 'Could you say that one more time?',
    meaning_zh: '你可以再说一遍吗？',
    explanation: '自然、礼貌地请求对方重复刚才的话。',
    example: 'Sorry, could you say that one more time?',
    example_meaning_zh: '不好意思，你可以再说一遍吗？',
    source_type: 'preview-demo', content_type: 'sentence',
    highlight_json: JSON.stringify([
      { start: 0, end: 8, type: 'vocabulary', term: 'Could you', meaning: '你可以……吗', explanation: '常见的礼貌请求开头。' },
      { start: 9, end: 12, type: 'grammar', term: 'say', meaning: '说', explanation: '情态动词 could 后接动词原形。' },
      { start: 22, end: 34, type: 'vocabulary', term: 'one more time', meaning: '再一次', explanation: '自然表达“再来一次、再说一遍”。' },
    ]),
    vocabulary_expansion_json: JSON.stringify([
      { term: 'Could you…?', meaning: '可以请你……吗？', explanation: '比直接命令更礼貌，适用于日常和工作场景。' },
      { term: 'one more time', meaning: '再一次', explanation: '可用于请求重复动作或内容。' },
    ]),
    grammar_expansion_json: JSON.stringify([
      { term: 'Could + 主语 + 动词原形', meaning: '礼貌请求句型', explanation: 'could 在此表示委婉请求，后接动词原形。' },
    ]),
  },
  {
    id: 'demo-en-work-001', language: 'en', category: '职场语言',
    term: 'I will check the details and get back to you.',
    meaning_zh: '我会确认具体情况后再回复你。',
    explanation: '适合需要先确认信息、之后再答复同事或客户的场景。',
    example: 'Let me check the details and get back to you this afternoon.',
    example_meaning_zh: '我先确认具体情况，今天下午再回复你。',
    source_type: 'preview-demo', content_type: 'sentence',
    highlight_json: JSON.stringify([
      { start: 7, end: 12, type: 'vocabulary', term: 'check', meaning: '确认、核实', explanation: '工作场景中常用于核实信息。' },
      { start: 28, end: 40, type: 'vocabulary', term: 'get back to you', meaning: '再回复你', explanation: '自然的职场表达，表示之后联系或回复。' },
      { start: 0, end: 6, type: 'grammar', term: 'I will', meaning: '我将会', explanation: 'will + 动词原形表示未来动作或承诺。' },
    ]),
    vocabulary_expansion_json: JSON.stringify([
      { term: 'check the details', meaning: '确认具体情况', explanation: '可用于工作任务、订单、计划与资料核对。' },
      { term: 'get back to you', meaning: '之后回复你', explanation: '比正式的「respond」更口语、自然。' },
    ]),
    grammar_expansion_json: JSON.stringify([
      { term: 'will + 动词原形', meaning: '将会做某事', explanation: '常用于承诺、计划或即时决定。' },
    ]),
  },
]
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
const languageReviewByCardId = computed(() => new Map(languageReviews.value.map(review => [review.card_id, review])))
const isLanguageCardUnlearned = (card: LanguageCard) => {
  const review = languageReviewByCardId.value.get(card.id)
  return !completedLanguageCards.value.includes(card.id) && (!review || review.review_count === 0)
}
const unlearnedLanguageCount = computed(() => languageCards.value.filter(isLanguageCardUnlearned).length)
const visibleLanguageCards = computed(() => languageCards.value.filter(card => {
  const matchesCategory = selectedLanguageCategory.value === '全部' || card.category === selectedLanguageCategory.value
  const isMastered = completedLanguageCards.value.includes(card.id)
  const isUnlearned = isLanguageCardUnlearned(card)
  const matchesMastery = selectedLanguageMastery.value === 'all'
    || (selectedLanguageMastery.value === 'unlearned' && isUnlearned)
    || (selectedLanguageMastery.value === 'mastered' && isMastered)
    || (selectedLanguageMastery.value === 'unmastered' && !isMastered && !isUnlearned)
  return matchesCategory && matchesMastery
}).sort((a, b) => {
  const aReview = languageReviews.value.find(item => item.card_id === a.id)
  const bReview = languageReviews.value.find(item => item.card_id === b.id)
  const aDue = !aReview || new Date(aReview.next_review_at).getTime() <= Date.now()
  const bDue = !bReview || new Date(bReview.next_review_at).getTime() <= Date.now()
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
  return Boolean(review && review.review_count > 0 && new Date(review.next_review_at).getTime() <= Date.now())
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
function sentenceParts(card: LanguageCard | null): Array<{ text: string; type: string; detail: string }> {
  if (!card) return []
  let highlights: LanguageHighlight[] = []
  try {
    const parsed = JSON.parse(card.highlight_json || '[]')
    if (Array.isArray(parsed)) highlights = parsed.filter(item => Number.isInteger(item.start) && Number.isInteger(item.end) && item.start >= 0 && item.end > item.start && item.end <= card.term.length)
  } catch { highlights = [] }
  highlights.sort((a, b) => a.start - b.start || (a.type === 'grammar' ? -1 : 1))
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
  const done = ids.filter(id => completedLanguageCards.value.includes(id)).length
  return { done, total: ids.length, percent: ids.length ? Math.round(done / ids.length * 100) : 0 }
})
async function loadLanguageCards() {
  languageCardsLoading.value = true
  languageCardsError.value = ''
  languageCards.value = []
  if (previewDemoMode) {
    languageCards.value = previewLanguageFixtures.filter(card => card.language === studyLanguage.value)
    languageCardsLoading.value = false
    return
  }
  try {
    const response = await fetch('/api/language-cards?lang=' + encodeURIComponent(studyLanguage.value))
    const data = await response.json() as { items?: LanguageCard[]; error?: string }
    if (!response.ok) throw new Error(data.error || '语言学习内容加载失败')
    languageCards.value = data.items || []
  } catch (error) {
    languageCardsError.value = error instanceof Error ? error.message : '语言学习内容加载失败，请稍后再试。'
  } finally {
    languageCardsLoading.value = false
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
    languageCardsError.value = error instanceof Error ? error.message : '复习记录暂时无法保存。请确认已应用最新 D1 迁移。'
  } finally {
    languageReviewBusy.value = ''
  }
}
async function toggleLanguageCard(id: string) {
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
      body: JSON.stringify({ card_id: id, mastered }),
    })
    const data = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(data.error || '掌握进度未能保存到云端。')
    void loadCloudDashboard()
  } catch (error) {
    completedLanguageCards.value = previous
    languageCardsError.value = error instanceof Error
      ? error.message
      : '网络异常：掌握进度未能同步到云端，已恢复原状态。'
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
  await Promise.all([loadCloudDashboard(), loadExamTracks(), loadLanguageCards()])

  // Import this browser's legacy data BEFORE hydrating from D1. This prevents an empty cloud
  // response from erasing progress that existed only in localStorage.
  let progressImportOk = false
  try {
    const localCardIds = new Set(languageCards.value.map(card => card.id))
    const localMastered = completedLanguageCards.value.filter(id => localCardIds.has(id))
    const results = await Promise.all(localMastered.map(card_id => fetch('/api/language-progress', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ card_id, mastered: true }),
    })))
    progressImportOk = results.every(response => response.ok)
  } catch { progressImportOk = false }

  // Migrate today's task state before reading cloud state; upserts are safe to retry.
  let taskImportOk = false
  try {
    const existingResponse = await fetch('/api/daily-tasks?date=' + encodeURIComponent(todayKey))
    if (!existingResponse.ok) throw new Error('Unable to inspect cloud task state')
    const existingData = await existingResponse.json() as { items?: Array<{ task_id: string; completed: number }> }
    const existingIds = new Set((existingData.items || []).map(item => item.task_id))
    // Only import task IDs absent from D1; never overwrite a newer cloud completion with stale local state.
    const legacyTasks = tasks.value.filter(task => !existingIds.has(task.id))
    const results = await Promise.all(legacyTasks.map(task => fetch('/api/daily-tasks', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, study_date: todayKey, completed: task.done }),
    })))
    taskImportOk = results.every(response => response.ok)
  } catch { taskImportOk = false }

  // Import saved dictionary snapshots as well as the legacy term list. A term without a local
  // snapshot remains on-device rather than fabricating a dictionary entry.
  let vocabularyImportOk = true
  for (const term of savedWords.value) {
    const entry = savedDictionaryEntries.value.find(item => item.term === term)
      || recentDictionaryEntries.value.find(item => item.term === term)
    if (!entry) continue
    try {
      const response = await fetch('/api/vocabulary/saved', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ term, language: entry.language || 'auto', entry }),
      })
      if (!response.ok) vocabularyImportOk = false    } catch { vocabularyImportOk = false }
  }

  try {
    const [progressResponse, savedResponse, taskResponse, reviewResponse] = await Promise.all([
      fetch('/api/language-progress'), fetch('/api/vocabulary/saved'), fetch('/api/dashboard'), fetch('/api/language-review'),
    ])
    if (reviewResponse.ok) {
      const reviews = await reviewResponse.json() as { items?: LanguageReview[] }
      // Merge instead of replacing: old local review history has not been fully imported yet.
      const cloudReviews = reviews.items || []
      languageReviews.value = [...cloudReviews, ...languageReviews.value.filter(local =>
        !cloudReviews.some(cloud => cloud.card_id === local.card_id))]
    }
    if (progressResponse.ok && progressImportOk) {
      const progress = await progressResponse.json() as { items?: Array<{ card_id: string; mastered: number }> }
      const cloudIds = (progress.items || []).filter(item => item.mastered).map(item => item.card_id)
      completedLanguageCards.value = [...new Set([...cloudIds, ...completedLanguageCards.value])]
    } else if (!progressImportOk) {
      languageCardsError.value = '部分旧版语言进度尚未同步；本设备中的进度已保留。'
    }
    if (savedResponse.ok) {
      const saved = await savedResponse.json() as { items?: Array<{ term: string; language: string; entry: DictionaryEntry }> }
      for (const item of saved.items || []) {
        if (!savedWords.value.includes(item.term)) savedWords.value = [...savedWords.value, item.term]
        if (!savedDictionaryEntries.value.some(entry => entry.term === item.term)) {
          savedDictionaryEntries.value = [...savedDictionaryEntries.value, item.entry]
        }
      }
    }
    if (taskResponse.ok && taskImportOk) {
      const listResponse = await fetch('/api/daily-tasks?date=' + encodeURIComponent(todayKey))
      if (listResponse.ok) {
        const list = await listResponse.json() as { items?: Array<{ task_id: string; completed: number }> }
        const states = new Map((list.items || []).map(item => [item.task_id, Boolean(item.completed)]))
        tasks.value = tasks.value.map(task => ({ ...task, done: states.get(task.id) ?? task.done }))
      }
    }
    if (!taskImportOk || !vocabularyImportOk) {
      cloudDashboardError.value = '部分旧版学习数据尚未同步；本设备中的原始数据已保留。'
    }
  } catch {
    // Keep local data usable if the cloud is unavailable or an import partially fails.
  }
}
onMounted(() => { void syncExamHistory(); void hydrateCloudProgress() })

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
  technical?: boolean
}
const dictionaryEntries: DictionaryEntry[] = []
const onlineEntries = ref<DictionaryEntry[]>([])
const recentDictionaryEntries = ref<DictionaryEntry[]>(readStored('zhixue:recent-dictionary', []))
const savedDictionaryEntries = ref<DictionaryEntry[]>(readStored('zhixue:saved-dictionary-entries', []))
const dictionaryLoading = ref(false)
const dictionaryError = ref('')
const speechStatus = ref('')
const speechStatusTarget = ref('')
const lastSearchedTerm = ref('')
let dictionaryRequestId = 0
const speechPaused = ref(false)
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

function toggleSaved(term: string) {
  if (savedWords.value.includes(term)) {
    savedWords.value = savedWords.value.filter(word => word !== term)
    savedDictionaryEntries.value = savedDictionaryEntries.value.filter(entry => entry.term !== term)
    void fetch('/api/vocabulary/saved', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ term, action: 'remove' }),
    }).then(response => { if (!response.ok) cloudDashboardError.value = '云端生词删除失败。'; else void loadCloudDashboard() })
      .catch(() => { cloudDashboardError.value = '网络异常：生词删除未同步到云端。' })
    return
  }
  savedWords.value = [...savedWords.value, term]
  const entry = displayedEntries.value.find(item => item.term === term) ||
    recentDictionaryEntries.value.find(item => item.term === term)
  if (entry && !savedDictionaryEntries.value.some(item => item.term === term)) {
    savedDictionaryEntries.value = [entry, ...savedDictionaryEntries.value]
    void fetch('/api/vocabulary/saved', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ term, language: entry.language || 'auto', entry }),
    }).then(async response => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string }
        cloudDashboardError.value = data.error || '生词未能保存到云端。'
      } else { void loadCloudDashboard() }
    }).catch(() => { cloudDashboardError.value = '网络异常：生词暂未同步到云端。' })
  }
}
async function lookupDictionary() {
  const q = searchText.value.normalize('NFKC').trim().replace(/\s+/g, ' ')
  const requestedLanguage = dictSourceLang.value
  const requestId = ++dictionaryRequestId
  speechStatus.value = ''
  speechStatusTarget.value = ''
  if (!q) {
    dictionaryError.value = '请先输入英语单词、日语词语或 IT 缩写。'
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
  dictionaryLoading.value = true
  dictionaryError.value = ''
  onlineEntries.value = []
  lastSearchedTerm.value = ''
  try {
    const response = await fetch('/api/dictionary?q=' + encodeURIComponent(q) + '&lang=' + encodeURIComponent(requestedLanguage), {
      signal: AbortSignal.timeout(8000),
    })
    const data = await response.json() as { items?: DictionaryEntry[]; error?: string }
    // Ignore late responses from an older query or language selection.
    if (requestId !== dictionaryRequestId) return
    if (!response.ok) throw new Error(data.error || '在线词典暂时不可用，请稍后再试。')
    onlineEntries.value = data.items || []
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
  dictionaryRequestId += 1
  dictionaryLoading.value = false
  speechStatus.value = ''
  speechStatusTarget.value = ''
  searchText.value = ''
  onlineEntries.value = []
  lastSearchedTerm.value = ''
  dictionaryError.value = ''
}
function setDictionaryLanguage(language: 'auto' | 'ja' | 'en' | 'it') {
  if (dictSourceLang.value === language) return
  dictSourceLang.value = language
  dictionaryRequestId += 1
  dictionaryLoading.value = false
  onlineEntries.value = []
  lastSearchedTerm.value = ''
  dictionaryError.value = ''
  speechStatus.value = ''
  speechStatusTarget.value = ''
}
function quickDictionarySearch(term: string, language: 'ja' | 'en' | 'it') {
  searchText.value = term
  dictSourceLang.value = language
  void lookupDictionary()
}
watch(savedWords, value => localStorage.setItem('zhixue:saved-words', JSON.stringify(value)), { deep: true })

function navigate(id: ModuleId) {
  stopSpeech()
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
  const options = question.options.map(option => `${option.id.toUpperCase()}。 ${option.text}`).join('。')
  speakJapaneseQuestion(`${question.prompt}。選択肢：${options}`, `exam:${question.id}`)
}
function speakJapaneseQuestion(text: string, statusTarget = '') {
  // Use the same synchronous path as the dictionary play buttons to avoid Safari activation loss.
  speak(text, 'ja-JP', statusTarget)
}
function speak(text: string, lang: 'ja-JP' | 'en-US' | 'zh-CN' = 'ja-JP', statusTarget = '') {
  speechStatusTarget.value = statusTarget
  const spokenText = text.trim()
  if (!spokenText) {
    speechStatus.value = '没有可播放的文字。'
    return
  }
  const synthesis = window.speechSynthesis
  if (typeof synthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    speechStatus.value = '当前浏览器不支持语音合成。请使用 Safari/Chrome，并检查系统语音功能。'
    return
  }

  // Call speak() synchronously in the click handler. Delaying with setTimeout may lose
  // browser user activation and cause silent playback failures on Safari/iOS.
  const requestId = ++speechRequestId
  speechPaused.value = false
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
  // Safari/iOS can populate voices asynchronously. Never speak with an unknown OS
  // default voice: wait for voiceschanged, then retry with the requested language.
  if (availableVoices.length === 0) {
    speechStatus.value = '系统语音列表尚未加载，暂未播放；正在等待语音就绪。'
    synthesis.addEventListener('voiceschanged', () => {
      if (synthesis.getVoices().length > 0 && requestId === speechRequestId) {
        // Do not call speak() from this asynchronous event: iOS Safari may reject
        // speech started outside the original tap's user activation. Ask for one
        // explicit tap after voices are ready instead of silently failing.
        speechStatus.value = '系统语音已就绪，请再次点击播放。'
      } else if (requestId === speechRequestId) {
        speechStatus.value = '系统语音仍未就绪。请检查系统语音设置后重试。'
      }
    }, { once: true })
    return
  }
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
    speechStatus.value = lang === 'ja-JP'
      ? '未检测到日语语音。请在系统语音设置中安装日语语音后重试。'
      : '未检测到英语语音。请在系统语音设置中安装英语语音后重试。'
    return
  }
  if (voice) utterance.voice = voice

  let hasStarted = false
  utterance.onstart = () => {
    hasStarted = true
    if (requestId === speechRequestId) speechStatus.value = '正在播放：' + spokenText
  }
  utterance.onend = () => {
    if (requestId === speechRequestId) {
      const voiceLabel = voice ? '；语音：' + voice.name + (voice.localService ? '（设备本地）' : '（系统提供）') : '；语音：浏览器自动选择'
      speechStatus.value = '播放请求已结束' + voiceLabel + '。如果仍然无声，请确认 iPhone 媒体音量并重试。'
    }
  }
  utterance.onerror = event => {
    if (requestId !== speechRequestId || ['canceled', 'interrupted'].includes(String(event.error))) return
    const languageName = lang === 'ja-JP' ? '日语' : lang === 'en-US' ? '英语' : '中文'
    speechStatus.value = '播放失败（' + String(event.error) + '）。请检查浏览器声音、设备静音状态和系统中的' + languageName + '语音。'
  }

  speechStatus.value = '正在请求播放：' + spokenText
  try {
    synthesis.speak(utterance)
    synthesis.resume()
    // Some browser/system voice failures never fire onerror; avoid leaving a silent
    // "requesting playback" message forever. This watchdog does not delay speak().
    window.setTimeout(() => {
      if (requestId === speechRequestId && !hasStarted && speechStatus.value === '正在请求播放：' + spokenText) {
        speechStatus.value = '浏览器尚未启动语音播放。请检查系统英语/日语语音、浏览器权限与设备静音状态后重试。'
      }
    }, 3500)
  } catch {
    speechStatus.value = '浏览器没有接受这次语音请求，请再次点击播放。'
  }
}

function testAudioOutput() {
  // iOS Safari requires AudioContext to be resumed from the direct user gesture.
  // Do not schedule a very short tone until resume() has resolved: a suspended
  // context may otherwise consume the scheduled tone before it becomes audible.
  const AudioContextConstructor = window.AudioContext
  if (typeof AudioContextConstructor === 'undefined') {
    speechStatus.value = '当前浏览器不支持 Web Audio，无法执行设备声音测试。'
    return
  }

  const requestId = ++speechRequestId
  const synthesis = window.speechSynthesis
  try {
    if (synthesis && (synthesis.speaking || synthesis.pending)) synthesis.cancel()
    speechPaused.value = false

    const context = new AudioContextConstructor()
    speechStatus.value = '正在启动设备声音测试……'
    // Call resume immediately while the tap still has user activation.
    const resumePromise = context.resume()
    void resumePromise.then(() => {
      if (requestId !== speechRequestId) {
        void context.close().catch(() => undefined)
        return
      }
      if (context.state !== 'running') {
        speechStatus.value = '浏览器音频上下文未进入运行状态（' + context.state + '）。请重新点击测试。'
        void context.close().catch(() => undefined)
        return
      }

      // Schedule the tone only AFTER the context is running. Use a longer,
      // comfortably audible tone with a short fade so iOS has time to output it.
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04)
      gain.gain.setValueAtTime(0.2, now + 0.55)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.onended = () => {
        if (requestId === speechRequestId) {
          speechStatus.value = '设备测试音已提交到运行中的音频输出（AudioContext=running）。请确认是否实际听到；此结果仍不能证明语音合成正常。'
        }
        void context.close().catch(() => undefined)
      }
      oscillator.start(now + 0.03)
      oscillator.stop(now + 0.72)
    }).catch(() => {
      if (requestId === speechRequestId) {
        speechStatus.value = '浏览器无法启动音频上下文。请检查 Safari 页面状态与 iPhone 音频输出后重试。'
      }
      void context.close().catch(() => undefined)
    })
  } catch {
    speechStatus.value = '设备声音测试启动失败。请检查 iPhone 音频输出与浏览器状态。'
  }
}

function toggleSpeechPause() {
  const synthesis = window.speechSynthesis
  if (typeof synthesis === 'undefined') return
  if (synthesis.paused) {
    synthesis.resume()
    speechPaused.value = false
    speechStatus.value = '继续播放。'
  } else {
    synthesis.pause()
    speechPaused.value = true
    speechStatus.value = '已暂停播放。'
  }
}
function stopSpeech() {
  const synthesis = window.speechSynthesis
  speechRequestId += 1
  try { synthesis?.cancel() } catch { /* The browser may already have stopped playback. */ }
  speechPaused.value = false
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
  const text = entry.reading || (entry.language === 'ja' ? entry.term : '')
  if (!text) {
    speechStatus.value = '该词暂未收录日语假名读音。可以先播放英语原音；IT 术语词库会逐步补齐读音。'
    return
  }
  speak(text, 'ja-JP', entry.term)
}
</script>

<template>
  <div v-if="previewDemoMode" class="preview-demo-banner" role="status">
    预览演示模式：使用内置示例句子，不读取或写入云端学习数据。退出演示请移除网址中的 <code>?demo=1</code>。
  </div>
  <div class="app-shell">
    <aside class="sidebar">
      <button class="brand" @click="navigate('home')" aria-label="返回首页">
        <span class="brand-mark"><BookOpen :size="23" /></span>
        <span class="brand-copy"><strong>知学</strong><small>PERSONAL STUDY SPACE</small></span>
      </button>
      <div class="side-label">学习空间</div>
      <nav class="nav-list">
        <button class="nav-item" :class="{ active: activeModule === 'home' }" @click="navigate('home')"><span class="nav-icon"><Sparkles :size="18" /></span>学习首页</button>
        <button v-for="item in modules" :key="item.id" class="nav-item" :class="{ active: activeModule === item.id }" @click="navigate(item.id)">
          <span class="nav-icon"><component :is="item.icon" :size="18" /></span>{{ item.title }}
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="focus-card">
          <span class="focus-symbol"><Flame :size="17" /></span>
          <div><strong>每天进步一点点</strong><p>稳定练习，比一次学很多更重要。</p></div>
        </div>
        <div class="profile-row"><div class="avatar">知</div><div class="profile-text"><strong>我的学习空间</strong><small>个人模式 · 本地体验版</small></div><Menu :size="17" class="muted" /></div>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <button class="mobile-brand" @click="navigate('home')"><span class="brand-mark"><BookOpen :size="20" /></span><strong>知学</strong></button>
        <div class="breadcrumb"><span>我的空间</span><ChevronRight :size="14" /><strong>{{ activeModule === 'home' ? '学习首页' : currentInfo.title }}</strong></div>
        <div class="top-actions">
          <button class="icon-button mobile-menu-button" @click="showMobileMenu = !showMobileMenu" :aria-label="showMobileMenu ? '关闭菜单' : '打开菜单'"><X v-if="showMobileMenu" :size="19" /><Menu v-else :size="19" /></button>
        </div>
      </header>

      <div v-if="showMobileMenu" class="mobile-nav">
        <button @click="navigate('home')">学习首页</button>
        <button v-for="item in modules" :key="item.id" @click="navigate(item.id)">{{ item.title }}</button>
      </div>

      <div class="content-wrap">
        <section class="welcome-row">
          <div>
            <div class="eyebrow"><span class="eyebrow-dot"></span> YOUR PERSONAL LEARNING SPACE</div>
            <h1>{{ currentInfo.title }}</h1>
            <p class="welcome-subtitle">{{ currentInfo.subtitle }}</p>
          </div>
          <div class="date-pill"><span class="date-dot"></span> 今天也为自己留一点时间</div>
        </section>

        <template v-if="activeModule === 'home'">
          <section class="hero-panel">
            <div class="hero-content">
              <div class="hero-kicker"><Sparkles :size="15" /> 给未来的自己，多一点底气</div>
              <h2>学习不必赶路，<br /><span>但每一步都算数。</span></h2>
              <p>考试、语言和专业词汇分区管理。学过的内容可以收藏、回顾，再慢慢变成自己的知识。</p>
              <button class="primary-button" @click="navigate('exam')">继续我的学习 <ArrowRight :size="17" /></button>
              <div class="hero-note"><ShieldCheck :size="15" /> 个人学习 · 清晰分类 · 持续积累</div>
            </div>
            <div class="hero-art" aria-hidden="true">
              <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
              <div class="art-sun"></div>
              <div class="art-book"><div class="book-page page-left"></div><div class="book-page page-right"></div><div class="book-spine"></div><span class="book-star">✳</span></div>
              <div class="float-note note-top"><span class="mini-check"><CheckCircle2 :size="15" /></span><span><b>一点点积累</b><small>Build your own knowledge</small></span></div>
              <div class="float-note note-bottom"><span class="mini-spark">✦</span><span><b>Keep learning</b><small>让进步看得见</small></span></div>
              <span class="art-spark spark-a">✦</span><span class="art-spark spark-b">✳</span><span class="art-dot dot-a"></span><span class="art-dot dot-b"></span>
            </div>
          </section>

          <section class="section-block">
            <div class="section-heading"><div><div class="section-kicker">EXPLORE YOUR SPACE</div><h2>你想从哪里开始？</h2><p>四个模块，共享生词与学习记录，各自专注不同目标。</p></div><span class="section-index">01 / 04</span></div>
            <div class="module-grid">
              <button v-for="item in modules" :key="item.id" class="module-card" @click="navigate(item.id)">
                <div class="module-card-top"><span class="module-icon" :class="item.tone"><component :is="item.icon" :size="22" /></span><span class="card-arrow"><ArrowRight :size="17" /></span></div>
                <div class="module-en">{{ item.en }}</div><h3>{{ item.title }}</h3><p>{{ item.desc }}</p>
                <div class="module-card-foot"><span>{{ item.count }}</span><ChevronRight :size="15" /></div>
              </button>
            </div>
          </section>


          <section class="progress-dashboard">
            <div class="section-heading"><div><div class="section-kicker">CLOUD LEARNING DATA</div><h2>云端学习数据</h2><p>以下统计来自 D1 已保存的答题、实战、生词收藏与课程进度；不是演示数字。</p></div><span class="source-pill">{{ cloudDashboard?.generated_from || '连接中' }}</span></div>
            <p v-if="cloudDashboardError" class="dictionary-status dictionary-error">{{ cloudDashboardError }}</p>
            <div v-if="cloudDashboard" class="metric-grid">
              <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>云端答题</small><strong>{{ cloudDashboard.exam.attempted_questions }}</strong><span>{{ cloudDashboard.exam.accuracy_percent === null ? '暂无记录' : '正确率 ' + cloudDashboard.exam.accuracy_percent + '%' }}</span></div>
              <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>实战训练</small><strong>{{ cloudDashboard.practical.completed_scenarios }}</strong><span>{{ cloudDashboard.practical.completed_scenarios ? '平均得分 ' + Math.round(cloudDashboard.practical.average_score) + ' 分' : '暂无记录' }}</span></div>
              <div class="panel metric-card"><span class="metric-icon"><BookMarked :size="18" /></span><small>云端生词</small><strong>{{ cloudDashboard.vocabulary.saved_terms }}</strong><span>个已收藏词条</span></div>
            </div>
          </section>
          <section class="progress-dashboard">
            <div class="section-heading"><div><div class="section-kicker">YOUR DAILY MOMENTUM</div><h2>今日进度</h2><p>完成任务后会自动保存到当前设备，明天开始新的每日计划。</p></div><span class="section-index">{{ completedMinutes }} / {{ dailyGoalMinutes }} 分钟</span></div>
            <div class="progress-overview">
              <div class="panel daily-progress-panel">
                <div class="progress-title"><span class="metric-icon"><Target :size="18" /></span><div><strong>每日学习目标</strong><small>目标 {{ dailyGoalMinutes }} 分钟</small></div><b>{{ dailyPercent }}%</b></div>
                <div class="big-progress-track"><span :style="{ width: dailyPercent + '%' }"></span></div>
                <p>{{ completedMinutes >= dailyGoalMinutes ? '今日目标达成，做得不错！' : '再学习 ' + (dailyGoalMinutes - completedMinutes) + ' 分钟即可达成今日目标。' }}</p>
              </div>
              <div class="panel task-panel">
                <div class="panel-heading"><div><h3><ListChecks :size="16" /> 今日学习计划</h3><p>{{ tasks.filter(task => task.done).length }} / {{ tasks.length }} 项已完成</p></div></div>
                <label v-for="task in tasks" :key="task.id" class="study-task" :class="{ completed: task.done }">
                  <input v-model="task.done" type="checkbox" @change="saveDailyTask(task)" />
                  <span class="task-copy"><strong>{{ task.title }}</strong><small>{{ task.detail }}</small></span>
                  <span class="task-minutes">{{ task.minutes }} 分钟</span>
                </label>
              </div>
            </div>
          </section>
          <section class="progress-dashboard">
            <div class="section-heading"><div><div class="section-kicker">MEASURE WHAT MATTERS</div><h2>学习成果一览</h2><p>正确率与曲线只根据你记录的练习成绩计算，不用虚构数据填充。</p></div><button class="text-link" @click="navigate('exam')">查看考试记录 <ArrowRight :size="14" /></button></div>
            <div class="metric-grid">
              <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>累计答题</small><strong>{{ totalAnswered }}</strong><span>道题</span></div>
              <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>总体正确率</small><strong>{{ overallAccuracy === null ? '—' : overallAccuracy + '%' }}</strong><span>{{ overallAccuracy === null ? '记录首次练习后显示' : totalCorrect + ' 道答对' }}</span></div>
              <div class="panel metric-card"><span class="metric-icon"><TrendingUp :size="18" /></span><small>最近一次练习</small><strong>{{ latestRecord ? Math.round(latestRecord.correct / latestRecord.total * 100) + '%' : '—' }}</strong><span>{{ latestRecord ? latestRecord.exam + ' · ' + latestRecord.date : '暂无历史成绩' }}</span></div>
            </div>
            <div class="panel curve-panel">
              <div class="panel-heading"><div><h3>近 7 天正确率曲线</h3><p>按每天已记录的答题数加权计算；没有记录的日期会留空。</p></div><span class="curve-legend"><i></i>正确率</span></div>
              <div v-if="examRecords.length" class="curve-chart">
                <div v-for="day in curveRecords" :key="day.date" class="curve-column">
                  <div class="curve-value">{{ day.accuracy === null ? '—' : day.accuracy + '%' }}</div>
                  <div class="curve-bar-area"><span v-if="day.accuracy !== null" class="curve-bar" :style="{ height: Math.max(4, day.accuracy) + '%' }"></span><span v-else class="curve-empty"></span></div>
                  <small>{{ day.label }}</small>
                </div>
              </div>
              <div v-else class="curve-empty-state"><TrendingUp :size="24" /><strong>完成第一次练习，学习曲线就会开始生长</strong><p>进入考试备考，点击“记录一次练习成绩”即可开始积累历史记录。</p><button class="text-link" @click="navigate('exam')">去记录成绩 <ArrowRight :size="14" /></button></div>
            </div>
          </section>
          <section class="bottom-grid">
            <div class="panel recent-panel">
              <div class="panel-heading"><div><h3>最近查过的词</h3><p>把不熟悉的词，慢慢变成熟悉。</p></div><button class="text-link" @click="navigate('dictionary')">打开词典 <ArrowRight :size="14" /></button></div>
              <div v-for="entry in recentDictionaryEntries.slice(0, 2)" :key="entry.term" class="word-row">
                <div class="word-letter">{{ (entry.language === 'en' && entry.englishTerm ? entry.englishTerm : entry.term).slice(0,1) }}</div>
                <div class="word-details"><strong>{{ entry.language === 'en' && entry.englishTerm ? entry.englishTerm : entry.term }} <small>{{ entry.reading || entry.phonetic || '' }}</small></strong><span>{{ entry.en || entry.translationJa || '' }}</span></div>
                <button v-if="entry.englishTerm || entry.language === 'en'" class="round-action pronunciation-button" @click="speakDictionaryEnglish(entry)" aria-label="播放英语发音" title="播放英语发音"><Volume2 :size="14" /><span>EN</span></button>
                <button v-if="entry.reading || entry.language === 'ja' || entry.language === 'en' || entry.englishTerm" class="round-action pronunciation-button" @click="speakDictionaryJapanese(entry)" aria-label="播放日语辅助读音" title="播放日语辅助读音（片假名为近似提示）"><Languages :size="14" /><span>日</span></button>
              </div>
              <div v-if="recentDictionaryEntries.length === 0" class="recent-dictionary-empty">查过的词会显示在这里，方便继续复习。</div>
            </div>
            <div class="panel daily-panel">
              <div class="daily-icon"><Clock3 :size="19" /></div><div class="daily-copy"><div class="section-kicker">A SMALL DAILY GOAL</div><h3>给今天设一个小目标</h3><p>做 5 道题、听 3 分钟，或记住一个新词，都很好。</p><button class="text-link" @click="navigate('language')">开始轻量练习 <ArrowRight :size="14" /></button></div>
            </div>
          </section>
        </template>

        <template v-else-if="activeModule === 'exam'">
          <section class="section-block module-page-section">
            <div class="section-heading"><div><div class="section-kicker">YOUR EXAM ROADMAP</div><h2>选择要准备的考试</h2></div><span class="section-index">EXAM</span></div>
            <p v-if="tracksLoading" class="dictionary-status">正在读取 D1 中已启用的考试…</p>
            <p v-else-if="tracksError" class="dictionary-status dictionary-error">{{ tracksError }}</p>
            <div class="exam-list">
              <button v-for="exam in examTracks" :key="exam.id" class="exam-card" :class="{ 'exam-card-selected': selectedTrackId === exam.id }" @click="selectExam(exam)">
                <span class="exam-code" :class="exam.id.endsWith('sg') ? 'purple' : exam.id.endsWith('fe') ? 'blue' : 'green'">{{ exam.id.split('-').pop()?.toUpperCase() }}</span>
                <span class="exam-info"><strong>{{ exam.title }}</strong><small>{{ exam.subtitle }}</small></span>
                <span class="exam-progress">{{ '真题 ' + (exam.official_question_count || 0) + ' · 预测 ' + (exam.prediction_question_count || 0) }}</span><ChevronRight :size="18" class="muted" />
              </button>
              <div v-if="!tracksLoading && !tracksError && examTracks.length === 0" class="empty-state"><GraduationCap :size="25" /><strong>暂无已启用的考试</strong><p>请先在 D1 学习模块表中启用考试。</p></div>
            </div>

            <section class="practice-section">
              <div class="section-heading practice-heading"><div><div class="section-kicker">PRACTICE ROOM</div><h2>{{ selectedTrack ? selectedTrack.title + ' · 练习题' : '练习题' }}</h2></div></div>
              <div class="question-source-filters" role="group" aria-label="题目来源筛选">
                <button v-for="filter in questionSourceFilters" :key="filter.id" type="button" class="source-filter-button" :class="{ active: questionSourceFilter === filter.id }" :aria-pressed="questionSourceFilter === filter.id" @click="selectQuestionSource(filter.id)">{{ filter.label }}（{{ filter.id === 'official' ? (selectedTrack?.official_question_count || 0) : (selectedTrack?.prediction_question_count || 0) }}）</button>
              </div>
              <div class="question-category-section">
                <div class="question-category-heading"><strong>学习状态</strong><span>按当前题库筛选</span></div>
                <div class="question-category-filters question-review-filters" role="group" aria-label="题目学习状态">
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'all' }" :aria-pressed="activeReviewMode === 'all'" @click="selectReviewMode('all')">全部</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'unlearned' }" :aria-pressed="activeReviewMode === 'unlearned'" @click="selectReviewMode('unlearned')">未学习</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'mastered' }" :aria-pressed="activeReviewMode === 'mastered'" @click="selectReviewMode('mastered')">掌握</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'due' }" :aria-pressed="activeReviewMode === 'due'" @click="selectReviewMode('due')">再复习</button>
                  <button type="button" class="question-category-button" :class="{ active: activeReviewMode === 'wrong' }" :aria-pressed="activeReviewMode === 'wrong'" @click="selectReviewMode('wrong')">错题集</button>
                </div>
              </div>
              <div v-if="!quizQuestions.length || quizFinished" class="panel practice-start-card">
                <template v-if="quizFinished">
                  <div class="practice-result-icon"><CheckCircle2 :size="28" /></div>
                  <div class="practice-result-score">{{ quizCorrect }} / {{ quizQuestions.length }}</div>
                  <h3>本次练习完成</h3>
                  <p>正确率 {{ Math.round(quizCorrect / quizQuestions.length * 100) }}%。本次成绩已加入当前设备的历史记录。</p>
                  <p class="muted">当前筛选题量 {{ questionBankTotal }} 题 · 本组 {{ questionBatchOffset + 1 }}–{{ Math.min(questionBatchOffset + quizQuestions.length, questionBankTotal) }} 题</p>
                  <button class="primary-button" @click="nextQuestionBatch" :disabled="quizLoading">{{ quizLoading ? '正在加载…' : questionBankHasMore ? '继续下一组（10 题）' : '从头再练' }} <ArrowRight :size="16" /></button>
                </template>
                <template v-else>
                  <div class="practice-start-icon"><GraduationCap :size="25" /></div>
                  <h3>准备好开始练习了吗？</h3>
                  <p v-if="selectedTrack?.question_count">从 D1 读取 {{ selectedTrack.title }} 题目，提交后查看正确答案与解析。</p>
                  <p v-else>你可以选择不同考试。目前 SG 已接入专项练习题库；其他考试将在题库准备完成后开放。</p>
                  <div class="practice-start-actions">
                    <button class="primary-button" @click="startPractice" :disabled="quizLoading || !selectedTrack || selectedTrack.question_count === 0">{{ quizLoading ? '正在加载题目…' : selectedTrack?.question_count ? '开始练习（最多 10 题）' : '当前暂无可练习题目' }} <ArrowRight :size="16" /></button>
                  </div>
                  <p v-if="quizError" class="practice-error">{{ quizError }}</p>
                </template>
              </div>
              <div v-else-if="currentQuestion" class="panel question-card">
                <div class="question-topline"><span>{{ selectedTrack?.title || '考试练习' }} · 第 {{ quizIndex + 1 }} / {{ quizQuestions.length }} 题 · {{ currentQuestion.exam_section ? '科目' + currentQuestion.exam_section : '题型待复核' }}<template v-if="currentQuestion.exam_section && currentQuestion.exam_section_method !== 'explicit'">（规则推定）</template></span><span class="source-pill">{{ currentQuestion?.source_type === 'generated' ? '预测题库 · 原创' : currentQuestion?.source_type === 'official' ? '历年真题' : '其他题目' }}</span></div>
                <div class="question-progress"><span :style="{ width: ((quizIndex + 1) / quizQuestions.length * 100) + '%' }"></span></div>
                <div class="question-topic">{{ currentQuestion.topic }}</div>
                <div class="question-mastery-row">
                  <span class="question-mastery-badge" :class="{ mastered: Boolean(questionProgressById[currentQuestion.id]?.mastered) }">
                    {{ !questionProgressById[currentQuestion.id] ? '未开始' : questionProgressById[currentQuestion.id].mastered ? '已掌握' : questionProgressById[currentQuestion.id].last_result === 'again' ? '需要复习' : '学习中' }}
                  </span>
                  <span>连续答对 {{ questionProgressById[currentQuestion.id]?.correct_streak || 0 }} 次</span>
                  <span>复习 {{ questionProgressById[currentQuestion.id]?.review_count || 0 }} 次</span>
                </div>
                <a v-if="currentQuestion.source_type === 'official' && currentQuestion.source_reference" class="language-source" :href="currentQuestion.source_reference" target="_blank" rel="noreferrer">IPA 官方原卷 ↗</a>
                <div class="question-prompt-row">
                  <h3 class="question-prompt">{{ currentQuestion.prompt }}</h3>
                  <button type="button" class="secondary-button question-speak-button" @click="speakQuestion(currentQuestion)"><Volume2 :size="16" /> 日语语音读题</button>
                </div>
                <div v-if="speechStatus && speechStatusTarget === 'exam:' + currentQuestion.id" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button type="button" class="text-link" @click="testAudioOutput">测试设备声音</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                <div class="question-options">
                  <button v-for="option in currentQuestion.options" :key="option.id" class="question-option" :class="{ selected: selectedOption === option.id, correct: quizSubmitted && option.id === currentQuestion.answer, incorrect: quizSubmitted && selectedOption === option.id && option.id !== currentQuestion.answer }" :disabled="quizSubmitted" @click="selectedOption = option.id">
                    <span>{{ option.id.toUpperCase() }}</span><strong>{{ option.text }}</strong><CheckCircle2 v-if="quizSubmitted && option.id === currentQuestion.answer" :size="17" />
                  </button>
                </div>
                <div v-if="quizSubmitted" class="answer-explanation" :class="{ right: selectedOption === currentQuestion.answer }">
                  <strong>{{ selectedOption === currentQuestion.answer ? '回答正确！' : '这题答错了' }} 正确答案：{{ currentQuestion.answer.toUpperCase() }}</strong>
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
                  <button v-if="!quizSubmitted" class="primary-button" :disabled="!selectedOption" @click="submitPracticeAnswer">提交答案 <ArrowRight :size="15" /></button>
                  <button v-else class="primary-button" @click="nextPracticeQuestion">{{ isLastQuestion ? '查看本次成绩' : '下一题' }} <ArrowRight :size="15" /></button>
                </div>
              </div>
            </section>
            <section class="section-block mock-exam-section">
              <div class="section-heading"><div><div class="section-kicker">TIMED MOCK EXAM</div><h2>限时模拟考试</h2><p>共 60 题，限时 120 分钟。</p></div><span class="source-pill">A 48 题 · B 12 题</span></div>
              <div v-if="!mockStarted && !mockSubmitted" class="panel practice-start-card">
                <div class="practice-start-icon"><Clock3 :size="25" /></div><h3>模拟真实考试节奏</h3>
                <p>当前题库有 {{ selectedTrack?.question_count || 0 }} 道可用题目。正式模拟固定 60 题、每题 2 分、满分 120 分、限时 120 分钟；题量不足时不会用重复题补足。</p>
                <button class="primary-button" @click="startMockExam"  :disabled="mockLoading || !selectedTrack || selectedTrack.question_count < 60">{{ mockLoading ? '正在准备题目…' : selectedTrack && selectedTrack.question_count < 60 ? '题量不足 60 道' : '开始限时模拟' }} <ArrowRight :size="16" /></button>
                <p v-if="mockError" class="practice-error">{{ mockError }}</p>
              </div>
              <div v-else-if="mockSubmitted" class="panel practice-start-card">
                <div class="practice-result-icon"><CheckCircle2 :size="28" /></div>
                <div class="practice-result-score">{{ mockScore }} / 120 分</div>
                <h3>模拟考试已交卷</h3><p>答对 {{ mockCorrectCount }} / 60 题 · 正确率 {{ mockAccuracy }}% · 已作答 {{ mockAnsweredCount }} / 60 题。</p>
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
                <button class="primary-button" @click="mockSubmitted = false; mockQuestions = []; mockAnswers = {}; mockError = ''">结束复盘 <ArrowRight :size="16" /></button>
              </div>
              <div v-else class="mock-exam-active">
                <div class="panel mock-timer-panel">
                  <div><small>剩余时间</small><strong :class="{ 'mock-time-warning': mockRemainingSeconds <= 60 }">{{ formatMockTime(mockRemainingSeconds) }}</strong></div>
                  <div><small>已作答</small><strong>{{ mockAnsweredCount }} / {{ mockQuestions.length }}</strong></div>
                  <button class="primary-button" @click="finishMockExam(false)">交卷并查看结果</button>
                </div>
                <article v-for="(question, index) in mockQuestions" :key="question.id" class="panel question-card mock-question-card">
                  <div class="question-topline"><span>第 {{ index + 1 }} / {{ mockQuestions.length }} 题 · 科目{{ question.exam_section }}<template v-if="question.exam_section_method !== 'explicit'">（规则推定）</template> · {{ question.topic }}</span><span class="source-pill">{{ question.source_type === 'generated' ? '预测题库 · 原创' : question.source_type === 'official' ? '历年真题' : '其他题目' }}</span></div>
                  <a v-if="question.source_type === 'official' && question.source_reference" class="language-source" :href="question.source_reference" target="_blank" rel="noreferrer">IPA 官方原卷 ↗</a>
                  <h3 class="question-prompt">{{ question.prompt }}</h3>
                  <div class="question-options">
                    <button v-for="option in question.options" :key="option.id" class="question-option" :class="{ selected: mockAnswers[question.id] === option.id }" @click="mockAnswers[question.id] = option.id">
                      <span>{{ option.id.toUpperCase() }}</span><strong>{{ option.text }}</strong>
                    </button>
                  </div>
                </article>
                <p v-if="mockError" class="practice-error">{{ mockError }}</p>
              </div>
            </section>
            <section class="exam-performance">
              <div class="section-heading"><div><div class="section-kicker">YOUR SCORE HISTORY</div><h2>正确率与历史成绩</h2></div><button class="primary-button" @click="addExamRecord"><PlusCircle :size="16" /> 记录一次练习成绩</button></div>
              <div class="metric-grid">
                <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>累计答题</small><strong>{{ totalAnswered }}</strong><span>道题</span></div>
                <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>总体正确率</small><strong>{{ overallAccuracy === null ? '—' : overallAccuracy + '%' }}</strong><span>{{ overallAccuracy === null ? '暂无成绩，记录后自动计算' : totalCorrect + ' 道答对' }}</span></div>
                <div class="panel metric-card"><span class="metric-icon"><TrendingUp :size="18" /></span><small>考试记录</small><strong>{{ examRecords.length }}</strong><span>次练习</span></div>
              </div>
              <div class="panel curve-panel">
                <div class="panel-heading"><div><h3>近 7 天正确率曲线</h3><p>每日答题正确率按题量加权计算，不存在记录的日期不绘制数据。</p></div><button v-if="examRecords.length" class="text-link" :disabled="examHistorySyncing" @click="removeExamRecords">{{ examHistorySyncing ? '正在同步…' : '清除记录' }}</button></div>
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
          <section class="section-block module-page-section">
            <div class="section-heading"><div><div class="section-kicker">PRACTICAL SECURITY LAB</div><h2>把知识用在真实工作情境里</h2><p>日语题干与选项，支持日语语音播报；提交后显示日文原文和中文解析。</p></div><span class="section-index">{{ scenarios.length }} 个情境</span></div>
            <div class="panel practice-start-card">
              <div class="section-heading"><div><h3>选择训练方向</h3><p>当前提供 SG 信息安全管理情境，共 400 个日语原创情境。</p></div></div>
              <div class="exam-list">
                <button v-for="exam in examTracks" :key="exam.id" class="exam-card" :class="{ 'exam-card-selected': selectedTrackId === exam.id }" @click="selectExam(exam)">
                  <span class="exam-code purple">{{ exam.id.split('-').pop()?.toUpperCase() }}</span>
                  <span class="exam-info"><strong>{{ exam.title }}</strong><small>{{ exam.subtitle }}</small></span>
                  <ChevronRight :size="18" class="muted" />
                </button>
              </div>
            </div>
            <p v-if="scenariosLoading" class="dictionary-status">正在从 D1 读取实战情境…</p>
            <p v-else-if="scenariosError" class="dictionary-status dictionary-error">{{ scenariosError }}</p>
            <div v-else-if="!currentScenario" class="empty-state">
              <ShieldCheck :size="25" /><strong>实战情境暂时为空</strong>
              <p>页面和接口已接通，但当前数据库没有可用情境。请确认最新 D1 迁移已应用；迁移完成后刷新此页面。</p>
              <button class="secondary-button" @click="loadScenarios">重新加载</button>
            </div>
            <article v-else class="panel question-card practical-scenario-card">
              <div class="question-topline"><span>{{ currentScenario.category }} · {{ currentScenario.difficulty === 'intermediate' ? '中等' : '标准' }}</span><span class="source-pill">{{ currentScenario.source_type === 'official' ? '官方来源' : '平台原创情境' }}</span></div>
              <div class="question-prompt-row">
                <h3 class="question-prompt">{{ currentScenario.title }}</h3>
                <button type="button" class="secondary-button question-speak-button" @click="speakScenario(currentScenario)"><Volume2 :size="16" /> 日语语音读题</button>
              </div>
              <div v-if="speechStatus && speechStatusTarget === 'practical:' + currentScenario.id" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button type="button" class="text-link" @click="testAudioOutput">测试设备声音</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
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
            <div><span class="banner-tag">{{ studyLanguage === 'ja' ? '日本語 · JAPANESE' : 'ENGLISH · 英语' }}</span>
              <h2>{{ studyLanguage === 'ja' ? '実際の場面で使える日本語を身につけよう。' : 'Build confidence one useful phrase at a time.' }}</h2>
              <p>{{ studyLanguage === 'ja' ? '日常会話や職場で使える表現を、読み方・中国語訳・実例とともに学びます。' : 'Practice daily and workplace English with examples, explanations and speech.' }}</p>
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
                <div><span class="banner-tag">ACTIVE RECALL</span><h3>先回忆，再看答案</h3><p>先看中文提示，尝试说出完整的日语或英语句子，再揭晓原句并复习重点。</p></div>
                <span class="language-practice-count">待复习 {{ dueLanguageReviewCount }} · {{ visibleLanguageCards.length }} 张</span>
              </div>
              <div v-if="languagePracticeCard" class="language-practice-content">
                <span class="dict-tag">{{ languagePracticeCard.category }}</span>
                <div v-if="languagePracticeRevealed" class="language-practice-revealed-sentence">
                  <div class="sentence-highlight-legend" role="note" aria-label="句子高亮图例"><span class="sentence-legend-vocabulary"><i aria-hidden="true"></i>单词 / 短语</span><span class="sentence-legend-grammar"><i aria-hidden="true"></i>语法结构</span></div>
                  <h4 class="language-sentence"><span v-for="(part, index) in sentenceParts(languagePracticeCard)" :key="index" :class="part.type ? 'sentence-highlight-' + part.type : ''" :title="part.detail">{{ part.text }}</span></h4>
                  <p class="sentence-highlight-hint">黄色标出需要理解的词汇，蓝色标出句中的语法结构；下方会按颜色分别解释每一项。</p>
                  <p v-if="languagePracticeCard.reading" class="language-reading">{{ languagePracticeCard.reading }}</p>
                  <div class="language-speech-actions"><button type="button" class="play-button" @click="speakLanguageCard(languagePracticeCard, false, true)"><Volume2 :size="16" /> 播放原文</button><button v-if="languagePracticeCard.example" type="button" class="play-button" @click="speakLanguageCard(languagePracticeCard, true, true)"><Volume2 :size="16" /> 播放例句</button></div>
                  <div v-if="speechStatus && speechStatusTarget.startsWith('language-practice:' + languagePracticeCard.id + ':')" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button type="button" class="text-link" @click="testAudioOutput">测试设备声音</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                </div>
                <div v-if="languagePracticeRevealed" class="language-practice-answer">
                  <strong>{{ languagePracticeCard.meaning_zh }}</strong>
                  <p>{{ languagePracticeCard.explanation }}</p>
                  <section v-if="parseLanguageExpansion(languagePracticeCard.vocabulary_expansion_json).length" class="language-expansion">
                    <strong>🟨 高亮词汇逐项解释</strong>
                    <div v-for="(item, index) in parseLanguageExpansion(languagePracticeCard.vocabulary_expansion_json)" :key="'practice-vocab-' + index">
                      <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                    </div>
                  </section>
                  <section v-if="parseLanguageExpansion(languagePracticeCard.grammar_expansion_json).length" class="language-expansion grammar">
                    <strong>{{ sentenceParts(languagePracticeCard).some(part => part.type === 'grammar') ? '🟦 高亮语法逐项解释' : '语法观察提示（未检测到明确结构）' }}</strong>
                    <div v-for="(item, index) in parseLanguageExpansion(languagePracticeCard.grammar_expansion_json)" :key="'practice-grammar-' + index">
                      <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                    </div>
                  </section>
                  <a v-if="languagePracticeCard.source_url" class="language-source-link" :href="languagePracticeCard.source_url" target="_blank" rel="noopener noreferrer">查看句子来源 ↗</a>
                </div>
                <div v-else class="language-practice-recall-prompt">
                  <span class="banner-tag">先回忆，再揭晓</span>
                  <strong>{{ languagePracticeCard.meaning_zh || '请先尝试回忆这句话的意思。' }}</strong>
                  <p class="language-practice-prompt">请根据中文提示，用{{ studyLanguage === 'ja' ? '日语' : '英语' }}说出完整句子。说完后再显示原句，检查词汇、语法和表达是否自然。</p>
                </div>
                <div v-if="languageReviews.some(item => item.card_id === languagePracticeCard?.id)" class="language-review-meta">
                  <span>复习 {{ languageReviews.find(item => item.card_id === languagePracticeCard?.id)?.review_count || 0 }} 次</span>
                  <span>连续记住 {{ languageReviews.find(item => item.card_id === languagePracticeCard?.id)?.correct_streak || 0 }} 次</span>
                </div>
                <div class="language-practice-actions">
                  <button class="secondary-button" @click="languagePracticeRevealed = !languagePracticeRevealed">{{ languagePracticeRevealed ? '隐藏原句' : '显示原句与解析' }}</button>
                  <button class="primary-button" @click="nextLanguagePractice">跳过 <ArrowRight :size="15" /></button>
                  <button class="language-review-again" :disabled="languageReviewBusy === languagePracticeCard.id" @click="submitLanguageReview('again')">还不熟 · 稍后再练</button>
                  <button class="language-review-remembered" :disabled="languageReviewBusy === languagePracticeCard.id" @click="submitLanguageReview('remembered')">记住了 · 安排复习</button>
                  <button class="language-done-button" @click="toggleLanguageCard(languagePracticeCard.id)">{{ completedLanguageCards.includes(languagePracticeCard.id) ? '取消掌握' : '标记掌握' }}</button>
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
            <p v-if="studyLanguage === 'ja'" class="language-source">日语句子来自 <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer">Tatoeba</a> 开放例句；每条句子保留来源链接，句中标注词汇与语法。</p>
            <p v-else class="language-source">英语句子来自 <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer">Tatoeba</a> 开放例句；每条句子保留来源链接，句中标注词汇与语法。</p>
            <p v-if="languageCardsLoading" class="dictionary-status">正在从学习内容库读取课程…</p>
            <p v-else-if="languageCardsError" class="dictionary-status dictionary-error">{{ languageCardsError }} 请先应用最新的 D1 数据库迁移。</p>
            <div v-else class="language-card-list">
              <article v-for="card in paginatedLanguageCards" :key="card.id" class="language-study-card" :class="{ completed: completedLanguageCards.includes(card.id) }">
                <div class="language-card-top"><span class="dict-tag">{{ card.category }}</span><span class="language-source">{{ completedLanguageCards.includes(card.id) ? '已掌握' : isLanguageCardUnlearned(card) ? '未学习' : '学习中' }}</span><button class="language-done-button" @click="toggleLanguageCard(card.id)">{{ completedLanguageCards.includes(card.id) ? '取消掌握' : '标记已掌握' }}</button></div>
                <div class="sentence-highlight-legend" role="note" aria-label="句子高亮图例"><span class="sentence-legend-vocabulary"><i aria-hidden="true"></i>单词 / 短语</span><span class="sentence-legend-grammar"><i aria-hidden="true"></i>语法结构</span></div>
                <h3 class="language-sentence"><span v-for="(part, index) in sentenceParts(card)" :key="index" :class="part.type ? 'sentence-highlight-' + part.type : ''" :title="part.detail">{{ part.text }}</span></h3>
                <p class="sentence-highlight-hint">黄色标出需要理解的词汇，蓝色标出句中的语法结构；下方会按颜色分别解释每一项。</p>
                <p v-if="card.reading" class="language-reading">{{ card.reading }}</p>
                <p class="language-meaning language-sentence-translation">{{ card.meaning_zh }}</p>
                <p class="language-explanation">{{ card.explanation }}</p>
                <section v-if="parseLanguageExpansion(card.vocabulary_expansion_json).length" class="language-expansion">
                  <strong>🟨 高亮词汇逐项解释</strong>
                  <div v-for="(item, index) in parseLanguageExpansion(card.vocabulary_expansion_json)" :key="'vocab-' + index">
                    <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                  </div>
                </section>
                <section v-if="parseLanguageExpansion(card.grammar_expansion_json).length" class="language-expansion grammar">
                  <strong>{{ sentenceParts(card).some(part => part.type === 'grammar') ? '🟦 高亮语法逐项解释' : '语法观察提示（未检测到明确结构）' }}</strong>
                  <div v-for="(item, index) in parseLanguageExpansion(card.grammar_expansion_json)" :key="'grammar-' + index">
                    <b>{{ item.term }}</b><span>{{ item.meaning }}</span><small>{{ item.explanation }}</small>
                  </div>
                </section>
                <a v-if="card.source_url" class="language-source-link" :href="card.source_url" target="_blank" rel="noopener noreferrer">查看句子来源 ↗</a>
                <div class="language-speech-actions"><button type="button" class="play-button" @click="speakLanguageCard(card)"><Volume2 :size="17" /> 播放原文</button><button v-if="card.example" type="button" class="play-button" @click="speakLanguageCard(card, true)"><Volume2 :size="17" /> 播放例句</button></div>
                <div v-if="speechStatus && speechStatusTarget.startsWith('language-card:' + card.id + ':')" class="dictionary-speech-controls" role="status" aria-live="polite"><p class="dictionary-status">{{ speechStatus }}</p><button type="button" class="text-link" @click="testAudioOutput">测试设备声音</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                <small class="language-source">{{ card.source_type === 'licensed' ? '开放词库数据' : '平台自编学习内容' }}</small>
              </article>
              <div v-if="visibleLanguageCards.length > languagePageSize" class="language-pagination">
                <span>第 {{ languagePage }} / {{ languagePageCount }} 页 · 共 {{ visibleLanguageCards.length }} 张卡片</span>
                <button class="secondary-button" :disabled="languagePage <= 1" @click="languagePage = Math.max(1, languagePage - 1)">上一页</button>
                <button class="secondary-button" :disabled="languagePage >= languagePageCount" @click="languagePage = Math.min(languagePageCount, languagePage + 1)">下一页</button>
              </div>
              <div v-if="!languageCardsLoading && !languageCardsError && visibleLanguageCards.length === 0" class="empty-state"><BookOpen :size="25" /><strong>{{ selectedLanguageMastery === 'mastered' ? '还没有已掌握的卡片' : selectedLanguageMastery === 'unlearned' ? '这组卡片已经全部开始学习啦' : selectedLanguageMastery === 'unmastered' ? '没有正在学习或待复习的卡片' : '这个分类暂时没有已发布的课程' }}</strong><p>可以切换类别或掌握状态继续学习；进度会在云端保存，并在当前设备保留副本。</p></div>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="section-block dictionary-view-switch" aria-label="词典页面切换">
            <div class="dictionary-view-tabs" role="tablist" aria-label="词典和生词本">
              <button role="tab" :aria-selected="dictionaryView === 'search'" :class="{ chosen: dictionaryView === 'search' }" @click="dictionaryView = 'search'"><Search :size="16" /> 查词与 IT 术语</button>
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
              <button type="button" :class="{ chosen: dictSourceLang === 'it' }" @click="setDictionaryLanguage('it')">IT 术语（离线）</button>
            </div>
            <div class="search-box">
              <Search :size="19" />
              <input v-model="searchText" :placeholder="searchPlaceholder" @keyup.enter="lookupDictionary" />
              <button v-if="searchText" class="clear-search" @click="clearDictionarySearch">清空</button>
              <button class="dictionary-search-button" :disabled="dictionaryLoading" @click="lookupDictionary">{{ dictionaryLoading ? '查找中…' : '查词' }}</button>
            </div>
            <p>以英语学习为主：分别播放英语原音与日语辅助读音；结合 IPA 音标和片假名近似提示练习。日语查询可查看对应英文释义。IT 术语优先使用本地词库，无需在线翻译。</p>
            <p v-if="dictionaryLoading" class="dictionary-status">正在查词…</p>
            <p v-else-if="dictionaryError" class="dictionary-status dictionary-error">{{ dictionaryError }} <button type="button" class="text-link" @click="lookupDictionary">重试</button></p>
            <div v-if="!searchText.trim() && !dictionaryLoading" class="dictionary-quick-start"><span>试试查询</span><button @click="quickDictionarySearch('hello', 'en')">hello <small>英语</small></button><button @click="quickDictionarySearch('こんにちは', 'ja')">こんにちは <small>日语</small></button><button @click="quickDictionarySearch('認証', 'it')">認証 <small>IT</small></button><button @click="quickDictionarySearch('ハッシュ', 'it')">ハッシュ <small>安全</small></button><button @click="quickDictionarySearch('API', 'it')">API <small>接口</small></button><button @click="quickDictionarySearch('トランザクション', 'it')">トランザクション <small>数据库</small></button><button @click="quickDictionarySearch('CORS', 'it')">CORS <small>跨域</small></button><button @click="quickDictionarySearch('コンポーネント', 'it')">コンポーネント <small>前端</small></button><button @click="quickDictionarySearch('Cloudflare D1', 'it')">Cloudflare D1 <small>云数据库</small></button><button @click="quickDictionarySearch('プルリクエスト', 'it')">プルリクエスト <small>Git协作</small></button></div>
          </section>
          <section class="section-block">
            <div class="section-heading"><div><div class="section-kicker">ENGLISH PRONUNCIATION</div><h2>英日词典与 IT 术语</h2><p>英语释义 · IPA 音标 · 日语假名辅助发音 · 例句</p></div><span class="section-index">{{ displayedEntries.length }} 个结果</span></div>
            <div class="dictionary-list">
              <article v-for="entry in displayedEntries" :key="entry.term + (entry.tag || '') + (entry.en || '')" class="dictionary-card">
                <div class="dict-main">
                  <div class="dict-term-row"><h3>{{ entry.language === 'en' && entry.englishTerm ? entry.englishTerm : entry.term }}</h3><span v-if="entry.language === 'en' && entry.englishTerm && entry.englishTerm.toLowerCase() !== entry.term.toLowerCase()" class="reading">日语术语：{{ entry.term }}</span><span v-if="entry.reading" class="reading">{{ entry.language === 'en' ? '日语辅助读音（近似）' : '日语读音' }}：{{ entry.reading }}</span><span v-if="entry.phonetic" class="reading">IPA：{{ entry.phonetic }}</span><span class="dict-tag">{{ entry.tag }}</span><span v-if="entry.source" class="dict-source">{{ entry.source }}</span></div>
                  <div v-if="entry.englishTerm && entry.englishTerm.toLowerCase() !== entry.term.toLowerCase()" class="dict-en">英语对应词：{{ entry.englishTerm }}</div>
                  <div class="dict-en">英语释义：{{ entry.en || '暂无详细英语释义' }}</div>
                  <p v-if="entry.translationJa" class="dictionary-translation-ja">日语辅助理解：{{ entry.translationJa }}</p>
                  <p v-if="entry.example" class="dict-example">例句：{{ entry.example }}</p>
                  <p v-if="entry.technical" class="dictionary-tech-note">来自 IT 专业词汇库</p>
                  <div v-if="speechStatus && speechStatusTarget === entry.term" class="dictionary-speech-controls"><p class="dictionary-status" role="status" aria-live="polite">{{ speechStatus }}</p><button type="button" class="text-link" @click="testAudioOutput">测试设备声音</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="toggleSpeechPause">{{ speechPaused ? '继续播放' : '暂停' }}</button><button v-if="speechStatus.startsWith('正在') || speechPaused" type="button" class="text-link" @click="stopSpeech">停止</button></div>
                </div>
                <div class="dict-actions"><button class="round-action pronunciation-button" @click="speakDictionaryEnglish(entry)" :aria-label="'播放英语发音：' + (entry.englishTerm || entry.term)" title="播放英语原音；缺少对应词时会提示"><Volume2 :size="14" /><span>EN</span></button><button class="round-action pronunciation-button" @click="speakDictionaryJapanese(entry)" :aria-label="'播放日语辅助读音：' + (entry.englishTerm || entry.term)" title="播放日语辅助读音；缺少假名时会提示"><Languages :size="14" /><span>日</span></button><button class="round-action" :class="{ saved: savedWords.includes(entry.term) }" @click="toggleSaved(entry.term)" :aria-label="(savedWords.includes(entry.term) ? '取消收藏' : '收藏') + entry.term"><Bookmark :size="17" /></button></div>
              </article>
              <div v-if="lastSearchedTerm.trim().toLowerCase() === searchText.trim().toLowerCase() && displayedEntries.length === 0 && !dictionaryLoading" class="empty-state"><Search :size="25" /><strong>没有找到匹配词条</strong><p>可试试别名、英语缩写或日语术语；查 IT 专业词请选「IT」，该模式只查本地词库，不请求在线翻译。</p></div>
            </div>
          </section>
          </template>
          <section v-if="dictionaryView === 'saved'" class="section-block saved-vocabulary-block">
            <div class="section-heading"><div><div class="section-kicker">MY WORDS</div><h2>个人生词本</h2><p>收藏的词条会保存在这台设备的浏览器中。</p></div><span class="section-index">{{ savedWords.length }} 个收藏</span></div>
            <div v-if="savedVocabularyEntries.length" class="saved-vocabulary-list">
              <article v-for="entry in savedVocabularyEntries" :key="entry.term" class="saved-vocabulary-row">
                <div class="saved-vocabulary-copy"><strong>{{ entry.term }}</strong><small v-if="entry.reading">{{ entry.reading }}</small><p v-if="entry.en">英语释义：{{ entry.en }}</p><p v-if="entry.translationJa">日语辅助理解：{{ entry.translationJa }}</p></div>
                <button class="round-action pronunciation-button" @click="speakDictionaryEnglish(entry)" :aria-label="'播放英语发音：' + entry.term" title="英语原音"><Volume2 :size="16" /><span>EN</span></button>
                <button class="round-action pronunciation-button" @click="speakDictionaryJapanese(entry)" :aria-label="'播放日语辅助读音：' + entry.term" title="日语辅助读音"><Languages :size="16" /><span>日</span></button>
                <p v-if="speechStatus && speechStatusTarget === entry.term" class="dictionary-status" role="status" aria-live="polite">{{ speechStatus }}</p>
                <button class="saved-remove-button" @click="toggleSaved(entry.term)">取消收藏</button>
              </article>
            </div>
            <div v-else class="empty-state"><BookMarked :size="25" /><strong>还没有收藏词条</strong><p>查询后点击结果卡片旁的书签按钮，即可保存并在这里复习。</p></div>
          </section>
        </template>

        <footer class="footer"><span>知学 · 把每天的小进步，累积成自己的能力。</span><span>Vue 3 · TypeScript · Cloudflare</span></footer>
      </div>
    </main>
  </div>
</template>