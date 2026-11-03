<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { dailyGrammarLesson, previousGrammarLesson, type GrammarLanguage } from './daily-grammar-lessons'
import {
  validGrammarAnswers, parseGrammarCloud, mergeGrammarCloud, pendingGrammarAnswers,
  loadGrammarOffline, saveGrammarOffline,
} from './offline-grammar-store'

const props = defineProps<{ language: GrammarLanguage; studyDate: string; authenticated: boolean }>()
const emit = defineEmits<{ speak: [text: string, language: 'ja-JP' | 'en-US'] }>()
const today = computed(() => dailyGrammarLesson(props.studyDate, props.language))
const previous = computed(() => previousGrammarLesson(props.studyDate, props.language))
const questions = computed(() => [
  ...today.value.questions.map((question, index) => ({
    ...question, id: today.value.id + ':today:' + index, label: '今日语法',
  })),
  ...previous.value.questions.slice(0, 1).map((question, index) => ({
    ...question, id: previous.value.id + ':review:' + index, label: '昨日复习',
  })),
])
const storageKey = computed(() => 'zhixue:daily-grammar-v1:' + props.studyDate + ':' + props.language)
const answers = ref<Record<string, number>>({})
const cloudAnswers = ref<Record<string, number>>({})
const syncMessage = ref('本机离线保存')
let generation = 0
let syncing = false
let syncAgain = false
let syncTimer: ReturnType<typeof setTimeout> | undefined

function persist() {
  const safe = validGrammarAnswers(answers.value, questions.value)
  try { localStorage.setItem(storageKey.value, JSON.stringify(safe)) } catch { /* private mode fallback */ }
  void saveGrammarOffline(storageKey.value, safe)
}
async function syncCloud(run: number, readFirst: boolean) {
  if (!props.authenticated || run !== generation) return
  if (syncing) { syncAgain = true; return }
  syncing = true
  syncMessage.value = '正在同步…'
  try {
    if (readFirst) {
      const response = await fetch('/api/grammar-progress?date=' + encodeURIComponent(props.studyDate) +
        '&language=' + encodeURIComponent(props.language), { cache: 'no-store' })
      if (!response.ok) throw new Error('云端练习记录暂不可用。')
      const data = await response.json() as { items?: unknown }
      if (run !== generation || !props.authenticated) return
      cloudAnswers.value = parseGrammarCloud(data.items, questions.value)
      answers.value = mergeGrammarCloud(answers.value, cloudAnswers.value, questions.value)
      persist()
    }
    const pending = pendingGrammarAnswers(answers.value, cloudAnswers.value, questions.value)
    if (pending.length) {
      const response = await fetch('/api/grammar-progress', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: props.studyDate, language: props.language, answers: pending }),
      })
      if (!response.ok) throw new Error('网络或云端服务暂不可用。')
      const data = await response.json() as { items?: unknown }
      if (run !== generation || !props.authenticated) return
      cloudAnswers.value = parseGrammarCloud(data.items, questions.value)
      answers.value = mergeGrammarCloud(answers.value, cloudAnswers.value, questions.value)
      persist()
    }
    if (run === generation) syncMessage.value = '云端已同步'
  } catch {
    if (run === generation) syncMessage.value = '已保存在本机，联网后可重试同步'
  } finally {
    syncing = false
    if (syncAgain) {
      syncAgain = false
      if (props.authenticated) void syncCloud(generation, true)
    }
  }
}
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer)
  if (!props.authenticated) return
  syncMessage.value = '本机已保存 · 等待批量同步'
  const run = generation
  // Coalesce multiple answers into at most one indexed D1 write request.
  syncTimer = setTimeout(() => { void syncCloud(run, false) }, 1800)
}
async function restore() {
  const run = ++generation
  if (syncTimer) clearTimeout(syncTimer)
  cloudAnswers.value = {}
  syncMessage.value = props.authenticated ? '正在读取进度…' : '本机离线保存'
  let local: unknown = null
  try { local = JSON.parse(localStorage.getItem(storageKey.value) || '{}') } catch { /* optional */ }
  answers.value = validGrammarAnswers(local, questions.value)
  const saved = await loadGrammarOffline(storageKey.value)
  if (run !== generation) return
  // Immediate localStorage writes take precedence over an older IDB transaction.
  answers.value = mergeGrammarCloud(validGrammarAnswers(saved, questions.value), answers.value, questions.value)
  persist()
  if (props.authenticated) void syncCloud(run, true)
}
function answer(questionId: string, optionIndex: number) {
  if (Object.prototype.hasOwnProperty.call(answers.value, questionId)) return
  const question = questions.value.find(item => item.id === questionId)
  if (!question || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) return
  answers.value = { ...answers.value, [questionId]: optionIndex }
  persist()
  scheduleSync()
}
function isAnswered(id: string) {
  return Object.prototype.hasOwnProperty.call(answers.value, id)
}
const finished = computed(() => questions.value.filter(question => isAnswered(question.id)).length)
const correct = computed(() => questions.value.filter(question => isAnswered(question.id) && answers.value[question.id] === question.correct).length)
function onBackOnline() { if (props.authenticated) void syncCloud(generation, true) }
watch([storageKey, () => props.authenticated], () => { void restore() }, { immediate: true })
onMounted(() => window.addEventListener('online', onBackOnline))
onUnmounted(() => {
  generation++
  if (syncTimer) clearTimeout(syncTimer)
  window.removeEventListener('online', onBackOnline)
})
</script>

