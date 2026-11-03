import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const component=await readFile(new URL('../src/DailyListeningPractice.vue',import.meta.url),'utf8')
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8')
test('recording is initiated by a real user tap and explicitly requests mic permission',()=>{
  assert.match(component,/@click="startLocalRecording\(scene\.id\)"/)
  assert.match(component,/async function startLocalRecording\(sceneId: string\)/)
  assert.match(component,/navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/)
  assert.match(component,/new MediaRecorder\(stream\)/)
  assert.match(component,/media\.start\(\)/)
  assert.match(component,/autoStopTimer = setTimeout\(stopLocalRecording, 30000\)/)
})
test('self-playback stays local and is cleaned up after session change or unmount',()=>{
  assert.match(component,/URL\.createObjectURL\(blob\)/)
  assert.match(component,/URL\.revokeObjectURL\(recordingUrl\.value\)/)
  assert.match(component,/microphone\?\.getTracks\(\)\.forEach\(track => track\.stop\(\)\)/)
  assert.match(component,/watch\(storageKey, clearLocalRecording\)/)
  assert.match(component,/onUnmounted\(clearLocalRecording\)/)
  assert.match(component,/:src="recordingUrl" controls preload="none"/)
  assert.match(component,/recordingRun\+\+/)
  assert.match(component,/recordingSceneId\.value = sceneId/)
  assert.match(component,/URL\.createObjectURL\(blob\)/)
  assert.match(component,/30 秒/)
  assert.match(component,/不上传、不进行自动评分/)
  assert.doesNotMatch(component,/fetch\(|\.prepare\(|AI\.run\(|FormData|upload.*audio|\\/api\\/record/)
})
test('mic permission denial never masquerades as speech evaluation',()=>{
  assert.match(component,/当前浏览器不支持录音/)
  assert.match(component,/未取得麦克风权限/)
  assert.match(component,/type: blobType/)
  assert.match(component,/recordingActive/)
  assert.match(css,/\.daily-voice-practice button\{min-height:44px\}/)
})
