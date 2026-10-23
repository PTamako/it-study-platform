<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  BookOpen, Languages, Search, BriefcaseBusiness, GraduationCap,
  ChevronRight, Sparkles, Clock3, Flame, Bookmark, Volume2, ArrowRight,
  ShieldCheck, BookMarked, Menu, X, CheckCircle2, CircleHelp, Target, TrendingUp, ListChecks, PlusCircle,
} from 'lucide-vue-next'

type ModuleId = 'home' | 'exam' | 'language' | 'dictionary'
const activeModule = ref<ModuleId>('home')
const searchText = ref('')
const dictSourceLang = ref<'auto' | 'ja' | 'en' | 'zh'>('auto')
const dictionaryView = ref<'search' | 'saved'>('search')
const studyLanguage = ref<'ja' | 'en'>(readStored('zhixue:study-language', 'ja'))
const selectedLanguageCategory = ref('全部')
const completedLanguageCards = ref<string[]>(readStored('zhixue:completed-language-cards', []))
const showMobileMenu = ref(false)
const savedWords = ref<string[]>(readStored('zhixue:saved-words', []))

type StudyTask = { id: string; title: string; detail: string; minutes: number; done: boolean }
type ExamRecord = { date: string; correct: number; total: number; exam: string }
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
  examRecords.value.push({ date: todayKey, correct, total, exam: exam.trim().toUpperCase() })
}
function removeExamRecords() {
  if (window.confirm('确定清除本设备保存的全部考试成绩吗？此操作无法撤销。')) examRecords.value = []
}

