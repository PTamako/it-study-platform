<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import {dailyListeningScenes,type ListeningLanguage,type ListeningScene} from './daily-dialogue-listening'
import {tokyoDate} from './daily-tasks'

const props=defineProps<{userId:string;role:'owner'|'member'}>()
type Row={scene_id:string;answer_index:number}
type Cursor={after_date:string;after_language:string;after_scene:string}
const ready=ref(false),loading=ref(false),busy=ref(false),error=ref('')
const language=ref<ListeningLanguage>('ja'),day=ref(tokyoDate())
const rows=ref<Row[]>([])
const cursor=ref<Cursor|null>(null),adopted=ref(0),adoptionStarted=ref(false)
const adoptionDone=ref(false),revealed=ref<Record<string,boolean>>({})
const audioError=ref('')
let revision=0,active=true
const scenes=computed(()=>dailyListeningScenes(day.value,language.value))
const answers=computed(()=>new Map(rows.value.map(x=>[x.scene_id,x.answer_index])))
const correct=computed(()=>scenes.value.filter(x=>answers.value.get(x.id)===x.correct).length)
// Scope is exclusively the server-verified actor; unlike the legacy single-user
// listening page this component never opens shared IndexedDB/localStorage queues.
async function api(path:string,options:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options})
 const result=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(result.code||'听力学习服务暂不可用'))
 return result
}
async function load(){
 if(!ready.value||!active)return
 const token=++revision,date=day.value,lang=language.value
 loading.value=true;error.value=''
 try{
  const result=await api('/api/homeflow-study/listening?date='+
   encodeURIComponent(date)+'&language='+encodeURIComponent(lang))
  if(token!==revision||!active)return
  if(result.ok!==true||result.scope!=='user'||!Array.isArray(result.items))
   throw Error('听力进度身份校验失败')
  const saved=result.items as Row[],allowed=new Set(scenes.value.map(x=>x.id))
  const seen=new Set<string>()
  if(saved.length>2)throw Error('听力历史条数需要核验')
  for(const entry of saved){
   if(!allowed.has(entry.scene_id)||seen.has(entry.scene_id)||
    !Number.isInteger(entry.answer_index)||entry.answer_index<0||entry.answer_index>3)
    throw Error('听力历史题号需要核验')
   seen.add(entry.scene_id)
  }
  rows.value=saved
 }catch(e){if(token===revision&&active){rows.value=[];error.value=(e as Error).message}}
 finally{if(token===revision&&active)loading.value=false}
}
async function check(){
 const token=++revision
 try{
  const status=await api('/api/homeflow-study/listening/status')
  if(token!==revision||!active)return
  ready.value=status.enabled===true&&status.scope==='user'&&status.legacy_access===false
  if(ready.value)await load()
  else rows.value=[]
 }catch{if(token===revision&&active){ready.value=false;rows.value=[]}}
}
async function choose(scene:ListeningScene,index:number){
 if(!ready.value||!active||loading.value||busy.value||answers.value.has(scene.id))return
 busy.value=true;error.value=''
 try{
  const result=await api('/api/homeflow-study/listening',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({date:day.value,language:language.value,
    expected_user_id:props.userId,
    answers:[{scene_id:scene.id,answer_index:index}]})
  })
  if(!active)return
  if(result.ok!==true||result.scope!=='user')throw Error('听力答案归属需要核验')
  await load()
 }catch(e){const message=(e as Error).message;if(active){await load();error.value=message}}
 finally{if(active)busy.value=false}
}
function play(scene:ListeningScene){
 audioError.value=''
 if(!active||typeof window.speechSynthesis==='undefined'||
  typeof SpeechSynthesisUtterance==='undefined'){
  audioError.value='当前浏览器不支持语音播放';return
 }
 try{
  // Safari requires speech synthesis to start directly in this user gesture.
  window.speechSynthesis.cancel()
  const speech=new SpeechSynthesisUtterance(scene.turns.map(t=>t.text).join(' '))
  speech.lang=language.value==='ja'?'ja-JP':'en-US'
  speech.rate=.9
  window.speechSynthesis.speak(speech)
 }catch{audioError.value='播放失败，请检查 iPhone 朗读权限'}
}
async function adopt(){
 if(props.role!=='owner'||!ready.value||busy.value||!active||adoptionDone.value)return
 if(!adoptionStarted.value&&!window.confirm('确认将原知学听力练习记录复制到本人 HomeFlow 账号？原始记录不删除。'))return
 busy.value=true;error.value=''
 try{
  const result=await api('/api/homeflow-study/listening/legacy/adopt',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({confirm:true,...(cursor.value||{})})
  })
  if(!active)return
  if(result.ok!==true||result.scope!=='owner_only')throw Error('历史导入需要核验')
  adopted.value+=Number(result.adopted||0)
  adoptionStarted.value=true
  cursor.value=result.has_more?result.next_cursor as Cursor:null
  adoptionDone.value=!result.has_more
  await load()
 }catch(e){if(active)error.value=(e as Error).message}
 finally{if(active)busy.value=false}
}
function foreground(){
 if(document.visibilityState!=='visible'||!active||busy.value)return
 const now=tokyoDate()
 if(now!==day.value){day.value=now;rows.value=[];revealed.value={}}
 void check()
}
watch(language,()=>{
 rows.value=[];revealed.value={}
 try{window.speechSynthesis?.cancel()}catch{/* unavailable */}
 void load()
})
onMounted(()=>{active=true;void check();document.addEventListener('visibilitychange',foreground)})
onUnmounted(()=>{
 active=false;revision++;rows.value=[];revealed.value={}
 try{window.speechSynthesis?.cancel()}catch{/* unavailable */}
 document.removeEventListener('visibilitychange',foreground)
})
</script>

