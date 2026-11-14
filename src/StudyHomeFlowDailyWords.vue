<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import {dailyJapaneseWordCandidates,dailyBusinessWordCandidates} from './daily-language-scenes'
import {findStaticLearnerEntry,type LexiconDisplayEntry} from './static-learner-dictionary'
import {tokyoDate} from './daily-tasks'

const props=defineProps<{userId:string;role:'owner'|'member'}>()
type Row={word_key:string;streak:number;next_date:string;last_date:string;version:number}
const ready=ref(false),loading=ref(false),busy=ref(false),error=ref('')
const language=ref<'ja'|'en'>('ja'),day=ref(tokyoDate())
const records=ref<Record<string,Row>>({})
const entries=ref<Record<string,LexiconDisplayEntry>>({})
const revealed=ref<Record<string,boolean>>({})
const after=ref<string|null>(null),adopted=ref(0)
const adoptionStarted=ref(false),adoptionDone=ref(false)
let revision=0,active=true
const terms=computed(()=>(
 language.value==='ja'?dailyJapaneseWordCandidates(day.value):
 dailyBusinessWordCandidates(day.value)
).slice(0,5))
const keys=computed(()=>terms.value.map(s=>language.value+':'+s))
const completed=computed(()=>keys.value.filter(k=>records.value[k]?.last_date===day.value).length)
// User-isolated online-only state. Do not read the old localStorage/IndexedDB
// or enqueue requests that might be replayed with another person's cookie.
async function api(path:string,init:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...init})
 const result=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(result.code||'单词进度暂不可用'))
 return result
}
function checkRow(x:Row,requested:Set<string>){
 return requested.has(x.word_key)&&Number.isInteger(x.streak)&&x.streak>=0&&x.streak<=5&&
  Number.isInteger(x.version)&&x.version>=1&&
  /^20\d{2}-\d{2}-\d{2}$/.test(x.last_date)&&
  /^20\d{2}-\d{2}-\d{2}$/.test(x.next_date)&&x.next_date>x.last_date
}
async function load(){
 if(!ready.value||!active)return
 const run=++revision,selected=[...keys.value],lang=language.value
 loading.value=true;error.value=''
 try{
  const params=encodeURIComponent(JSON.stringify(selected))
  const result=await api('/api/homeflow-study/daily-words?keys='+params)
  if(!active||run!==revision)return
  if(result.ok!==true||result.scope!=='user'||!Array.isArray(result.items))
   throw Error('个人单词记录身份或格式异常')
  const approved=new Set(selected),next:Record<string,Row>={}
  for(const row of result.items as Row[]){
   if(!checkRow(row,approved)||row.word_key in next)throw Error('单词状态需要人工核验')
   next[row.word_key]=row
  }
  records.value=next
  const selectedTerms=[...terms.value]
  const words=await Promise.all(selectedTerms.map(async term=>{
   try{return await findStaticLearnerEntry(term,lang)}catch{return null}
  }))
  if(!active||run!==revision)return
  entries.value=Object.fromEntries(words.flatMap((word,i)=>
   word?[ [lang+':'+selectedTerms[i],word] as const ]:[]))
 }catch(e){if(active&&run===revision){records.value={};error.value=(e as Error).message}}
 finally{if(active&&run===revision)loading.value=false}
}
async function check(){
 const run=++revision
 try{
  const status=await api('/api/homeflow-study/daily-words/status')
  if(!active||run!==revision)return
  ready.value=status.enabled===true&&status.scope==='user'&&status.legacy_access===false
  if(ready.value)await load()
  else{records.value={};entries.value={}}
 }catch{if(active&&run===revision){ready.value=false;records.value={};entries.value={}}}
}
function status(key:string){
 const record=records.value[key]
 if(!record)return '未学习'
 if(record.last_date===day.value)return '今日完成'
 if(record.next_date>day.value)return '下次复习 '+record.next_date
 return '待复习 · 连续 '+record.streak
}
function canGrade(key:string){
 const record=records.value[key]
 return !record||(record.last_date!==day.value&&record.next_date<=day.value)
}
async function grade(key:string,remembered:boolean){
 if(!active||!ready.value||busy.value||loading.value||!canGrade(key))return
 busy.value=true;error.value=''
 try{
  const response=await api('/api/homeflow-study/daily-words',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({word_key:key,remembered,study_date:day.value,
    expected_user_id:props.userId,expected_version:records.value[key]?.version||0})
  })
  if(!active)return
  if(response.ok!==true||response.scope!=='user'||!response.item)
   throw Error('记忆结果的身份或版本核验失败')
  await load()
 }catch(e){const reason=(e as Error).message;if(active){await load();error.value=reason}}
 finally{if(active)busy.value=false}
}
async function adopt(){
 if(props.role!=='owner'||!ready.value||busy.value||!active||adoptionDone.value)return
 if(!adoptionStarted.value&&!window.confirm('确认把原知学的单词复习状态复制到本人 HomeFlow 账号？原始数据不删除。'))return
 busy.value=true;error.value=''
 try{
  const data=await api('/api/homeflow-study/daily-words/legacy/adopt',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({confirm:true,...(after.value?{after:after.value}:{})})
  })
  if(!active)return
  if(data.ok!==true||data.scope!=='owner_only')throw Error('历史数据需要人工核验')
  adopted.value+=Number(data.adopted||0)
  adoptionStarted.value=true
  after.value=data.has_more?data.next_cursor as string:null
  adoptionDone.value=!data.has_more
  await load()
 }catch(e){if(active)error.value=(e as Error).message}
 finally{if(active)busy.value=false}
}
function foreground(){
 if(!active||document.visibilityState!=='visible'||busy.value)return
 const now=tokyoDate()
 if(day.value!==now){day.value=now;records.value={};revealed.value={}}
 void check()
}
watch(language,()=>{revealed.value={};entries.value={};records.value={};void load()})
onMounted(()=>{active=true;void check();document.addEventListener('visibilitychange',foreground)})
onUnmounted(()=>{active=false;revision++;records.value={};entries.value={};revealed.value={};
 document.removeEventListener('visibilitychange',foreground)})