type PracticeOption = { id: string; text: string }
type PracticeQuestion = {
  id: string; track_id: string; topic: string; difficulty: string; prompt: string;
  options: PracticeOption[]; answer: string; explanation: string; source_type: string; language: string
}
const quizQuestions = ref<PracticeQuestion[]>([])
const quizIndex = ref(0)
const selectedOption = ref('')
const quizSubmitted = ref(false)
const quizLoading = ref(false)
const quizError = ref('')
const quizCorrect = ref(0)
type ExamTrack = { id: string; kind: string; title: string; subtitle: string; question_count: number }
const examTracks = ref<ExamTrack[]>([])
const selectedTrackId = ref('exam-sg')
const tracksLoading = ref(false)
const tracksError = ref('')
type QuestionSource = { id: string; exam_code: string; year_label: string; subject_label: string; title: string; source_url: string; content_mode: string; license_note: string; notes: string }
const officialQuestionSources = ref<QuestionSource[]>([])
const questionSourcesLoading = ref(false)
const questionSourcesError = ref('')
async function loadQuestionSources() {
  questionSourcesLoading.value = true
  questionSourcesError.value = ''
  try {
    const response = await fetch('/api/question-sources?exam=SG')
    const data = await response.json() as { items?: QuestionSource[]; error?: string }
    if (!response.ok) throw new Error(data.error || '官方题源目录暂不可用')
    officialQuestionSources.value = data.items || []
  } catch (error) {
    questionSourcesError.value = error instanceof Error ? error.message : '官方题源目录暂不可用'
  } finally {
    questionSourcesLoading.value = false
  }
}
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
function formatMockTime(seconds: number) {
  return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
}
async function startMockExam() {
  if (!selectedTrack.value || !selectedTrack.value.question_count) {
    mockError.value = '当前考试没有可用题目，暂时无法开始模拟考试。'
    return
  }
  mockLoading.value = true
  mockError.value = ''
  try {
    const response = await fetch('/api/questions?track=' + encodeURIComponent(selectedTrack.value.id) + '&limit=30')
    const data = await response.json() as { items?: PracticeQuestion[]; error?: string }
    if (!response.ok) throw new Error(data.error || '模拟考试题目加载失败')
    if (!data.items?.length) throw new Error('题库目前没有可用题目。')
    mockQuestions.value = data.items
    mockAnswers.value = {}
    mockDurationMinutes.value = Math.max(1, Math.ceil(data.items.length * 1.5))
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
  examRecords.value.push({ date: todayKey, correct, total, exam: (selectedTrack.value?.title || selectedTrackId.value) + ' 模拟考试' })
  const unanswered = total - mockAnsweredCount.value
  if (autoSubmit) mockError.value = '时间到，系统已自动交卷。未作答题目按答错计。'
  else mockError.value = unanswered ? '已交卷。未作答的 ' + unanswered + ' 题按答错计。' : ''
  const attempts = mockQuestions.value.filter(question => mockAnswers.value[question.id])
  const results = await Promise.allSettled(attempts.map(question => fetch('/api/attempts', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question_id: question.id, answer: mockAnswers.value[question.id], duration_seconds: Math.max(0, Math.floor((Date.now() - mockStartedAt.value) / 1000)) }),
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
  situation: string; task: string; options: ScenarioOption[]; source_type: string
}
const scenarios = ref<PracticalScenario[]>([])
const scenariosLoading = ref(false)
const scenariosError = ref('')
const selectedScenarioId = ref('')
const selectedScenarioOption = ref('')
const scenarioSubmitting = ref(false)
const scenarioResult = ref<{ score: number; best_option: string; correct: boolean; feedback: string } | null>(null)
const currentScenario = computed(() => scenarios.value.find(item => item.id === selectedScenarioId.value) || scenarios.value[0] || null)
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
    scenarioResult.value = {
      score: Number(data.score || 0),
      best_option: String(data.best_option || ''),
      correct: Boolean(data.correct),
      feedback: String(data.feedback || ''),
    }
    void loadCloudDashboard()
  } catch (error) {
    scenariosError.value = error instanceof Error ? error.message : '实战结果保存失败，请稍后重试。'
  } finally {
    scenarioSubmitting.value = false
  }
}
watch(selectedTrackId, () => { void loadScenarios() })
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
  selectedTrackId.value = track.id
  quizQuestions.value = []
  quizIndex.value = 0
  selectedOption.value = ''
  quizSubmitted.value = false
  quizCorrect.value = 0
  quizFinished.value = false
  quizError.value = ''
}
async function startWrongReview() {
  if (!selectedTrack.value) { quizError.value = '尚未加载考试列表，请刷新页面后重试。'; return }
  quizLoading.value = true
  quizError.value = ''
  try {
    const response = await fetch('/api/wrong-questions?track=' + encodeURIComponent(selectedTrack.value.id) + '&limit=30')
    const data = await response.json() as { items?: PracticeQuestion[]; error?: string }
    if (!response.ok) throw new Error(data.error || '错题加载失败')
    if (!data.items?.length) {
      quizError.value = '当前考试还没有云端错题。完成练习并答错后，这里会自动收集需要复习的题目。'
      return
    }
    quizQuestions.value = data.items
    quizIndex.value = 0
    selectedOption.value = ''
    quizSubmitted.value = false
    quizCorrect.value = 0
    quizFinished.value = false
    quizStartedAt.value = Date.now()
  } catch (error) {
    quizError.value = error instanceof Error ? error.message : '错题加载失败，请稍后重试。'
  } finally {
    quizLoading.value = false
  }
}
async function startPractice() {
  if (!selectedTrack.value) { quizError.value = '尚未加载考试列表，请刷新页面后重试。'; return }
  if (!selectedTrack.value.question_count) {
    quizError.value = '该考试尚未接入题库。目前正式接入的是 SG；不会用其他考试题目代替。'
    return
  }
  quizLoading.value = true
  quizError.value = ''
  try {
    const response = await fetch('/api/questions?track=' + encodeURIComponent(selectedTrack.value.id) + '&limit=10')
    const data = await response.json() as { items?: PracticeQuestion[]; error?: string }
    if (!response.ok) throw new Error(data.error || '题库加载失败')
    if (!data.items?.length) throw new Error('该考试目前没有可用题目，请刷新考试列表后重试。')
    quizQuestions.value = data.items
    quizIndex.value = 0
    selectedOption.value = ''
    quizSubmitted.value = false
    quizCorrect.value = 0
    quizFinished.value = false
    quizStartedAt.value = Date.now()
  } catch (error) {
    quizError.value = error instanceof Error ? error.message : '题库加载失败，请稍后重试。'
  } finally {
    quizLoading.value = false
  }
}
function submitPracticeAnswer() {
  if (!currentQuestion.value || !selectedOption.value || quizSubmitted.value) return
  quizSubmitted.value = true
  if (selectedOption.value === currentQuestion.value.answer) quizCorrect.value += 1
  // 真实答题记录写入 D1；本地分数仍即时显示，保存失败会提示而不丢失当前答题流程。
  void fetch('/api/attempts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question_id: currentQuestion.value.id,
      answer: selectedOption.value,
      duration_seconds: quizStartedAt.value ? Math.floor((Date.now() - quizStartedAt.value) / 1000) : 0,
    }),
  }).then(async response => {
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      quizError.value = data.error || '本次答题已显示，但保存到学习记录失败。'
    } else {
      void loadCloudDashboard()
    }
  }).catch(() => { quizError.value = '网络异常：本次答题结果尚未保存到云端。' })
}
function nextPracticeQuestion() {
  if (!isLastQuestion.value) {
    quizIndex.value += 1
    selectedOption.value = ''
    quizSubmitted.value = false
    return
  }
  examRecords.value.push({ date: todayKey, correct: quizCorrect.value, total: quizQuestions.value.length, exam: selectedTrack.value?.title || selectedTrackId.value })
  quizFinished.value = true
}

const moduleInfo = {
  home: { title: '今天，学一点新的。', subtitle: '把考试、语言和专业知识，放进一个顺手的学习空间。' },
  exam: { title: '考试备考', subtitle: '选择已启用的考试；题库已接入的考试才能开始练习。当前已接入 SG。' },
  language: { title: '语言学习', subtitle: '选择日语或英语，按实际学习内容练习表达、理解和发音。' },
  dictionary: { title: '多语言词典', subtitle: '把中文、日语、英语和 IT 术语连起来，随查随记。' },
} as const

const currentInfo = computed(() => moduleInfo[activeModule.value])
const searchPlaceholder = computed(() => activeModule.value === 'dictionary' ? '查词、查缩写，例如 MFA / 認証…' : '搜索考试、课程、知识点…')

const modules = [
  { id: 'exam' as const, title: '考试备考', en: 'EXAM PREP', desc: '按已接入考试选择目标与练习', icon: GraduationCap, tone: 'lavender', count: '题量以题库数据为准' },
  { id: 'language' as const, title: '语言学习', en: 'LANGUAGE', desc: '日语 / 英语 · 例句 · 发音 · 复习', icon: Languages, tone: 'peach', count: '选择语言开始学习' },
  { id: 'dictionary' as const, title: '词典与 IT 术语', en: 'DICTIONARY', desc: '中日英互译 · 专业词库 · 生词本', icon: BookMarked, tone: 'blue', count: '普通词汇与技术词汇' },
]

