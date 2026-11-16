<script setup lang="ts">
import {onMounted,onUnmounted,reactive,ref} from 'vue'

type Track='exam-sg'|'exam-fe'
type Question={
 id:string;track_id:string;topic:string;difficulty:string;prompt:string;
 options:Array<{id:string;text:string}>;wrong_count:number;
 review_count:number;correct_streak:number;mastered:boolean
}
type Wrong=Question&{answer:string;explanation:string;next_review_at:string}
type History={id:string;date:string;exam:string;correct:number;total:number;created_at:string}
type Kind='attempts'|'reviews'|'history'
type Adoption={after:string;total:number;done:boolean;started:boolean}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
const tab=ref<'practice'|'wrong'|'history'>('practice')
const track=ref<Track>('exam-sg'),enabled=ref(false),loading=ref(false),busy=ref(false)
const error=ref(''),info=ref('')
const questions=ref<Question[]>([]),wrong=ref<Wrong[]>([]),history=ref<History[]>([])
const cursor=ref<string|null>(null),selected=reactive<Record<string,string>>({})
const graded=reactive<Record<string,{correct:boolean;answer:string}>>({})
type Pending={attempt_id:string;question_id:string;answer:string;duration_seconds:number;expected_user_id:string}
const pending=ref<Pending|null>(null)
const importKinds:Kind[]=['attempts','reviews','history']
const adoption=reactive<Record<Kind,Adoption>>({
 attempts:{after:'',total:0,done:false,started:false},
 reviews:{after:'',total:0,done:false,started:false},
 history:{after:'',total:0,done:false,started:false}
})
const score=reactive({date:new Date(Date.now()+9*3600000).toISOString().slice(0,10),
 exam:'SG 模拟练习',total:60,correct:0})
