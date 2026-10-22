<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BookOpen, Languages, Search, Headphones, BriefcaseBusiness, GraduationCap,
  ChevronRight, Sparkles, Clock3, Flame, Bookmark, Volume2, ArrowRight,
  ShieldCheck, BookMarked, Menu, X, CheckCircle2, CircleHelp, Target, TrendingUp, ListChecks, PlusCircle,
} from 'lucide-vue-next'

type ModuleId = 'home' | 'exam' | 'japanese' | 'english' | 'dictionary'
const activeModule = ref<ModuleId>('home')
const searchText = ref('')
const showMobileMenu = ref(false)
const savedWords = ref<string[]>(['認証', 'authorization'])
const activeLang = ref<'zh' | 'ja' | 'en'>('zh')

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
const quizStartedAt = ref(0)
const quizFinished = ref(false)
const currentQuestion = computed(() => quizQuestions.value[quizIndex.value] || null)
const isLastQuestion = computed(() => quizIndex.value >= quizQuestions.value.length - 1)
async function startPractice() {
  quizLoading.value = true
  quizError.value = ''
  try {
    const response = await fetch('/api/questions?track=exam-sg&limit=10')
    const data = await response.json() as { items?: PracticeQuestion[]; error?: string }
    if (!response.ok) throw new Error(data.error || '题库加载失败')
    if (!data.items?.length) throw new Error('当前还没有可练习的题目，请先完成 D1 数据库迁移。')
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
}
function nextPracticeQuestion() {
  if (!isLastQuestion.value) {
    quizIndex.value += 1
    selectedOption.value = ''
    quizSubmitted.value = false
    return
  }
  const total = quizQuestions.value.length
  examRecords.value.push({
    date: todayKey,
    correct: quizCorrect.value,
    total,
    exam: 'SG',
  })
  quizFinished.value = true
}

const moduleInfo = {
  home: { title: '今天，学一点新的。', subtitle: '把考试、语言和专业知识，放进一个顺手的学习空间。' },
  exam: { title: '考试备考', subtitle: '按考试、科目和知识点组织练习，错题会自动进入复习清单。' },
  japanese: { title: '日语学习', subtitle: '从真实场景出发，练习自然表达、职场沟通与听说读写。' },
  english: { title: '英语学习', subtitle: '练听力、发音、表达与 IT 英语，逐步说得更自然。' },
  dictionary: { title: '多语言词典', subtitle: '把中文、日语、英语和 IT 术语连起来，随查随记。' },
} as const

const currentInfo = computed(() => moduleInfo[activeModule.value])
const searchPlaceholder = computed(() => activeModule.value === 'dictionary' ? '查词、查缩写，例如 MFA / 認証…' : '搜索考试、课程、知识点…')

const modules = [
  { id: 'exam' as const, title: '考试备考', en: 'EXAM PREP', desc: 'SG · FE · AP · 自定义考试', icon: GraduationCap, tone: 'lavender', count: '按知识点练习' },
  { id: 'japanese' as const, title: '日语学习', en: 'JAPANESE', desc: '会话 · 敬语 · 语法 · 听力', icon: Languages, tone: 'peach', count: '适合日常与职场' },
  { id: 'english' as const, title: '英语学习', en: 'ENGLISH', desc: '口语 · 发音 · 阅读 · 写作', icon: Headphones, tone: 'mint', count: '循序渐进地练习' },
  { id: 'dictionary' as const, title: '词典与 IT 术语', en: 'DICTIONARY', desc: '中日英词义 · 例句 · 缩写', icon: BookMarked, tone: 'blue', count: '建立个人生词本' },
]

const languageCategories = [
  { title: '日常与情景会话', desc: '购物、出行、看病、生活沟通', icon: Languages },
  { title: '职场与商务语言', desc: '会议、邮件、汇报、面试', icon: BriefcaseBusiness },
  { title: '词汇与语法', desc: '词义、搭配、句型与易错点', icon: BookOpen },
  { title: '听力与口语', desc: '跟读、听写、发音与角色扮演', icon: Headphones },
  { title: '阅读与写作', desc: '短文理解、表达修改与写作', icon: BookMarked },
  { title: '能力测评与复习', desc: '阶段检查、错题与间隔复习', icon: ShieldCheck },
]

const examTracks = [
  { code: 'SG', name: '信息安全管理考试', detail: '情報セキュリティマネジメント試験', progress: 0, color: 'purple' },
  { code: 'FE', name: '基本信息技术者考试', detail: '基本情報技術者試験', progress: 0, color: 'blue' },
  { code: 'AP', name: '应用信息技术者考试', detail: '応用情報技術者試験', progress: 0, color: 'green' },
]

const dictionaryEntries = [
  { term: '認証', reading: 'にんしょう', en: 'Authentication', zh: '认证：确认“你是谁”', tag: '安全基础' },
  { term: '認可', reading: 'にんか', en: 'Authorization', zh: '授权：确认“你可以做什么”', tag: '安全基础' },
  { term: '多要素認証', reading: 'たようそにんしょう', en: 'Multi-factor authentication (MFA)', zh: '多因素认证：结合不同类别的验证因素', tag: 'SG 高频' },
]
const filteredEntries = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return dictionaryEntries
  return dictionaryEntries.filter((item) => [item.term, item.reading, item.en, item.zh].some((v) => v.toLowerCase().includes(q)))
})

