<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { dailyListeningScenes, type ListeningLanguage, type ListeningScene } from './daily-dialogue-listening'

const props = defineProps<{
  language: ListeningLanguage
  studyDate: string
  audioStatus: string
  audioStatusTarget: string
  audioPlaying: boolean
  audioPaused: boolean
}>()
const emit = defineEmits<{
  speak: [text: string, lang: 'ja-JP' | 'en-US', target: string]
  pause: []
  stop: []
}>()
const scenes = computed(() => dailyListeningScenes(props.studyDate, props.language))
const storageKey = computed(() => 'zhixue:daily-listening-v1:' + props.studyDate + ':' + props.language)
const answers = ref<Record<string, number>>({})
const revealed = ref<Record<string, boolean>>({})
function restore() {
  let raw: unknown
  try { raw = JSON.parse(localStorage.getItem(storageKey.value) || '{}') } catch { raw = {} }
  const valid: Record<string, number> = {}
  for (const scene of scenes.value) {
    const value = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)[scene.id] : undefined
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < scene.options.length)
      valid[scene.id] = value
  }
  answers.value = valid
  revealed.value = {}
}
watch(storageKey, restore, { immediate: true })
function isAnswered(id: string) {
  return Object.prototype.hasOwnProperty.call(answers.value,id)
}
function answer(scene: ListeningScene, selected: number) {
  if (isAnswered(scene.id) || !Number.isInteger(selected) || selected < 0 || selected >= scene.options.length) return
  answers.value = {...answers.value,[scene.id]:selected}
  revealed.value = {...revealed.value,[scene.id]:true}
  try { localStorage.setItem(storageKey.value, JSON.stringify(answers.value)) }
  catch { /* retain the in-memory result if browser storage is unavailable */ }
}
function play(scene: ListeningScene, turnIndex?: number) {
  const content = turnIndex === undefined ? scene.turns.map(turn => turn.text).join(' ') : scene.turns[turnIndex]?.text
  if (!content) return
  emit('speak', content, props.language === 'ja' ? 'ja-JP' : 'en-US', 'daily-listening:' + scene.id)
}
const finished = computed(() => scenes.value.filter(scene => isAnswered(scene.id)).length)
const correct = computed(() => scenes.value.filter(scene => isAnswered(scene.id) && answers.value[scene.id] === scene.correct).length)
</script>

<template>
  <section class="section-block daily-listening" aria-label="每日听力与跟读">
    <div class="section-heading"><div>
      <h2>每日听力与跟读</h2>
      <p>每天日常、职场各一段对话 · 先听后答 · 设备合成朗读，不做录音评分</p>
    </div></div>
    <p class="daily-listening-summary" role="status">完成 {{ finished }} / {{ scenes.length }} · 答对 {{ correct }} · 答题结果保存在本机</p>
    <div class="daily-listening-scenes">
      <article v-for="scene in scenes" :key="scene.id" class="daily-listening-card">
        <div class="daily-listening-top"><span class="dict-tag">{{ scene.category }}</span><span class="language-source">原创双人对话</span></div>
        <h3>{{ scene.category === '日常句子' ? '生活情境听力' : '职场沟通听力' }}</h3>
        <div class="daily-listening-audio">
          <button type="button" class="play-button" @click="play(scene)">播放对话</button>
          <button v-if="!(isAnswered(scene.id) || revealed[scene.id])" type="button" class="secondary-button" @click="revealed = {...revealed,[scene.id]:true}">显示原文</button>
        </div>
        <div v-if="audioStatus && audioStatusTarget === 'daily-listening:' + scene.id" class="dictionary-speech-controls" role="status" aria-live="polite">
          <p class="dictionary-status">{{ audioStatus }}</p>
          <button v-if="audioPlaying || audioPaused" type="button" class="text-link" @click="emit('pause')">{{ audioPaused ? '继续播放' : '暂停' }}</button>
          <button v-if="audioPlaying || audioPaused" type="button" class="text-link" @click="emit('stop')">停止</button>
        </div>
        <p class="daily-listening-question">{{ scene.questionZh }}</p>
        <div class="daily-listening-options" role="group" :aria-label="scene.category + '听力题选项'">
          <button v-for="(option, index) in scene.options" :key="index" type="button"
            :disabled="isAnswered(scene.id)"
            :class="{ selected: answers[scene.id] === index, correct: isAnswered(scene.id) && scene.correct === index, incorrect: answers[scene.id] === index && scene.correct !== index }"
            @click="answer(scene,index)">{{ String.fromCharCode(65 + index) }}. {{ option }}</button>
        </div>
        <div v-if="isAnswered(scene.id)" class="daily-listening-feedback" role="status">
          <strong>{{ answers[scene.id] === scene.correct ? '答对了' : '复习一下听力信息' }} · {{ String.fromCharCode(65 + scene.correct) }}</strong>
          <p>{{ scene.whyZh }}</p><p class="daily-grammar-ja">{{ scene.whyJa }}</p>
        </div>
        <div v-if="revealed[scene.id] || isAnswered(scene.id)" class="daily-listening-transcript">
          <strong>原文与跟读</strong>
          <div v-for="(turn, index) in scene.turns" :key="index" class="daily-listening-turn">
            <span class="language-source">{{ turn.speaker }}</span>
            <p>{{ turn.text }}</p><p class="daily-grammar-ja">{{ turn.zh }}</p>
            <button type="button" class="text-link" @click="play(scene,index)">听这一句并跟读</button>
          </div>
          <p class="daily-listening-focus">重点：{{ scene.focusZh }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