<template>
 <section v-if="ready" class="hf-listening" aria-label="HomeFlow 个人每日听力">
  <div class="hf-listening-head">
   <strong>我的每日听力</strong>
   <div class="hf-controls">
    <select v-model="language" aria-label="听力语言" :disabled="busy||loading">
     <option value="ja">日语</option><option value="en">英语</option>
    </select>
    <button type="button" :disabled="busy||loading" @click="load">刷新</button>
   </div>
  </div>
  <small class="hf-muted">{{day}} · 完成 {{rows.length}} / 2 · 答对 {{correct}}</small>
  <article v-for="scene in scenes" :key="scene.id" class="hf-scene">
   <small class="hf-muted">{{scene.category}}</small>
   <div class="hf-controls">
    <button type="button" @click="play(scene)">播放对话</button>
    <button v-if="!answers.has(scene.id)&&!revealed[scene.id]"
     type="button" @click="revealed={...revealed,[scene.id]:true}">查看原文</button>
   </div>
   <p>{{scene.questionZh}}</p>
   <div class="hf-options">
    <button v-for="(option,index) in scene.options" :key="index" type="button"
     :disabled="busy||loading||answers.has(scene.id)"
     :class="{selected:answers.get(scene.id)===index,
      correct:answers.has(scene.id)&&index===scene.correct}"
     @click="choose(scene,index)">
      {{String.fromCharCode(65+index)}}. {{option}}
    </button>
   </div>
   <p v-if="answers.has(scene.id)" class="hf-answer">
    {{answers.get(scene.id)===scene.correct?'回答正确':'正确答案 '+String.fromCharCode(65+scene.correct)}} · {{scene.whyZh}}
   </p>
   <div v-if="answers.has(scene.id)||revealed[scene.id]" class="hf-transcript">
    <strong>原文与中文解释</strong>
    <p v-for="(turn,i) in scene.turns" :key="i"><b>{{turn.speaker}}：</b>{{turn.text}}
     <span class="hf-muted">{{turn.zh}}</span></p>
    <small class="hf-muted">{{scene.focusZh}}</small>
   </div>
  </article>
  <p v-if="audioError" class="hf-error" role="alert">{{audioError}}</p>
  <div v-if="role==='owner'" class="hf-controls">
   <button v-if="!adoptionDone" type="button" :disabled="busy||loading" @click="adopt">
    {{adoptionStarted?'继续导入旧听力记录':'导入我原来的听力记录'}}
   </button>
   <small v-if="adoptionStarted">已复制 {{adopted}} 条 · {{adoptionDone?'完成':'继续下一页'}}</small>
  </div>
  <p v-if="error" class="hf-error" role="alert">{{error}}</p>
  <small class="hf-muted">播放使用设备语音；仅在线保存本人答案，不上传录音、不使用旧本机缓存。</small>
 </section>
</template>
<style scoped>
.hf-listening{min-width:0;display:grid;gap:10px;padding-top:12px;border-top:1px solid var(--border-color,#dce5e0)}
.hf-listening-head,.hf-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.hf-listening-head strong{font-size:13px}
.hf-listening button,.hf-listening select{font:inherit;color:inherit;font-size:12px;min-height:40px;padding:7px 11px;background:transparent;border:1px solid var(--border-color,#bac8c0);border-radius:10px}
.hf-listening button:disabled{opacity:.55}
.hf-muted{margin:0;color:var(--text-muted,#6e7976);font-size:11px;line-height:1.5}
.hf-scene{display:grid;gap:9px;padding:11px;border:1px solid var(--border-color,#e0e7e2);border-radius:12px;min-width:0}
.hf-scene>p,.hf-transcript p{margin:0;font-size:12px;line-height:1.55;overflow-wrap:anywhere}
.hf-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:6px}
.hf-options button{text-align:left;white-space:normal;overflow-wrap:anywhere;min-height:44px}
.hf-options .selected{border-color:#287c5a}.hf-options .correct{background:#e2f4e9;color:#216647}
.hf-answer{color:#24664f}
.hf-transcript{display:grid;gap:6px;padding:9px;background:var(--surface-muted,#f6f9f8);border-radius:9px}
.hf-transcript span{display:block}
.hf-error{color:#b34343;font-size:12px;margin:0;overflow-wrap:anywhere}
</style>