function navigate(id: ModuleId) {
  activeModule.value = id
  showMobileMenu.value = false
  searchText.value = ''
}

function toggleSaved(term: string) {
  savedWords.value = savedWords.value.includes(term)
    ? savedWords.value.filter((word) => word !== term)
    : [...savedWords.value, term]
}

// 使用浏览器内置语音，不调用付费语音接口；具体声音取决于设备和浏览器。
function speak(text: string, lang: 'ja-JP' | 'en-US' = 'ja-JP') {
  if (!('speechSynthesis' in window)) {
    window.alert('当前浏览器暂不支持语音播放。')
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.88
  window.speechSynthesis.speak(utterance)
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
          <div class="lang-switch" aria-label="界面语言">
            <button :class="{ chosen: activeLang === 'zh' }" @click="activeLang = 'zh'">中</button>
            <button :class="{ chosen: activeLang === 'ja' }" @click="activeLang = 'ja'">日</button>
            <button :class="{ chosen: activeLang === 'en' }" @click="activeLang = 'en'">EN</button>
          </div>
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
                  <input v-model="task.done" type="checkbox" />
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
              <div v-for="entry in dictionaryEntries.slice(0, 2)" :key="entry.term" class="word-row">
                <div class="word-letter">{{ entry.term.slice(0,1) }}</div><div class="word-details"><strong>{{ entry.term }} <small>{{ entry.reading }}</small></strong><span>{{ entry.en }}</span></div>
                <button class="round-action" @click="speak(entry.term)" aria-label="播放发音"><Volume2 :size="17" /></button>
              </div>
            </div>
            <div class="panel daily-panel">
              <div class="daily-icon"><Clock3 :size="19" /></div><div class="daily-copy"><div class="section-kicker">A SMALL DAILY GOAL</div><h3>给今天设一个小目标</h3><p>做 5 道题、听 3 分钟，或记住一个新词，都很好。</p><button class="text-link" @click="navigate('japanese')">开始轻量练习 <ArrowRight :size="14" /></button></div>
            </div>
          </section>
        </template>

        <template v-else-if="activeModule === 'exam'">
          <section class="section-block module-page-section">
            <div class="section-heading"><div><div class="section-kicker">YOUR EXAM ROADMAP</div><h2>选择要准备的考试</h2><p>题库会明确标注官方来源、授权题目或练习题，不混淆真题与生成题。</p></div><span class="section-index">EXAM</span></div>
            <div class="exam-list">
              <button v-for="exam in examTracks" :key="exam.code" class="exam-card" @click="searchText = exam.code">
                <span class="exam-code" :class="exam.color">{{ exam.code }}</span><span class="exam-info"><strong>{{ exam.name }}</strong><small>{{ exam.detail }}</small><span class="progress-track"><span :style="{ width: exam.progress + '%' }"></span></span></span><span class="exam-progress">{{ exam.progress ? exam.progress + '%' : '未开始' }}</span><ChevronRight :size="18" class="muted" />
              </button>
            </div>


            <section class="practice-section">
              <div class="section-heading"><div><div class="section-kicker">SG PRACTICE ROOM</div><h2>SG 练习题</h2><p>第一批 5 道自编示范题，用于搭建答题、判分和解析流程；不是官方真题。</p></div><span class="source-pill">自编练习题</span></div>
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
                  <h3>准备好做一组 SG 练习了吗？</h3>
                  <p>从 D1 读取题目，答题后显示正确答案、日语解释和错误选项辨析。</p>
                  <button class="primary-button" @click="startPractice" :disabled="quizLoading">{{ quizLoading ? '正在加载题目…' : '开始练习（最多 10 题）' }} <ArrowRight :size="16" /></button>
                  <p v-if="quizError" class="practice-error">{{ quizError }}</p>
                </template>
              </div>
              <div v-else-if="currentQuestion" class="panel question-card">
                <div class="question-topline"><span>第 {{ quizIndex + 1 }} / {{ quizQuestions.length }} 题</span><span class="source-pill">自编练习题</span></div>
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

        <template v-else-if="activeModule === 'japanese' || activeModule === 'english'">
          <section class="language-banner" :class="activeModule">
            <div><span class="banner-tag">{{ activeModule === 'japanese' ? '日本語 · JAPANESE' : 'ENGLISH · 英语' }}</span><h2>{{ activeModule === 'japanese' ? '让表达更自然，让理解更快。' : 'Speak with more confidence.' }}</h2><p>{{ activeModule === 'japanese' ? '从日常对话到职场沟通，积累真正用得上的表达。' : 'Practice everyday conversation, listening, pronunciation and IT English.' }}</p></div>
            <div class="banner-decoration"><Languages :size="64" stroke-width="1.1" /></div>
          </section>
          <section class="section-block">
            <div class="section-heading"><div><div class="section-kicker">LEARNING PATH</div><h2>选择一个练习方向</h2><p>日语和英语采用相同的分类结构，内容和发音规则则分别适配对应语言。</p></div></div>
            <div class="category-grid">
              <button v-for="(category, i) in languageCategories" :key="category.title" class="category-card" @click="searchText = category.title">
                <span class="category-number">0{{ i + 1 }}</span><span class="category-icon"><component :is="category.icon" :size="20" /></span><h3>{{ category.title }}</h3><p>{{ category.desc }}</p><ArrowRight :size="16" class="category-arrow" />
              </button>
            </div>
          </section>
          <section class="panel phrase-panel"><div class="panel-heading"><div><h3>{{ activeModule === 'japanese' ? '职场表达小练习' : 'Useful phrase of the day' }}</h3><p>先听一遍，再试着跟读。</p></div><span class="practice-badge">轻量练习</span></div>
            <div class="phrase-content"><div><span class="phrase-label">{{ activeModule === 'japanese' ? '日本語' : 'ENGLISH' }}</span><h2>{{ activeModule === 'japanese' ? '確認してから、ご連絡します。' : 'I’ll check and get back to you.' }}</h2><p>{{ activeModule === 'japanese' ? '确认之后，我再联系您。' : '我确认一下，再回复你。' }}</p></div><button class="play-button" @click="speak(activeModule === 'japanese' ? '確認してから、ご連絡します。' : 'I’ll check and get back to you.', activeModule === 'japanese' ? 'ja-JP' : 'en-US')"><Volume2 :size="20" /> 听发音</button></div>
          </section>
        </template>

        <template v-else>
          <section class="dictionary-search">
            <div class="search-box"><Search :size="19" /><input v-model="searchText" :placeholder="searchPlaceholder" @keyup.enter="activeLang = activeLang" /><button v-if="searchText" class="clear-search" @click="searchText = ''">清空</button></div>
            <p>支持日语汉字、假名、英文术语与中文释义搜索。当前展示的是明确标注的内置示例词条。</p>
          </section>
          <section class="section-block">
            <div class="section-heading"><div><div class="section-kicker">WORD BANK</div><h2>词条与 IT 专业术语</h2><p>中文理解 · 日语读音 · 英文术语 · 关联知识</p></div><span class="section-index">{{ filteredEntries.length }} 个词条</span></div>
            <div class="dictionary-list">
              <article v-for="entry in filteredEntries" :key="entry.term" class="dictionary-card">
                <div class="dict-main"><div class="dict-term-row"><h3>{{ entry.term }}</h3><span class="reading">{{ entry.reading }}</span><span class="dict-tag">{{ entry.tag }}</span></div><div class="dict-en">{{ entry.en }}</div><p>{{ entry.zh }}</p></div>
                <div class="dict-actions"><button class="round-action" @click="speak(entry.term)" :aria-label="'播放' + entry.term"><Volume2 :size="17" /></button><button class="round-action" :class="{ saved: savedWords.includes(entry.term) }" @click="toggleSaved(entry.term)" :aria-label="'收藏' + entry.term"><Bookmark :size="17" /></button></div>
              </article>
              <div v-if="filteredEntries.length === 0" class="empty-state"><Search :size="25" /><strong>没有找到匹配词条</strong><p>可以换个关键词，或之后把新词加入个人词典。</p></div>
            </div>
          </section>
          <section class="notice-card dictionary-notice"><BookMarked :size="19" /><div><strong>个人生词本</strong><p>已收藏 {{ savedWords.length }} 个词条。当前收藏暂存在本页面状态中；后续会接入持久化存储和跨模块复习。</p></div></section>
        </template>

        <footer class="footer"><span>知学 · 把每天的小进步，累积成自己的能力。</span><span>Vue 3 · TypeScript · Cloudflare</span></footer>
      </div>
    </main>
  </div>
</template>