let generation=0
async function request(path:string,options:RequestInit={}){
 const response=await fetch('/api/homeflow-study/exams'+path,{
  credentials:'same-origin',cache:'no-store',...options})
 const data=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(data.code||'网络暂时不可用'))
 return data
}
function post(payload:unknown):RequestInit{
 return {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}
}
async function load(append=false){
 const rev=++generation
 loading.value=true;error.value=''
 if(!append){cursor.value=null;questions.value=[];wrong.value=[];history.value=[]}
 const path=tab.value==='practice'?'/questions?track='+track.value+'&limit=12':
  tab.value==='wrong'?'/wrong?track='+track.value+'&limit=12':'/history?limit=20'
 const url=path+(append&&cursor.value?'&after='+encodeURIComponent(cursor.value):'')
 try{
  const res=await request(url)
  if(rev!==generation)return
  if(res.ok!==true||res.scope!=='user'||!Array.isArray(res.items))
   throw Error('考试数据需要核验')
  if(tab.value==='practice')questions.value=append?
   [...questions.value,...res.items]:res.items
  else if(tab.value==='wrong')wrong.value=append?[...wrong.value,...res.items]:res.items
  else history.value=append?[...history.value,...res.items]:res.items
  cursor.value=typeof res.next_cursor==='string'?res.next_cursor:null
 }catch(e){if(rev===generation)error.value=(e as Error).message}
 finally{if(rev===generation)loading.value=false}
}
async function check(){
 const rev=++generation
 try{
  const res=await request('/status')
  if(rev!==generation)return
  enabled.value=res.enabled===true&&res.scope==='user'&&res.legacy_access===false
  if(enabled.value)await load()
  else {questions.value=[];wrong.value=[];history.value=[]}
 }catch{if(rev===generation){enabled.value=false;questions.value=[];wrong.value=[];history.value=[]}}
}
async function answer(question:Question){
 if(busy.value||pending.value||!selected[question.id]||graded[question.id])return
 pending.value={attempt_id:crypto.randomUUID(),question_id:question.id,
  answer:selected[question.id],duration_seconds:0,expected_user_id:props.userId}
 await send()
}
async function send(){
 if(!pending.value||busy.value)return
 const current=pending.value,rev=generation
 if(current.expected_user_id!==props.userId){
  error.value='当前 HomeFlow 用户与原答题用户不一致，已阻止串号重试';return
 }
 busy.value=true;error.value=''
 try{
  const data=await request('/attempts',post(current))
  if(rev!==generation||current.expected_user_id!==props.userId)return
  if(data.ok!==true||data.scope!=='user')throw Error('答题保存需要核验')
  graded[current.question_id]={correct:data.correct===true,answer:String(data.answer)}
  pending.value=null
  info.value=data.correct?'回答正确':'已记录错题，可以在错题列表复习'
 }catch(e){if(rev===generation)error.value=(e as Error).message}
 finally{if(rev===generation)busy.value=false}
}
async function addScore(){
 if(busy.value)return
 const rev=generation,actor=props.userId
 busy.value=true;error.value='';info.value=''
 try{
  const item={id:crypto.randomUUID().replace(/-/g,''),date:score.date,
   exam:score.exam.trim(),total:Number(score.total),correct:Number(score.correct),
   expected_user_id:actor}
  const res=await request('/history',post(item))
  if(rev!==generation||actor!==props.userId)return
  if(res.ok!==true)throw Error('成绩记录失败')
  info.value='个人成绩已保存'
  await load()
 }catch(e){if(rev===generation)error.value=(e as Error).message}
 finally{if(rev===generation)busy.value=false}
}
async function adopt(kind:Kind){
 const state=adoption[kind]
 if(props.role!=='owner'||busy.value||state.done)return
 if(!state.started&&!window.confirm('只把原知学的'+
  ({attempts:'练习记录',reviews:'错题掌握',history:'考试成绩'}[kind])+
  '复制到你的 HomeFlow 账号。旧记录不会删除，确认吗？'))return
 busy.value=true;error.value=''
 try{
  const data=await request('/legacy/adopt',post({confirm:true,kind,expected_user_id:props.userId,
   ...(state.after?{after:state.after}:{})}))
  if(data.ok!==true||data.scope!=='owner_only')throw Error('旧记录导入失败')
  state.started=true;state.total+=Number(data.adopted||0)
  state.done=data.has_more!==true
  state.after=typeof data.next_cursor==='string'?data.next_cursor:''
  await load()
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
function changeView(next:typeof tab.value){tab.value=next;info.value='';void load()}
function resume(){if(document.visibilityState==='visible'&&!busy.value)void check()}
onMounted(()=>{void check();document.addEventListener('visibilitychange',resume)})
onUnmounted(()=>{
 generation++;questions.value=[];wrong.value=[];history.value=[];pending.value=null
 document.removeEventListener('visibilitychange',resume)
})
</script>

<template>
 <section v-if="enabled" class="hf-exams" aria-label="HomeFlow 个人考试">
  <div class="hf-title">
   <strong>我的考试练习</strong>
   <label v-if="tab!=='history'">科目
    <select v-model="track" aria-label="考试科目" :disabled="busy||loading" @change="load()">
     <option value="exam-sg">SG</option>
     <option value="exam-fe">FE</option>
    </select>
   </label>
  </div>
  <div class="hf-tabs" aria-label="考试记录分类">
   <button type="button" :aria-pressed="tab==='practice'" :disabled="busy"
    @click="changeView('practice')">练习</button>
   <button type="button" :aria-pressed="tab==='wrong'" :disabled="busy"
    @click="changeView('wrong')">错题</button>
   <button type="button" :aria-pressed="tab==='history'" :disabled="busy"
    @click="changeView('history')">成绩</button>
  </div>
  <div v-if="tab==='practice'" class="hf-list">
   <article v-for="q in questions" :key="q.id" class="hf-card">
    <small>{{q.topic}} · {{q.id}}</small>
    <strong>{{q.prompt}}</strong>
    <label v-for="op in q.options" :key="op.id" class="hf-option">
     <input v-model="selected[q.id]" type="radio" :name="'answer-'+q.id"
      :value="op.id" :disabled="!!graded[q.id]||busy||!!pending">
     <span>{{op.id}}. {{op.text}}</span>
    </label>
    <div v-if="graded[q.id]" class="hf-result">
     {{graded[q.id].correct?'回答正确':'回答错误'}} · 正确答案 {{graded[q.id].answer}}
    </div>
    <button v-else type="button" :disabled="busy||!selected[q.id]||!!pending"
     @click="answer(q)">提交答案</button>
   </article>
   <small v-if="!questions.length&&!loading">暂无对应题目</small>
  </div>
  <div v-if="tab==='wrong'" class="hf-list">
   <article v-for="q in wrong" :key="q.id" class="hf-card">
    <small>{{q.topic}} · 答错 {{q.wrong_count}} 次</small>
    <strong>{{q.prompt}}</strong>
    <p>正确答案：{{q.answer}}</p><p>{{q.explanation}}</p>
    <small>{{q.mastered?'已掌握':'待继续练习'}}</small>
   </article>
   <small v-if="!wrong.length&&!loading">当前账号尚无错题</small>
  </div>
  <div v-if="tab==='history'" class="hf-list">
   <article v-for="entry in history" :key="entry.id" class="hf-history">
    <span>{{entry.date}} · {{entry.exam}}</span>
    <strong>{{entry.correct}} / {{entry.total}}</strong>
   </article>
   <div class="hf-score">
    <strong>补录个人考试成绩</strong>
    <label>考试日期<input v-model="score.date" type="date"></label>
    <label>考试名称<input v-model="score.exam" type="text" maxlength="100"></label>
    <label>总题数<input v-model.number="score.total" type="number" min="1" max="10000"></label>
    <label>答对数<input v-model.number="score.correct" type="number" min="0" :max="score.total"></label>
    <button type="button" :disabled="busy||loading" @click="addScore">保存成绩</button>
   </div>
  </div>
  <button v-if="cursor" type="button" :disabled="busy||loading"
   @click="load(true)">加载更多</button>
  <div v-if="role==='owner'" class="hf-adopt">
   <strong>原账号历史迁移</strong>
   <div v-for="kind in importKinds" :key="kind">
    <button v-if="!adoption[kind].done" type="button" :disabled="busy||loading"
     @click="adopt(kind)">{{adoption[kind].started?'继续导入':'导入'}}{{
      {attempts:'练习历史',reviews:'错题掌握',history:'成绩历史'}[kind]
     }}</button>
    <small v-if="adoption[kind].started">已复制 {{adoption[kind].total}} 条 ·
     {{adoption[kind].done?'已完成':'还可继续'}}</small>
   </div>
  </div>
  <button v-if="pending" type="button" :disabled="busy" @click="send">
   重试上次答题（不重复计次）
  </button>
  <p v-if="error" class="hf-error" role="alert">{{error}}</p>
  <small v-if="info" class="hf-info" role="status">{{info}}</small>
  <small class="hf-info">此处仅是当前 HomeFlow 账号的练习记录，不读取旧单用户缓存。</small>
 </section>
</template>

<style scoped>
.hf-exams{display:grid;gap:10px;border-top:1px solid var(--border-color,#dce5e0);padding-top:12px;min-width:0}
.hf-title{display:flex;justify-content:space-between;align-items:center;gap:8px}
.hf-title strong,.hf-adopt>strong{font-size:13px}
.hf-title label{display:flex;align-items:center;gap:6px;font-size:11px}
.hf-exams select,.hf-exams input[type=date],.hf-score input{min-height:39px;min-width:0;
 border-radius:9px;border:1px solid var(--border-color,#c7d8cf);background:var(--surface,#fff);color:inherit;padding:6px;font:inherit}
.hf-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.hf-exams button{min-height:39px;min-width:0;border:1px solid var(--border-color,#c7d8cf);
 border-radius:10px;padding:7px 10px;background:transparent;color:inherit;font:inherit;font-size:12px}
.hf-exams button:disabled{opacity:.5}
.hf-tabs button[aria-pressed=true]{background:#e0eee6;border-color:#91bcaa;color:#205b46}
.hf-list{display:grid;gap:9px;min-width:0}
.hf-card{display:grid;gap:8px;padding:11px;border:1px solid var(--border-color,#dae5de);border-radius:12px;min-width:0}
.hf-card small,.hf-info,.hf-adopt small{color:var(--text-muted,#69776d);font-size:11px;overflow-wrap:anywhere}
.hf-card>strong{font-size:12px;overflow-wrap:anywhere}
.hf-card p{margin:0;font-size:12px;overflow-wrap:anywhere}
.hf-option{display:flex;align-items:flex-start;gap:9px;font-size:12px}
.hf-option input{margin-top:2px;accent-color:#28775a}
.hf-option span{min-width:0;overflow-wrap:anywhere}
.hf-result{font-size:12px;color:#276a53}
.hf-history{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:10px 11px;
 border-radius:11px;border:1px solid var(--border-color,#dce5e0);font-size:12px}
.hf-score{display:grid;gap:8px;padding:10px;border:1px solid var(--border-color,#dce5e0);border-radius:12px}
.hf-score>strong{font-size:12px}
.hf-score label{display:grid;gap:4px;font-size:11px}
.hf-adopt{display:grid;gap:8px;border-top:1px solid var(--border-color,#dce5e0);padding-top:9px}
.hf-adopt>div{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.hf-error{color:#b34343;margin:0;font-size:12px}
.hf-info{margin:0}
</style>