</script>

<template>
 <section v-if="ready" class="hf-words" aria-label="HomeFlow 我的每日单词">
  <div class="hf-words-head">
   <strong>我的每日单词</strong>
   <div class="hf-word-actions">
    <select v-model="language" aria-label="单词语言" :disabled="busy||loading">
     <option value="ja">日语</option><option value="en">英语</option>
    </select>
    <button type="button" :disabled="busy||loading" @click="load">刷新</button>
   </div>
  </div>
  <small class="hf-muted">{{day}} · 完成 {{completed}} / 5 · 进度按本人 HomeFlow 账号保存</small>
  <article v-for="term in terms" :key="language+':'+term" class="hf-word">
   <div class="hf-words-head">
    <strong>{{term}}</strong>
    <small class="hf-muted">{{status(language+':'+term)}}</small>
   </div>
   <div v-if="revealed[language+':'+term]" class="hf-definition">
    <p v-if="entries[language+':'+term]">
     {{entries[language+':'+term].reading||entries[language+':'+term].transcription||''}}
     · {{entries[language+':'+term].zh}}
    </p>
    <p v-else>静态词典尚未就绪，请刷新后确认释义。</p>
    <p v-if="entries[language+':'+term]?.example" class="hf-muted">
     {{entries[language+':'+term].example}}
    </p>
   </div>
   <div class="hf-word-actions">
    <button v-if="!revealed[language+':'+term]" type="button"
     @click="revealed={...revealed,[language+':'+term]:true}">查看释义</button>
    <template v-else-if="canGrade(language+':'+term)&&entries[language+':'+term]">
     <button type="button" :disabled="busy||loading" @click="grade(language+':'+term,true)">记住了</button>
     <button type="button" :disabled="busy||loading" @click="grade(language+':'+term,false)">还没记住</button>
    </template>
   </div>
  </article>
  <div v-if="role==='owner'" class="hf-word-actions">
   <button v-if="!adoptionDone" type="button" :disabled="busy||loading" @click="adopt">
    {{adoptionStarted?'继续导入旧单词记录':'导入我原来的单词复习记录'}}
   </button>
   <small v-if="adoptionStarted">已复制 {{adopted}} 条 · {{adoptionDone?'完成':'继续下一页'}}</small>
  </div>
  <p v-if="error" role="alert" class="hf-error">{{error}}</p>
  <small class="hf-muted">复习日期由服务端计算；同日仅计一次，无离线重播队列。</small>
 </section>
</template>
<style scoped>
.hf-words{display:grid;gap:9px;min-width:0;padding-top:12px;border-top:1px solid var(--border-color,#dee6df)}
.hf-words-head,.hf-word-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.hf-words-head strong{font-size:13px}
.hf-words button,.hf-words select{font:inherit;font-size:12px;min-height:40px;border:1px solid var(--border-color,#b8c7c1);border-radius:10px;padding:7px 10px;background:transparent;color:inherit}
.hf-words button:disabled{opacity:.55}
.hf-word{min-width:0;display:grid;gap:8px;padding:11px;border:1px solid var(--border-color,#e1e9e3);border-radius:12px}
.hf-word p{margin:0;line-height:1.5;font-size:12px;overflow-wrap:anywhere}
.hf-definition{background:var(--surface-muted,#f6f9f7);padding:8px;border-radius:9px;display:grid;gap:5px}
.hf-muted{font-size:11px;color:var(--text-muted,#697975);overflow-wrap:anywhere}
.hf-error{color:#b34343;font-size:12px;overflow-wrap:anywhere;margin:0}
</style>
