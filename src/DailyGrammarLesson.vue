<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { dailyGrammarLesson, previousGrammarLesson, type GrammarLanguage } from './daily-grammar-lessons'

const props = defineProps<{ language: GrammarLanguage; studyDate: string }>()
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
function restore() {
  let stored: unknown
  try { stored = JSON.parse(localStorage.getItem(storageKey.value) || '{}') } catch { stored = {} }
  const valid: Record<string, number> = {}
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    for (const question of questions.value) {
      const selected = (stored as Record<string, unknown>)[question.id]
      if (typeof selected === 'number' && Number.isInteger(selected) && selected >= 0 && selected < question.options.length) {
        valid[question.id] = selected
      }
    }
  }
  answers.value = valid
}
watch(storageKey, restore, { immediate: true })
function answer(questionId: string, optionIndex: number) {
  if (Object.prototype.hasOwnProperty.call(answers.value, questionId)) return
  const question = questions.value.find(item => item.id === questionId)
  if (!question || optionIndex < 0 || optionIndex >= question.options.length) return
  answers.value = { ...answers.value, [questionId]: optionIndex }
  try { localStorage.setItem(storageKey.value, JSON.stringify(answers.value)) }
  catch { /* browser storage may be unavailable; keep the session's answers */ }
}
function isAnswered(id: string) {
  return Object.prototype.hasOwnProperty.call(answers.value, id)
}
const finished = computed(() => questions.value.filter(question => isAnswered(question.id)).length)
const correct = computed(() => questions.value.filter(question => isAnswered(question.id) && answers.value[question.id] === question.correct).length)
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
    <div class="daily-grammar-status" role="status" aria-live="polite">今日练习 {{ finished }} / {{ questions.length }} · 答对 {{ correct }} 题 <span>仅保存在本机，不额外查询 D1</span></div>
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