<template>
  <section class="section-block daily-grammar" aria-label="每日语法与练习">
    <div class="section-heading">
      <div>
        <h2>{{ language === 'en' ? 'TOEIC 英语语法与练习' : '实用日语语法与练习' }}</h2>
        <p>每日 1 个语法重点 · 2 道新题 + 1 道昨日复习 · 原创练习，非官方考题</p>
      </div>
    </div>
    <article class="daily-grammar-topic">
      <div class="daily-grammar-topic-top"><span class="dict-tag">今日语法</span><span class="language-source">{{ studyDate }}</span></div>
      <h3>{{ today.point }}</h3>
      <p class="daily-grammar-meaning">{{ today.zh }}</p>
      <p class="daily-grammar-ja">{{ today.ja }}</p>
      <p class="daily-grammar-form">{{ today.form }}</p>
      <div class="daily-grammar-example">
        <span class="language-source">例句</span>
        <p>{{ today.example }}</p>
        <p class="daily-grammar-meaning">{{ today.translation }}</p>
        <button type="button" class="play-button" @click="emit('speak', today.example, language === 'ja' ? 'ja-JP' : 'en-US')">听例句</button>
      </div>
      <p class="daily-grammar-tip">{{ today.tipZh }}</p>
      <p class="daily-grammar-ja">{{ today.tipJa }}</p>
      <p class="daily-grammar-review-tip">昨日复习：{{ previous.point }} · {{ previous.zh }}</p>
    </article>
    <div class="daily-grammar-status" role="status" aria-live="polite">今日练习 {{ finished }} / {{ questions.length }} · 答对 {{ correct }} 题 <span>{{ syncMessage }}</span></div>
    <div class="daily-grammar-exercises">
      <article v-for="(question, index) in questions" :key="question.id" class="daily-grammar-exercise">
        <div class="daily-grammar-exercise-head"><span class="dict-tag">{{ question.label }}</span><small>第 {{ index + 1 }} 题</small></div>
        <p class="daily-grammar-prompt">{{ question.prompt }}</p>
        <div class="daily-grammar-options" role="group" :aria-label="'语法练习第 ' + (index + 1) + ' 题的选项'">
          <button v-for="(option, optionIndex) in question.options" :key="optionIndex" type="button"
            :disabled="isAnswered(question.id)"
            :class="{ selected: answers[question.id] === optionIndex, correct: isAnswered(question.id) && question.correct === optionIndex, incorrect: answers[question.id] === optionIndex && question.correct !== optionIndex }"
            @click="answer(question.id, optionIndex)">{{ String.fromCharCode(65 + optionIndex) }}. {{ option }}</button>
        </div>
        <div v-if="isAnswered(question.id)" class="daily-grammar-feedback" role="status">
          <strong>{{ answers[question.id] === question.correct ? '回答正确' : '再记住这个规则' }} · 正确答案 {{ String.fromCharCode(65 + question.correct) }}</strong>
          <p>{{ question.whyZh }}</p>
          <p class="daily-grammar-ja">{{ question.whyJa }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