const languageCategories = [
  { title: '全部', desc: '所有已发布的课程卡', icon: BookOpen },
  { title: '日常与情景会话', desc: '生活中真实会用到的表达', icon: Languages },
  { title: '职场与商务语言', desc: '工作沟通和礼貌表达', icon: BriefcaseBusiness },
  { title: '词汇与语法', desc: '词义、搭配和句型', icon: BookMarked },
]

type LanguageCard = {
  id: string; language: 'ja' | 'en'; category: string; term: string; reading?: string;
  meaning_zh: string; explanation: string; example: string; example_meaning_zh: string; source_type: string
}
const languageCards = ref<LanguageCard[]>([])
const languageCardsLoading = ref(false)
const languageCardsError = ref('')
const visibleLanguageCards = computed(() => languageCards.value.filter(card =>
  selectedLanguageCategory.value === '全部' || card.category === selectedLanguageCategory.value
))
const languageProgress = computed(() => {
  const ids = languageCards.value.map(card => card.id)
  const done = ids.filter(id => completedLanguageCards.value.includes(id)).length
  return { done, total: ids.length, percent: ids.length ? Math.round(done / ids.length * 100) : 0 }
})
async function loadLanguageCards() {
  languageCardsLoading.value = true
  languageCardsError.value = ''
  languageCards.value = []
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
function toggleLanguageCard(id: string) {
  const mastered = !completedLanguageCards.value.includes(id)
  completedLanguageCards.value = mastered
    ? [...completedLanguageCards.value, id]
    : completedLanguageCards.value.filter(item => item !== id)
  void fetch('/api/language-progress', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ card_id: id, mastered }),
  }).then(async response => {
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      languageCardsError.value = data.error || '掌握进度未能保存到云端。'
    } else {
      void loadCloudDashboard()
    }
  }).catch(() => { languageCardsError.value = '网络异常：掌握进度暂未同步到云端。' })
}
watch(studyLanguage, value => {
  localStorage.setItem('zhixue:study-language', JSON.stringify(value))
  selectedLanguageCategory.value = '全部'
  void loadLanguageCards()
})
watch(completedLanguageCards, value => localStorage.setItem('zhixue:completed-language-cards', JSON.stringify(value)), { deep: true })
async function hydrateCloudProgress() {
  await Promise.all([loadCloudDashboard(), loadExamTracks(), loadLanguageCards()])
  try {
    const [progressResponse, savedResponse, taskResponse] = await Promise.all([
      fetch('/api/language-progress'), fetch('/api/vocabulary/saved'), fetch('/api/dashboard'),
    ])
    if (progressResponse.ok) {
      const progress = await progressResponse.json() as { items?: Array<{ card_id: string; mastered: number }> }
      // D1 is authoritative once it responds; unioning stale local state prevents unmarking a card.
      completedLanguageCards.value = (progress.items || []).filter(item => item.mastered).map(item => item.card_id)
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
    // Dashboard query confirms the cloud API is reachable; task rows are keyed by date.
    if (taskResponse.ok) {
      const data = await taskResponse.json() as { today?: { tasks_completed: number; tasks_tracked: number } }
      if (data.today?.tasks_tracked) {
        // Daily task names are stable IDs; preserve the locally authored labels and hydrate completion flags.
        const listResponse = await fetch('/api/daily-tasks?date=' + encodeURIComponent(todayKey))
        if (listResponse.ok) {
          const list = await listResponse.json() as { items?: Array<{ task_id: string; completed: number }> }
          const states = new Map((list.items || []).map(item => [item.task_id, Boolean(item.completed)]))
          tasks.value = tasks.value.map(task => ({ ...task, done: states.get(task.id) ?? task.done }))
        }
      }
    }
  } catch { /* local experience remains available if cloud sync is temporarily unavailable */ }
}
onMounted(() => { void hydrateCloudProgress(); void loadQuestionSources() })

type DictionaryEntry = {
  term: string
  reading?: string
  phonetic?: string
  en: string
  zh: string
  tag: string
  example?: string
  language?: 'ja' | 'en' | 'zh'
  source?: string
  translationJa?: string
  technical?: boolean
}
const dictionaryEntries: DictionaryEntry[] = []
const onlineEntries = ref<DictionaryEntry[]>([])
const recentDictionaryEntries = ref<DictionaryEntry[]>(readStored('zhixue:recent-dictionary', []))
const savedDictionaryEntries = ref<DictionaryEntry[]>(readStored('zhixue:saved-dictionary-entries', []))
const dictionaryLoading = ref(false)
const dictionaryError = ref('')
const lastSearchedTerm = ref('')
watch(recentDictionaryEntries, value => localStorage.setItem('zhixue:recent-dictionary', JSON.stringify(value)), { deep: true })
watch(savedDictionaryEntries, value => localStorage.setItem('zhixue:saved-dictionary-entries', JSON.stringify(value)), { deep: true })
const savedVocabularyEntries = computed(() => savedWords.value.map(term =>
  savedDictionaryEntries.value.find(entry => entry.term === term) ||
  recentDictionaryEntries.value.find(entry => entry.term === term) ||
  { term, zh: '再次查询该词后即可补全释义。', reading: '', translationJa: '', language: 'ja' as const }
))
const filteredEntries = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return dictionaryEntries
  return dictionaryEntries.filter((item) => [item.term, item.reading || '', item.phonetic || '', item.en, item.zh].some((v) => v.toLowerCase().includes(q)))
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
  const q = searchText.value.trim()
  if (!q) {
    dictionaryError.value = '请先输入日语、英语或中文词语。'
    onlineEntries.value = []
    lastSearchedTerm.value = ''
    return
  }
  if (q.length > 100) {
    dictionaryError.value = '一次最多查询 100 个字符，请缩短查询内容。'
    return
  }
  dictionaryLoading.value = true
  dictionaryError.value = ''
  onlineEntries.value = []
  try {
    const response = await fetch('/api/dictionary?q=' + encodeURIComponent(q) + '&lang=' + encodeURIComponent(dictSourceLang.value))
    const data = await response.json() as { items?: DictionaryEntry[]; error?: string }
    if (!response.ok) throw new Error(data.error || '在线词典暂时不可用，请稍后再试。')
    onlineEntries.value = data.items || []
    lastSearchedTerm.value = q
    if (onlineEntries.value.length) {
      const stamped = onlineEntries.value.filter(entry => entry.term).slice(0, 3)
      recentDictionaryEntries.value = [
        ...stamped,
        ...recentDictionaryEntries.value.filter(old => !stamped.some(entry => entry.term === old.term)),
      ].slice(0, 12)
    }
    if (!onlineEntries.value.length) dictionaryError.value = data.error || '没有找到匹配词条。试试单个单词、日语假名或常见表达。'
  } catch (error) {
    dictionaryError.value = error instanceof Error ? error.message : '查询失败，请检查网络后重试。'
  } finally {
    dictionaryLoading.value = false
  }
}
function clearDictionarySearch() {
  searchText.value = ''
  onlineEntries.value = []
  lastSearchedTerm.value = ''
  dictionaryError.value = ''
}
function quickDictionarySearch(term: string, language: 'ja' | 'en' | 'zh') {
  searchText.value = term
  dictSourceLang.value = language
  void lookupDictionary()
}
watch(savedWords, value => localStorage.setItem('zhixue:saved-words', JSON.stringify(value)), { deep: true })

