<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import {GraduationCap,ShieldCheck,ChevronRight,Volume2,CheckCircle2} from 'lucide-vue-next'
import ExamScratchTools from './ExamScratchTools.vue'
type Track='exam-sg'|'exam-fe'
type Option={id:string;text:string}
type Scenario={id:string;track_id:Track;title:string;category:string;difficulty:string;
 situation:string;task:string;options:Option[];source_type:string;exam_section:string|null}
type Receipt={score:number;correct:boolean;best_option:string;feedback:string}
type Pending={attempt_id:string;scenario_id:string;selected_option:string;
 duration_seconds:number;expected_user_id:string}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
const track=ref<Track>('exam-sg'),section=ref<'all'|'A'|'B'>('all')
const category=ref(''),items=ref<Scenario[]>([]),cursor=ref<string|null>(null)
const loading=ref(false),busy=ref(false),error=ref(''),enabled=ref(false)
const pos=ref(0),selected=ref(''),receipt=ref<Receipt|null>(null),pending=ref<Pending|null>(null)
let epoch=0,alive=true,started=Date.now()
const categories=computed(()=>[...new Set(items.value.map(s=>s.category))])
const filtered=computed(()=>items.value.filter(s=>
 (section.value==='all'||s.exam_section===section.value)&&
 (!category.value||s.category===category.value)))
const current=computed(()=>filtered.value[pos.value]||null)
function resetAnswer(){selected.value='';receipt.value=null;pending.value=null;started=Date.now()}
function selectTrack(t:Track){if(loading.value||busy.value||pending.value)return;track.value=t;section.value='all';category.value='';pos.value=0;resetAnswer();void load()}
function changeFilter(){if(busy.value||pending.value)return;pos.value=0;resetAnswer()}
function next(){if(busy.value||pending.value)return;if(pos.value<filtered.value.length-1){pos.value++;resetAnswer()}}
function previous(){if(busy.value||pending.value)return;if(pos.value>0){pos.value--;resetAnswer()}}
async function api(path:string,options:RequestInit={}){
 const r=await fetch('/api/homeflow-study/scenarios'+path,{
  credentials:'same-origin',cache:'no-store',...options})
 const data=await r.json().catch(()=>({})) as Record<string,any>
 if(!r.ok)throw Error(String(data.code||'实战情境暂不可用'))
 return data
}
async function check(){
 const rev=++epoch,actor=props.userId
 try{
  const status=await api('/status')
  if(!alive||rev!==epoch||actor!==props.userId)return
  enabled.value=status.enabled===true&&status.scope==='user'&&status.legacy_access===false
  if(enabled.value)void load()
 }catch(e){if(alive&&rev===epoch)error.value=(e as Error).message}
}
async function load(more=false){
 if(loading.value||busy.value||(more&&!cursor.value))return
 const rev=++epoch,actor=props.userId,requested=track.value
 loading.value=true;error.value=''
 if(!more){items.value=[];cursor.value=null;pos.value=0;resetAnswer()}
 try{
  const q=new URLSearchParams({track:requested})
  if(more&&cursor.value)q.set('after',cursor.value)
  const data=await api('?'+q)
  if(!alive||rev!==epoch||actor!==props.userId||requested!==track.value)return
  if(data.ok!==true||data.scope!=='user'||data.actor_user_id!==actor||
   !Array.isArray(data.items))throw Error('情境身份或内容校验失败')
  items.value=more?[...items.value,...data.items]:data.items
  cursor.value=typeof data.next_cursor==='string'?data.next_cursor:null
 }catch(e){if(alive&&rev===epoch)error.value=(e as Error).message}
 finally{if(alive&&rev===epoch)loading.value=false}
}
async function send(){
 const p=pending.value
 if(!p||busy.value||p.expected_user_id!==props.userId)return
 const rev=epoch,actor=props.userId
 busy.value=true;error.value=''
 try{
  const data=await api('',{method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(p)})
  if(!alive||rev!==epoch||actor!==props.userId||p!==pending.value)return
  if(data.ok!==true||data.actor_user_id!==actor||data.attempt_id!==p.attempt_id)
   throw Error('成绩回执尚待核验')
  receipt.value={score:Number(data.score),correct:data.correct===true,
   best_option:String(data.best_option),feedback:String(data.feedback)}
  pending.value=null
 }catch(e){if(alive&&rev===epoch)error.value=(e as Error).message}
 finally{if(alive&&rev===epoch)busy.value=false}
}
function submit(){
 const s=current.value
 if(!s||!selected.value||pending.value||receipt.value)return
 pending.value={attempt_id:crypto.randomUUID(),scenario_id:s.id,
  selected_option:selected.value,duration_seconds:Math.max(0,Math.min(86400,
  Math.floor((Date.now()-started)/1000))),expected_user_id:props.userId}
 void send()
}
function speak(){const s=current.value;if(!s||!window.speechSynthesis)return
 window.speechSynthesis.cancel()
 const utterance=new SpeechSynthesisUtterance(s.title+'。'+s.situation+'。'+s.task)
 utterance.lang='ja-JP';utterance.rate=0.88;window.speechSynthesis.speak(utterance)}
