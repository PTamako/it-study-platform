<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import {dailyGrammarLesson,previousGrammarLesson,type GrammarLanguage} from './daily-grammar-lessons'
import {tokyoDate} from './daily-tasks'

const props=defineProps<{userId:string;role:'owner'|'member'}>()
type AnswerRow={question_id:string;answer_index:number}
type Cursor={after_date:string;after_language:string;after_question:string}
const ready=ref(false),loading=ref(false),busy=ref(false),error=ref('')
const language=ref<GrammarLanguage>('ja'),day=ref(tokyoDate())
const rows=ref<AnswerRow[]>([])
const cursor=ref<Cursor|null>(null),adopted=ref(0),adoptionStarted=ref(false)
const adoptionDone=ref(false)
let generation=0
// Unlike the old single-user grammar page, this component never touches
// shared localStorage, IndexedDB or an offline write queue. Network retries
// are deliberate and are bound to the currently verified HomeFlow user.
const today=computed(()=>dailyGrammarLesson(day.value,language.value))
const previous=computed(()=>previousGrammarLesson(day.value,language.value))
const questions=computed(()=>[
 ...today.value.questions.map((q,i)=>({...q,id:today.value.id+':today:'+i,label:'今日语法'})),
 ...previous.value.questions.slice(0,1).map((q,i)=>({...q,id:previous.value.id+':review:'+i,label:'昨日复习'}))
])
const answers=computed(()=>new Map(rows.value.map(r=>[r.question_id,r.answer_index])))
const correct=computed(()=>questions.value.filter(q=>answers.value.get(q.id)===q.correct).length)
async function request(path:string,options:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options})
 const data=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(data.code||'当前学习记录暂不可用'))
 return data
}
async function load(){
 if(!ready.value)return
 const rev=++generation,studyDate=day.value,lang=language.value
 loading.value=true;error.value=''
 try{
  const result=await request('/api/homeflow-study/grammar?date='+
   encodeURIComponent(studyDate)+'&language='+encodeURIComponent(lang))
  if(rev!==generation)return
  if(result.ok!==true||result.scope!=='user'||!Array.isArray(result.items))
   throw Error('语法记录身份或格式无效')
  const allowed=new Set(questions.value.map(q=>q.id)),seen=new Set<string>()
  const received=result.items as AnswerRow[]
  if(received.length>3)throw Error('历史语法条数需要核验')
  for(const row of received){
   if(!allowed.has(row.question_id)||seen.has(row.question_id)||
    !Number.isInteger(row.answer_index)||row.answer_index<0||row.answer_index>3)
    throw Error('历史语法题号需要核验')
   seen.add(row.question_id)
  }
  rows.value=received
 }catch(e){if(rev===generation){rows.value=[];error.value=(e as Error).message}}
 finally{if(rev===generation)loading.value=false}
}
async function check(){
 const rev=++generation
 try{
  const status=await request('/api/homeflow-study/grammar/status')
  if(rev!==generation)return
  ready.value=status.enabled===true&&status.scope==='user'
  if(ready.value)await load()
  else rows.value=[]
 }catch{if(rev===generation){ready.value=false;rows.value=[]}}
}
async function answer(questionId:string,answerIndex:number){
 if(!ready.value||busy.value||loading.value||answers.value.has(questionId))return
 busy.value=true;error.value=''
 try{
  const result=await request('/api/homeflow-study/grammar',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({date:day.value,language:language.value,
    expected_user_id:props.userId,
    answers:[{question_id:questionId,answer_index:answerIndex}]})
  })
  if(result.ok!==true||result.scope!=='user')throw Error('答案归属需要核验')
  await load()
 }catch(e){const message=(e as Error).message;await load();error.value=message}
 finally{busy.value=false}
}
async function adopt(){
 if(props.role!=='owner'||!ready.value||busy.value||adoptionDone.value)return
 if(!adoptionStarted.value&&!window.confirm('确认将原知学的每日语法历史复制到本人 HomeFlow 账号？原记录不删除。'))return
 busy.value=true;error.value=''
 try{
  const result=await request('/api/homeflow-study/grammar/legacy/adopt',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({confirm:true,...(cursor.value||{})})
  })
  if(result.ok!==true||result.scope!=='owner_only')throw Error('历史迁移需人工核验')
  adopted.value+=Number(result.adopted||0)
  adoptionStarted.value=true
  cursor.value=result.has_more?result.next_cursor as Cursor:null
  adoptionDone.value=!result.has_more
  await load()
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
function foreground(){
 if(document.visibilityState==='visible'){
  const newDate=tokyoDate()
  if(day.value!==newDate){day.value=newDate;rows.value=[]}
  if(!busy.value)void check()
 }
}
watch(language,()=>{rows.value=[];void load()})
onMounted(()=>{void check();document.addEventListener('visibilitychange',foreground)})
onUnmounted(()=>{generation++;rows.value=[];document.removeEventListener('visibilitychange',foreground)})
</script>

<template>
 <section v-if="ready" class="hf-grammar" aria-label="HomeFlow 个人每日语法">
  <div class="hf-grammar-header">
   <strong>我的每日语法</strong>
   <div class="hf-grammar-controls">
    <select v-model="language" aria-label="语法语言" :disabled="busy||loading">
     <option value="ja">日语</option><option value="en">英语</option>
    </select>
    <button type="button" :disabled="busy||loading" @click="load">刷新</button>
   </div>
  </div>
  <small class="hf-muted">{{day}} · 已完成 {{rows.length}} / 3 · 答对 {{correct}}</small>
  <div class="hf-topic">
   <strong>{{today.point}}</strong>
   <p>{{today.zh}}</p><p class="hf-muted">{{today.example}}</p>
  </div>
  <article v-for="(q,i) in questions" :key="q.id" class="hf-question">
   <small class="hf-muted">{{q.label}} · 第 {{i+1}} 题</small>
   <p>{{q.prompt}}</p>
   <div class="hf-options">
    <button v-for="(option,index) in q.options" :key="index" type="button"
     :disabled="busy||loading||answers.has(q.id)"
     :class="{selected:answers.get(q.id)===index,correct:answers.has(q.id)&&index===q.correct}"
     @click="answer(q.id,index)">{{String.fromCharCode(65+index)}}. {{option}}</button>
   </div>
   <p v-if="answers.has(q.id)" class="hf-feedback">
    {{answers.get(q.id)===q.correct?'回答正确':'正确答案 '+String.fromCharCode(65+q.correct)}} · {{q.whyZh}}
   </p>
  </article>
  <div v-if="role==='owner'" class="hf-grammar-adopt">
   <button v-if="!adoptionDone" type="button" :disabled="busy||loading" @click="adopt">
    {{adoptionStarted?'继续导入旧语法记录':'导入我原来的语法记录'}}
   </button>
   <small v-if="adoptionStarted">已复制 {{adopted}} 条 · {{adoptionDone?'已完成':'可继续下一页'}}</small>
  </div>
  <p v-if="error" class="hf-error" role="alert">{{error}}</p>
  <small class="hf-muted">当前仅联机保存到本人账号；不会使用旧账号的手机缓存。</small>
 </section>
</template>
<style scoped>
.hf-grammar{min-width:0;display:grid;gap:9px;border-top:1px solid var(--border-color,#dae4dc);padding-top:12px}
.hf-grammar-header,.hf-grammar-controls,.hf-grammar-adopt{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hf-grammar-header strong{font-size:13px}
.hf-grammar select,.hf-grammar button{font:inherit;color:inherit;min-height:40px;border:1px solid var(--border-color,#b8cbbf);border-radius:10px;background:transparent;padding:7px 10px;font-size:12px}
.hf-grammar button:disabled{opacity:.58}
.hf-muted{margin:0;color:var(--text-muted,#6b7673);font-size:11px}
.hf-topic,.hf-question{min-width:0;display:grid;gap:6px;padding:10px 11px;border:1px solid var(--border-color,#e1e7e4);border-radius:12px}
.hf-topic p,.hf-question p{margin:0;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
.hf-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:6px}
.hf-options button{text-align:left;white-space:normal;overflow-wrap:anywhere;min-height:44px}
.hf-options .selected{border-color:#267c5c}.hf-options .correct{background:#e4f5e9;color:#1e6147}
.hf-feedback{font-size:11px;color:#236e51}
.hf-error{margin:0;font-size:12px;color:#b34343;overflow-wrap:anywhere}
</style>