function navigate(id: ModuleId) {
  activeModule.value = id
  showMobileMenu.value = false
  searchText.value = ''
}

// 浏览器 TTS 的声音质量因设备而异：优先选择匹配语言的自然/增强语音，
 // 并放慢语速，避免快速连点造成语音重叠或被取消后不播放。
let speechRequestId = 0
function speak(text: string, lang: 'ja-JP' | 'en-US' | 'zh-CN' = 'ja-JP') {
  const synthesis = window.speechSynthesis
  if (typeof synthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
    window.alert('当前浏览器不支持语音播放。请用 iPhone 的 Safari 打开，或检查系统语音设置。')
    return
  }

  const requestId = ++speechRequestId
  synthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text.trim())
  utterance.lang = lang
  utterance.rate = lang === 'ja-JP' ? 0.78 : lang === 'en-US' ? 0.86 : 0.82
  utterance.pitch = 1
  utterance.volume = 1

  const chooseVoice = () => {
    const voices = synthesis.getVoices().filter(voice =>
      voice.lang.toLowerCase() === lang.toLowerCase()
      || voice.lang.toLowerCase().replace('_', '-').startsWith(lang.slice(0, 2).toLowerCase()),
    )
    if (!voices.length) return
    const preferred = voices.find(voice => /natural|enhanced|premium|siri|kyoko|otoya/i.test(voice.name))
      || voices.find(voice => voice.lang.toLowerCase() === lang.toLowerCase() && voice.localService)
      || voices.find(voice => voice.lang.toLowerCase() === lang.toLowerCase())
      || voices[0]
    utterance.voice = preferred
  }

  chooseVoice()
  // iOS Safari 有时在 cancel() 后立即 speak() 会吞掉新语音，短暂延迟更稳定。
  window.setTimeout(() => {
    if (requestId !== speechRequestId) return
    chooseVoice()
    synthesis.speak(utterance)
  }, 100)
}
</script>