function foreground(){if(document.visibilityState==='visible'&&!busy.value&&!pending.value){void check()}}
watch(()=>props.userId,()=>{epoch++;items.value=[];cursor.value=null;resetAnswer();enabled.value=false;void check()})
onMounted(()=>{void check();document.addEventListener('visibilitychange',foreground)})
onUnmounted(()=>{alive=false;epoch++;items.value=[];resetAnswer();window.speechSynthesis?.cancel();document.removeEventListener('visibilitychange',foreground)})
</script>
<template>
 <section v-if="enabled" class="section-block module-page-section" aria-label="本人实战训练">
  <div class="section-heading"><div><h2>情境练习</h2><p>原版知学实战训练 · 答题记录按本人账号保存</p></div></div>
  <div class="panel practice-start-card">
   <div class="section-heading"><div><h3>选择训练方向</h3></div></div>
   <div class="exam-list">
    <button v-for="t in (['exam-sg','exam-fe'] as Track[])" :key="t"
     class="exam-card" :class="{'exam-card-selected':track===t}"
     :disabled="loading||busy||!!pending" @click="selectTrack(t)">
     <span class="exam-code" :class="t==='exam-fe'?'blue':'purple'">{{t==='exam-sg'?'SG':'FE'}}</span>
     <span class="exam-info"><strong>{{t==='exam-sg'?'信息安全管理':'基本信息技术者'}}</strong>
      <small>{{t==='exam-sg'?'职场安全判断与情境应对':'科目 A / 科目 B 实战训练'}}</small></span>
     <ChevronRight :size="18" class="muted"/>
    </button>
   </div>
  </div>
  <div v-if="track==='exam-fe'" class="question-category-section">
   <div class="question-category-heading"><strong>FE 实战训练</strong><span>按科目筛选</span></div>
   <div class="question-review-filters question-category-filters" role="group" aria-label="FE 实战训练科目">
    <button v-for="part in (['all','A','B'] as const)" :key="part"
     class="question-category-button" :class="{active:section===part}"
     :aria-pressed="section===part" :disabled="!!pending"
     @click="section=part;changeFilter()">{{part==='all'?'全部':'科目'+part}}</button>
   </div>
  </div>
  <div class="question-category-section">
   <div class="question-category-heading"><strong>领域</strong>
    <span>{{filtered.length}} / {{items.length}} 情境</span></div>
   <div class="fe-filter-controls"><label>领域
    <select v-model="category" aria-label="实战训练领域" :disabled="!!pending" @change="changeFilter">
     <option value="">全部</option><option v-for="x in categories" :key="x" :value="x">{{x}}</option>
    </select></label></div>
  </div>
  <p v-if="loading" class="dictionary-status">正在读取情境题库…</p>
  <p v-if="error" class="dictionary-status dictionary-error" role="alert">{{error}}
   <button v-if="pending" class="text-link" :disabled="busy" @click="send">原样重试</button></p>
  <article v-if="current" class="panel question-card practical-scenario-card">
   <div class="question-topline"><span>{{track==='exam-sg'?'SG':'FE'}} · {{current.category}}
    · {{pos+1}} / {{filtered.length}}</span><span class="source-pill">平台情境训练</span></div>
   <div class="question-prompt-row"><h3 class="question-prompt">{{current.title}}</h3>
    <button type="button" class="secondary-button question-speak-button" @click="speak"><Volume2 :size="14"/> 听情境</button></div>
   <p class="scenario-situation">{{current.situation}}</p>
   <h4>{{current.task}}</h4>
   <div class="question-options">
    <button v-for="option in current.options" :key="option.id" class="question-option"
     :class="{selected:selected===option.id,correct:receipt&&option.id===receipt.best_option,
       incorrect:receipt&&option.id===selected&&!receipt.correct}"
     :disabled="!!receipt||!!pending||busy" @click="selected=option.id">
     <span>{{option.id.toUpperCase()}}</span><strong>{{option.text}}</strong>
     <CheckCircle2 v-if="receipt&&option.id===receipt.best_option" :size="17"/>
    </button>
   </div>
   <ExamScratchTools :key="'sso-scenario-'+current.id"/>
   <div v-if="receipt" class="answer-explanation" :class="{right:receipt.correct}">
    <strong>{{receipt.correct?'判断正确':'可以做得更好'}} · 得分 {{receipt.score}}/100 · 推荐 {{receipt.best_option.toUpperCase()}}</strong>
    <p>{{receipt.feedback}}</p>
   </div>
   <div class="practice-navigation">
    <button class="secondary-button" type="button" :disabled="pos===0||busy||!!pending" @click="previous">上一情境</button>
    <button v-if="!receipt" class="primary-button" type="button"
     :disabled="!selected||busy||!!pending" @click="submit">提交判断</button>
    <button class="secondary-button" type="button"
     :disabled="pos>=filtered.length-1||busy||!!pending" @click="next">下一情境</button>
   </div>
  </article>
  <div v-else-if="!loading" class="empty-state">
   <ShieldCheck :size="25"/><strong>当前暂无匹配情境</strong><p>可以切换科目、领域或继续加载题库。</p>
  </div>
  <button v-if="cursor&&!loading" class="secondary-button" :disabled="busy||!!pending" @click="load(true)">加载更多情境</button>
 </section>
</template>
