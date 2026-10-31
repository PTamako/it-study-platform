<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { Calculator, PenLine, Eraser, Undo2, Trash2, Download } from 'lucide-vue-next'
import { evaluateScratchExpression, formatScratchResult } from './scratch-calculator'

const calculatorOpen = ref(false)
const boardOpen = ref(false)
const expression = ref('')
const calculationError = ref('')
const answered = ref(false)
const result = ref('')
const keys = [
  ['C', 'clear'], ['⌫', 'backspace'], ['(', '('], [')', ')'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'],
  ['0', '0'], ['.', '.'], ['%', '%'], ['+', '+'],
  ['=', 'equals'],
] as const

function pressCalculator(key: string) {
  calculationError.value = ''
  if (key === 'clear') { expression.value = ''; result.value = ''; answered.value = false; return }
  if (key === 'backspace') {
    expression.value = expression.value.slice(0, -1)
    answered.value = false
    result.value = ''
    return
  }
  if (key === 'equals') {
    try {
      result.value = formatScratchResult(evaluateScratchExpression(expression.value))
      expression.value = result.value
      answered.value = true
    } catch (error) {
      calculationError.value = error instanceof Error ? error.message : '计算失败'
    }
    return
  }
  if (expression.value.length >= 100) return
  if (answered.value && /[0-9.(]/.test(key)) expression.value = ''
  answered.value = false
  result.value = ''
  if (key === '.' && /(?:^|[+\-*/(])$/.test(expression.value)) expression.value += '0'
  if (key === '.' && /\d*\.\d*$/.test(expression.value)) return
  expression.value += key
}
function calculatorKeydown(event: KeyboardEvent) {
  const key = event.key
  const mapped = key === 'Enter' || key === '=' ? 'equals'
    : key === 'Backspace' ? 'backspace'
    : key === 'Escape' ? 'clear'
    : key === 'x' || key === 'X' ? '*'
    : key === ',' ? '.' : key
  if (/^[0-9.+\-*/()%]$/.test(mapped) || ['equals', 'backspace', 'clear'].includes(mapped)) {
    event.preventDefault()
    pressCalculator(mapped)
  }
}

type Point = { x: number; y: number }
type Stroke = { points: Point[]; color: string; width: number; eraser: boolean }
const boardRef = ref<HTMLCanvasElement | null>(null)
const strokes = ref<Stroke[]>([])
const ink = ref('#25314b')
const thickness = ref(3)
const erasing = ref(false)
let activeStroke: Stroke | null = null
let activePointer: number | null = null
let resizeObserver: ResizeObserver | null = null
function clamp(value: number) { return Math.max(0, Math.min(1, value)) }
function getPoint(event: PointerEvent, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect()
  return { x: clamp((event.clientX - rect.left) / Math.max(1, rect.width)),
    y: clamp((event.clientY - rect.top) / Math.max(1, rect.height)) }
}
function drawSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, from: Point, to: Point, width: number, height: number) {
  ctx.save()
  ctx.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
  ctx.lineWidth = stroke.width
  if (from === to) {
    ctx.beginPath()
    ctx.arc(to.x * width, to.y * height, stroke.width / 2, 0, 2 * Math.PI)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(from.x * width, from.y * height)
    ctx.lineTo(to.x * width, to.y * height)
    ctx.stroke()
  }
  ctx.restore()
}
function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) {
  for (let i = 0; i < stroke.points.length; i++) {
    const to = stroke.points[i]
    drawSegment(ctx, stroke, stroke.points[i - 1] || to, to, width, height)
  }
}
function repaint() {
  const canvas = boardRef.value
  if (!canvas) return
  const bounds = canvas.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const pixelWidth = Math.max(1, Math.round(bounds.width * dpr))
  const pixelHeight = Math.max(1, Math.round(bounds.height * dpr))
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, bounds.width, bounds.height)
  for (const stroke of strokes.value) paintStroke(ctx, stroke, bounds.width, bounds.height)
  if (activeStroke) paintStroke(ctx, activeStroke, bounds.width, bounds.height)
}
function pointerDown(event: PointerEvent) {
  const canvas = boardRef.value
  if (!canvas || activePointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
  activePointer = event.pointerId
  activeStroke = { points: [getPoint(event, canvas)], color: ink.value,
    width: erasing.value ? thickness.value * 5 : thickness.value, eraser: erasing.value }
  try { canvas.setPointerCapture(event.pointerId) } catch { /* drawing still works without capture */ }
  event.preventDefault()
  repaint()
}
function pointerMove(event: PointerEvent) {
  const canvas = boardRef.value
  if (!canvas || activePointer !== event.pointerId || !activeStroke) return
  const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [event]
  const samples = events.length ? events : [event]
  const ctx = canvas.getContext('2d')
  const bounds = canvas.getBoundingClientRect()
  for (const sample of samples) {
    const previous = activeStroke.points[activeStroke.points.length - 1]
    const point = getPoint(sample, canvas)
    if (point.x === previous.x && point.y === previous.y) continue
    activeStroke.points.push(point)
    if (ctx) drawSegment(ctx, activeStroke, previous, point, bounds.width, bounds.height)
  }
  event.preventDefault()
}
function pointerEnd(event: PointerEvent) {
  if (activePointer !== event.pointerId) return
  const canvas = boardRef.value
  if (activeStroke) strokes.value.push(activeStroke)
  activeStroke = null
  activePointer = null
  if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  event.preventDefault()
}
function undoStroke() {
  if (!strokes.value.length) return
  strokes.value.pop()
  repaint()
}
function clearBoard() {
  if (!strokes.value.length || window.confirm('清空这道题的草稿？')) {
    strokes.value = []
    repaint()
  }
}
function saveBoard() {
  const visible = boardRef.value
  if (!visible || !strokes.value.length) return
  const bounds = visible.getBoundingClientRect()
  const output = document.createElement('canvas')
  const scale = 2
  output.width = Math.round(bounds.width * scale)
  output.height = Math.round(bounds.height * scale)
  const ctx = output.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)
  for (const stroke of strokes.value) paintStroke(ctx, stroke, bounds.width, bounds.height)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, bounds.width, bounds.height)
  ctx.globalCompositeOperation = 'source-over'
  output.toBlob(blob => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = '知学-草稿.png'
    anchor.click()
    // Release the temporary file URL after the browser has consumed it.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
watch(boardOpen, async open => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!open) return
  await nextTick()
  const canvas = boardRef.value
  if (!canvas || !boardOpen.value) return
  resizeObserver = new ResizeObserver(repaint)
  resizeObserver.observe(canvas)
  repaint()
})
onUnmounted(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="exam-scratch-tools" aria-label="答题辅助工具">
    <div class="scratch-toggle-row">
      <span class="scratch-tools-caption">辅助工具</span>
      <button type="button" class="scratch-toggle-button" :class="{ active: calculatorOpen }"
        :aria-expanded="calculatorOpen" @click="calculatorOpen = !calculatorOpen">
        <Calculator :size="16" /> 计算器
      </button>
      <button type="button" class="scratch-toggle-button" :class="{ active: boardOpen }"
        :aria-expanded="boardOpen" @click="boardOpen = !boardOpen">
        <PenLine :size="16" /> 草稿白板
      </button>
    </div>
    <div v-if="calculatorOpen" class="scratch-calculator" aria-label="计算器">
      <input class="scratch-calculator-display" :value="expression.replace(/\*/g, '×').replace(/\//g, '÷') || '0'"
        type="text" aria-label="计算器算式，支持键盘输入" readonly @keydown="calculatorKeydown" />
      <p v-if="calculationError" class="scratch-calculator-error" role="alert">{{ calculationError }}</p>
      <p v-else-if="result" class="scratch-calculator-result">= {{ result }}</p>
      <div class="scratch-key-grid">
        <button v-for="[label, key] in keys" :key="label" type="button"
          :class="{ operator: ['+', '-', '*', '/', '%', '(', ')'].includes(key),
            equals: key === 'equals', utility: key === 'clear' || key === 'backspace' }"
          :aria-label="key === 'backspace' ? '退格' : key === 'clear' ? '清除计算' : key === 'equals' ? '计算结果' : label"
          @click="pressCalculator(key)">{{ label }}</button>
      </div>
    </div>
    <div v-if="boardOpen" class="scratch-board" aria-label="草稿白板">
      <div class="scratch-board-toolbar">
        <strong>草稿白板</strong>
        <div class="scratch-board-actions">
          <button v-for="color in ['#25314b', '#4a6fd4', '#cf525f']" :key="color" type="button"
            class="scratch-color" :class="{ selected: !erasing && ink === color }"
            :style="{ '--scratch-color': color }"
            :aria-label="color === '#25314b' ? '深色笔' : color === '#4a6fd4' ? '蓝色笔' : '红色笔'"
            :aria-pressed="!erasing && ink === color" @click="ink = color; erasing = false"></button>
          <label class="scratch-width-label">粗细
            <select v-model.number="thickness" aria-label="画笔粗细">
              <option :value="2">细</option>
              <option :value="3">中</option>
              <option :value="5">粗</option>
            </select>
          </label>
          <button type="button" class="scratch-action-button" :class="{ active: erasing }"
            :aria-pressed="erasing" title="橡皮擦" @click="erasing = !erasing">
            <Eraser :size="16" /> 擦除
          </button>
          <button type="button" class="scratch-action-button" :disabled="!strokes.length" @click="undoStroke">
            <Undo2 :size="16" /> 撤销
          </button>
          <button type="button" class="scratch-action-button" :disabled="!strokes.length" @click="clearBoard">
            <Trash2 :size="16" /> 清空
          </button>
          <button type="button" class="scratch-action-button" :disabled="!strokes.length" @click="saveBoard">
            <Download :size="16" /> 保存
          </button>
        </div>
      </div>
      <canvas ref="boardRef" class="scratch-drawing-canvas" aria-label="可使用鼠标、手指或 Apple Pencil 书写的草稿区域"
        @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd"
        @pointercancel="pointerEnd" @lostpointercapture="pointerEnd"></canvas>
      <small class="scratch-board-note">草稿仅在当前页面保留，可保存为图片。</small>
    </div>
  </section>
</template>