<template>
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
              <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>实战演练</small><strong>{{ cloudDashboard.practical.completed_scenarios }}</strong><span>{{ cloudDashboard.practical.completed_scenarios ? '平均得分 ' + Math.round(cloudDashboard.practical.average_score) + ' 分' : '暂无记录' }}</span></div>
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
                <div class="word-letter">{{ entry.term.slice(0,1) }}</div><div class="word-details"><strong>{{ entry.term }} <small>{{ entry.reading || entry.phonetic || '' }}</small></strong><span>{{ entry.zh }}</span></div>
                <button class="round-action" @click="speak(entry.term, entry.language === 'en' ? 'en-US' : entry.language === 'zh' ? 'zh-CN' : 'ja-JP')" aria-label="播放发音"><Volume2 :size="17" /></button>
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
            <div class="section-heading"><div><div class="section-kicker">YOUR EXAM ROADMAP</div><h2>选择要准备的考试</h2><p>题库会明确标注官方来源、授权题目或练习题，不混淆真题与生成题。</p></div><span class="section-index">EXAM</span></div>
            <p v-if="tracksLoading" class="dictionary-status">正在读取 D1 中已启用的考试…</p>
            <p v-else-if="tracksError" class="dictionary-status dictionary-error">{{ tracksError }}</p>
            <div class="exam-list">
              <button v-for="exam in examTracks" :key="exam.id" class="exam-card" :class="{ 'exam-card-selected': selectedTrackId === exam.id }" @click="selectExam(exam)">
                <span class="exam-code" :class="exam.id.endsWith('sg') ? 'purple' : exam.id.endsWith('fe') ? 'blue' : 'green'">{{ exam.id.split('-').pop()?.toUpperCase() }}</span>
                <span class="exam-info"><strong>{{ exam.title }}</strong><small>{{ exam.subtitle }}</small></span>
                <span class="exam-progress">{{ exam.question_count ? exam.question_count + ' 道可练习' : '题库尚未接入' }}</span><ChevronRight :size="18" class="muted" />
              </button>
              <div v-if="!tracksLoading && !tracksError && examTracks.length === 0" class="empty-state"><GraduationCap :size="25" /><strong>暂无已启用的考试</strong><p>请先在 D1 学习模块表中启用考试。</p></div>
            </div>

            <section class="panel question-sources-panel">
              <div class="panel-heading"><div><h3>官方过去问入口</h3><p>优先使用 IPA 官方公开题；当前提供原始出处链接，不把第三方题库冒充官方题。</p></div><span class="source-pill">IPA</span></div>
              <p v-if="questionSourcesLoading" class="dictionary-status">正在读取官方题源目录…</p>
              <p v-else-if="questionSourcesError" class="dictionary-status dictionary-error">{{ questionSourcesError }}</p>
              <a v-for="source in officialQuestionSources" :key="source.id" class="question-source-row" :href="source.source_url" target="_blank" rel="noopener noreferrer">
                <span class="question-source-icon"><BookMarked :size="18" /></span>
                <span class="question-source-copy"><strong>{{ source.title }}</strong><small>{{ source.year_label }} · {{ source.subject_label }}</small><small>{{ source.notes }}</small></span>
                <ArrowRight :size="17" />
              </a>
              <p v-if="!questionSourcesLoading && !questionSourcesError && !officialQuestionSources.length" class="recent-dictionary-empty">官方题源目录尚未导入 D1；稍后执行迁移 0011、0012 即可加载。</p>
            </section>

            <section class="practice-section">
              <div class="section-heading"><div><div class="section-kicker">PRACTICE ROOM</div><h2>{{ selectedTrack ? selectedTrack.title + ' · 练习题' : '练习题' }}</h2><p>题目根据上方所选考试读取；未接入题库的考试不会展示假题。</p></div><span class="source-pill">{{ selectedTrack?.question_count ? selectedTrack.question_count + ' 道可练习' : '题库待接入' }}</span></div>
              <div v-if="!quizQuestions.length || quizFinished" class="panel practice-start-card">
                <template v-if="quizFinished">
                  <div class="practice-result-icon"><CheckCircle2 :size="28" /></div>
                  <div class="practice-result-score">{{ quizCorrect }} / {{ quizQuestions.length }}</div>
                  <h3>本次练习完成</h3>
                  <p>正确率 {{ Math.round(quizCorrect / quizQuestions.length * 100) }}%。本次成绩已加入当前设备的历史记录。</p>
                  <button class="primary-button" @click="startPractice" :disabled="quizLoading">{{ quizLoading ? '正在加载…' : '再练一组' }} <ArrowRight :size="16" /></button>
                </template>
                <template v-else>
                  <div class="practice-start-icon"><GraduationCap :size="25" /></div>
                  <h3>准备好开始练习了吗？</h3>
                  <p v-if="selectedTrack?.question_count">从 D1 读取 {{ selectedTrack.title }} 题目，提交后查看正确答案与解析。</p>
                  <p v-else>你可以选择不同考试。目前只有 SG 已接入题目；其他考试准备好题库后才会开放练习。</p>
                  <div class="practice-start-actions">
                    <button class="primary-button" @click="startPractice" :disabled="quizLoading || !selectedTrack || selectedTrack.question_count === 0">{{ quizLoading ? '正在加载题目…' : selectedTrack?.question_count ? '开始练习（最多 10 题）' : '当前暂无可练习题目' }} <ArrowRight :size="16" /></button>
                    <button class="text-link" @click="startWrongReview" :disabled="quizLoading || !selectedTrack">{{ quizLoading ? '正在加载…' : '复习云端错题' }}</button>
                  </div>
                  <p v-if="quizError" class="practice-error">{{ quizError }}</p>
                </template>
              </div>
              <div v-else-if="currentQuestion" class="panel question-card">
                <div class="question-topline"><span>{{ selectedTrack?.title || '考试练习' }} · 第 {{ quizIndex + 1 }} / {{ quizQuestions.length }} 题</span><span class="source-pill">{{ currentQuestion?.source_type === 'generated' ? '自编练习题' : currentQuestion?.source_type === 'official' ? '官方题目' : currentQuestion?.source_type === 'licensed' ? '授权题目' : '个人题目' }}</span></div>
                <div class="question-progress"><span :style="{ width: ((quizIndex + 1) / quizQuestions.length * 100) + '%' }"></span></div>
                <div class="question-topic">{{ currentQuestion.topic }}</div>
                <h3 class="question-prompt">{{ currentQuestion.prompt }}</h3>
                <div class="question-options">
                  <button v-for="option in currentQuestion.options" :key="option.id" class="question-option" :class="{ selected: selectedOption === option.id, correct: quizSubmitted && option.id === currentQuestion.answer, incorrect: quizSubmitted && selectedOption === option.id && option.id !== currentQuestion.answer }" :disabled="quizSubmitted" @click="selectedOption = option.id">
                    <span>{{ option.id.toUpperCase() }}</span><strong>{{ option.text }}</strong><CheckCircle2 v-if="quizSubmitted && option.id === currentQuestion.answer" :size="17" />
                  </button>
                </div>
                <div v-if="quizSubmitted" class="answer-explanation" :class="{ right: selectedOption === currentQuestion.answer }">
                  <strong>{{ selectedOption === currentQuestion.answer ? '回答正确！' : '这题答错了' }} 正确答案：{{ currentQuestion.answer.toUpperCase() }}</strong>
                  <p>{{ currentQuestion.explanation }}</p>
                </div>
                <div class="question-actions">
                  <span v-if="!quizSubmitted" class="question-hint">选择一个答案后提交</span><span v-else class="question-hint">当前得分：{{ quizCorrect }} / {{ quizIndex + 1 }}</span>
                  <button v-if="!quizSubmitted" class="primary-button" :disabled="!selectedOption" @click="submitPracticeAnswer">提交答案 <ArrowRight :size="15" /></button>
                  <button v-else class="primary-button" @click="nextPracticeQuestion">{{ isLastQuestion ? '查看本次成绩' : '下一题' }} <ArrowRight :size="15" /></button>
                </div>
              </div>
            </section>
            <section class="section-block mock-exam-section">
              <div class="section-heading"><div><div class="section-kicker">TIMED MOCK EXAM</div><h2>限时模拟考试</h2><p>随机抽取最多 30 道当前考试题。交卷或时间结束前，不显示正确答案与解析。</p></div><span class="source-pill">限时 · 独立计分</span></div>
              <div v-if="!mockStarted && !mockSubmitted" class="panel practice-start-card">
                <div class="practice-start-icon"><Clock3 :size="25" /></div><h3>模拟真实考试节奏</h3>
                <p>当前题库有 {{ selectedTrack?.question_count || 0 }} 道可用题目；本场最多抽取 30 道，系统按题量设置时间，每题约 90 秒。</p>
                <button class="primary-button" @click="startMockExam" :disabled="mockLoading || !selectedTrack?.question_count">{{ mockLoading ? '正在准备题目…' : '开始限时模拟' }} <ArrowRight :size="16" /></button>
                <p v-if="mockError" class="practice-error">{{ mockError }}</p>
              </div>
              <div v-else-if="mockSubmitted" class="panel practice-start-card">
                <div class="practice-result-icon"><CheckCircle2 :size="28" /></div>
                <div class="practice-result-score">{{ mockCorrectCount }} / {{ mockQuestions.length }}</div>
                <h3>模拟考试已交卷</h3><p>正确率 {{ mockAccuracy }}% · 已作答 {{ mockAnsweredCount }} / {{ mockQuestions.length }} 题。</p>
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
                  <div class="question-topline"><span>第 {{ index + 1 }} / {{ mockQuestions.length }} 题 · {{ question.topic }}</span><span class="source-pill">{{ question.source_type === 'generated' ? '自编练习题' : question.source_type === 'official' ? '官方题目' : question.source_type === 'licensed' ? '授权题目' : '个人题目' }}</span></div>
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
            <section class="section-block practical-section">
              <div class="section-heading"><div><div class="section-kicker">PRACTICAL SCENARIOS</div><h2>实战演练</h2><p>在模拟的工作场景中做出决策，系统按数据库里的评分规则判分并保存结果。</p></div><span class="source-pill">情境练习 · 非官方真题</span></div>
              <p v-if="scenariosLoading" class="dictionary-status">正在从 D1 加载实战任务…</p>
              <p v-else-if="scenariosError" class="dictionary-status dictionary-error">{{ scenariosError }}</p>
              <div v-else-if="!scenarios.length" class="panel practice-start-card">
                <div class="practice-start-icon"><Target :size="25" /></div><h3>该考试暂时没有实战任务</h3>
                <p>目前实战情境先接入 SG。其他考试需要分别准备对应的任务和评分规则。</p>
              </div>
              <div v-else-if="currentScenario" class="panel scenario-card">
                <div class="scenario-toolbar">
                  <label>选择任务
                    <select v-model="selectedScenarioId" @change="selectedScenarioOption = ''; scenarioResult = null">
                      <option v-for="scenario in scenarios" :key="scenario.id" :value="scenario.id">{{ scenario.title }}</option>
                    </select>
                  </label>
                  <span class="source-pill">{{ currentScenario.category }}</span>
                </div>
                <h3>{{ currentScenario.title }}</h3>
                <div class="scenario-situation"><strong>情境</strong><p>{{ currentScenario.situation }}</p></div>
                <div class="scenario-task"><strong>你的任务</strong><p>{{ currentScenario.task }}</p></div>
                <div class="question-options scenario-options">
                  <button v-for="option in currentScenario.options" :key="option.id" class="question-option" :class="{ selected: selectedScenarioOption === option.id, correct: scenarioResult && option.id === scenarioResult.best_option, incorrect: scenarioResult && selectedScenarioOption === option.id && !scenarioResult.correct }" :disabled="!!scenarioResult" @click="selectedScenarioOption = option.id">
                    <span>{{ option.id.toUpperCase() }}</span><strong>{{ option.text }}</strong><CheckCircle2 v-if="scenarioResult && option.id === scenarioResult.best_option" :size="17" />
                  </button>
                </div>
                <div v-if="scenarioResult" class="scenario-feedback" :class="{ right: scenarioResult.correct }">
                  <div class="scenario-score">{{ scenarioResult.score }}<small> / 100</small></div>
                  <strong>{{ scenarioResult.correct ? '判断正确' : '复盘一下决策' }} · 最优选项 {{ scenarioResult.best_option.toUpperCase() }}</strong>
                  <p>{{ scenarioResult.feedback }}</p>
                  <button class="primary-button" @click="scenarioResult = null; selectedScenarioOption = ''">重新演练 <ArrowRight :size="15" /></button>
                </div>
                <div v-else class="question-actions">
                  <span class="question-hint">提交后由 Worker 根据 D1 评分规则判定并保存。</span>
                  <button class="primary-button" :disabled="!selectedScenarioOption || scenarioSubmitting" @click="submitScenario">{{ scenarioSubmitting ? '正在判定…' : '提交决策并复盘' }} <ArrowRight :size="15" /></button>
                </div>
                <small class="language-source">情境与评分规则：平台自编学习材料，存储于 D1。</small>
              </div>
            </section>
            <section class="exam-performance">
              <div class="section-heading"><div><div class="section-kicker">YOUR SCORE HISTORY</div><h2>正确率与历史成绩</h2><p>正式题库接入前，可以手动记录练习成绩；记录会保存在当前设备。</p></div><button class="primary-button" @click="addExamRecord"><PlusCircle :size="16" /> 记录一次练习成绩</button></div>
              <div class="metric-grid">
                <div class="panel metric-card"><span class="metric-icon"><CheckCircle2 :size="18" /></span><small>累计答题</small><strong>{{ totalAnswered }}</strong><span>道题</span></div>
                <div class="panel metric-card"><span class="metric-icon"><Target :size="18" /></span><small>总体正确率</small><strong>{{ overallAccuracy === null ? '—' : overallAccuracy + '%' }}</strong><span>{{ overallAccuracy === null ? '暂无成绩，记录后自动计算' : totalCorrect + ' 道答对' }}</span></div>
                <div class="panel metric-card"><span class="metric-icon"><TrendingUp :size="18" /></span><small>考试记录</small><strong>{{ examRecords.length }}</strong><span>次练习</span></div>
              </div>
              <div class="panel curve-panel">
                <div class="panel-heading"><div><h3>近 7 天正确率曲线</h3><p>每日答题正确率按题量加权计算，不存在记录的日期不绘制数据。</p></div><button v-if="examRecords.length" class="text-link" @click="removeExamRecords">清除记录</button></div>
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
            <div class="notice-card"><CircleHelp :size="19" /><div><strong>题库说明</strong><p>目前是平台框架阶段，尚未导入官方真题。接下来会先搭建 SG 的题目、答案解析、错题本与复习记录结构。</p></div></div>
          </section>
        </template>

        <template v-else-if="activeModule === 'language'">
          <section class="language-banner" :class="studyLanguage === 'ja' ? 'japanese' : 'english'">
            <div><span class="banner-tag">{{ studyLanguage === 'ja' ? '日本語 · JAPANESE' : 'ENGLISH · 英语' }}</span>
              <h2>{{ studyLanguage === 'ja' ? '学会真实场景里会说的话。' : 'Build confidence one useful phrase at a time.' }}</h2>
              <p>{{ studyLanguage === 'ja' ? '精选日常和职场表达，带读音、中文解释与实际例句。' : 'Practice daily and workplace English with examples, explanations and speech.' }}</p>
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
            <div class="language-category-filter" role="group" aria-label="按学习类别筛选">
              <button v-for="category in languageCategories" :key="category.title" :class="{ chosen: selectedLanguageCategory === category.title }" @click="selectedLanguageCategory = category.title">{{ category.title }}</button>
            </div>
            <p v-if="languageCardsLoading" class="dictionary-status">正在从学习内容库读取课程…</p>
            <p v-else-if="languageCardsError" class="dictionary-status dictionary-error">{{ languageCardsError }} 请先应用最新的 D1 数据库迁移。</p>
            <div v-else class="language-card-list">
              <article v-for="card in visibleLanguageCards" :key="card.id" class="language-study-card" :class="{ completed: completedLanguageCards.includes(card.id) }">
                <div class="language-card-top"><span class="dict-tag">{{ card.category }}</span><button class="language-done-button" @click="toggleLanguageCard(card.id)">{{ completedLanguageCards.includes(card.id) ? '已掌握 ✓' : '标记已掌握' }}</button></div>
                <h3>{{ card.term }}</h3>
                <p v-if="card.reading" class="language-reading">{{ card.reading }}</p>
                <p class="language-meaning">{{ card.meaning_zh }}</p>
                <p class="language-explanation">{{ card.explanation }}</p>
                <div class="language-example"><strong>例句</strong><p>{{ card.example }}</p><span>{{ card.example_meaning_zh }}</span></div>
                <button class="play-button" @click="speak(card.term, card.language === 'ja' ? 'ja-JP' : 'en-US')"><Volume2 :size="17" /> 听发音</button>
                <small class="language-source">平台自编学习内容</small>
              </article>
              <div v-if="!languageCardsLoading && !languageCardsError && visibleLanguageCards.length === 0" class="empty-state"><BookOpen :size="25" /><strong>这个分类暂时没有已发布的课程</strong><p>可以切换分类或语言，已掌握状态会保存在当前设备。</p></div>
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
              <button type="button" :class="{ chosen: dictSourceLang === 'auto' }" @click="dictSourceLang = 'auto'">自动识别</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'ja' }" @click="dictSourceLang = 'ja'">日语</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'en' }" @click="dictSourceLang = 'en'">英语</button>
              <button type="button" :class="{ chosen: dictSourceLang === 'zh' }" @click="dictSourceLang = 'zh'">中文</button>
            </div>
            <div class="search-box">
              <Search :size="19" />
              <input v-model="searchText" :placeholder="searchPlaceholder" @keyup.enter="lookupDictionary" />
              <button v-if="searchText" class="clear-search" @click="clearDictionarySearch">清空</button>
              <button class="dictionary-search-button" :disabled="dictionaryLoading" @click="lookupDictionary">{{ dictionaryLoading ? '查找中…' : '查词' }}</button>
            </div>
            <p>日常日语、英语单词、中文词语和 IT 专业术语都可以查。输入后按回车或点击“查词”获取在线词典结果。</p>
            <p v-if="dictionaryLoading" class="dictionary-status">正在查询在线词典…</p>
            <p v-else-if="dictionaryError" class="dictionary-status dictionary-error">{{ dictionaryError }}</p>
            <div v-if="!searchText.trim() && !dictionaryLoading" class="dictionary-quick-start"><span>试试查询</span><button @click="quickDictionarySearch('hello', 'en')">hello <small>英语</small></button><button @click="quickDictionarySearch('こんにちは', 'ja')">こんにちは <small>日语</small></button><button @click="quickDictionarySearch('認証', 'ja')">認証 <small>IT 术语</small></button><button @click="quickDictionarySearch('认证', 'zh')">认证 <small>中文</small></button></div>
          </section>
          <section class="section-block">
            <div class="section-heading"><div><div class="section-kicker">WORD BANK</div><h2>多语言词典</h2><p>中文释义 · 日语读音 · 英语解释 · 例句与发音</p></div><span class="section-index">{{ displayedEntries.length }} 个结果</span></div>
            <div class="dictionary-list">
              <article v-for="entry in displayedEntries" :key="entry.term + (entry.tag || '') + (entry.en || '')" class="dictionary-card">
                <div class="dict-main">
                  <div class="dict-term-row"><h3>{{ entry.term }}</h3><span v-if="entry.reading" class="reading">{{ entry.reading }}</span><span v-if="entry.phonetic" class="reading">{{ entry.phonetic }}</span><span class="dict-tag">{{ entry.tag }}</span><span v-if="entry.source" class="dict-source">{{ entry.source }}</span></div>
                  <div class="dict-en">{{ entry.en }}</div>
                  <p class="dictionary-translation-zh">中文：{{ entry.zh || '暂无中文翻译' }}</p>
                  <p v-if="entry.translationJa" class="dictionary-translation-ja">日语：{{ entry.translationJa }}</p>
                  <p v-if="entry.example" class="dict-example">例句：{{ entry.example }}</p>
                  <p v-if="entry.technical" class="dictionary-tech-note">来自 IT 专业词汇库</p>
                </div>
                <div class="dict-actions"><button class="round-action" @click="speak(entry.term, entry.language === 'en' ? 'en-US' : entry.language === 'zh' ? 'zh-CN' : 'ja-JP')" :aria-label="'播放' + entry.term"><Volume2 :size="17" /></button><button class="round-action" :class="{ saved: savedWords.includes(entry.term) }" @click="toggleSaved(entry.term)" :aria-label="(savedWords.includes(entry.term) ? '取消收藏' : '收藏') + entry.term"><Bookmark :size="17" /></button></div>
              </article>
              <div v-if="lastSearchedTerm.trim().toLowerCase() === searchText.trim().toLowerCase() && displayedEntries.length === 0 && !dictionaryLoading" class="empty-state"><Search :size="25" /><strong>没有找到匹配词条</strong><p>可更换源语言，或用短词查询。若第三方词典暂时不可用，稍后可重试。</p></div>
            </div>
          </section>
          </template>
          <section v-if="dictionaryView === 'saved'" class="section-block saved-vocabulary-block">
            <div class="section-heading"><div><div class="section-kicker">MY WORDS</div><h2>个人生词本</h2><p>收藏的词条会保存在这台设备的浏览器中。</p></div><span class="section-index">{{ savedWords.length }} 个收藏</span></div>
            <div v-if="savedVocabularyEntries.length" class="saved-vocabulary-list">
              <article v-for="entry in savedVocabularyEntries" :key="entry.term" class="saved-vocabulary-row">
                <div class="saved-vocabulary-copy"><strong>{{ entry.term }}</strong><small v-if="entry.reading">{{ entry.reading }}</small><p>{{ entry.zh }}</p><p v-if="entry.translationJa">日语：{{ entry.translationJa }}</p></div>
                <button class="round-action" @click="speak(entry.term, entry.language === 'en' ? 'en-US' : entry.language === 'zh' ? 'zh-CN' : 'ja-JP')" :aria-label="'播放' + entry.term"><Volume2 :size="16" /></button>
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
