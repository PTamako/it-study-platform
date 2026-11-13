<script setup lang="ts">
import {computed,onMounted,onUnmounted,reactive,ref} from 'vue'
import {tokyoDate} from './daily-tasks'
import StudyHomeFlowMockReceipts from './StudyHomeFlowMockReceipts.vue'

type Track='exam-sg'|'exam-fe'
type Section='SG'|'A'|'B'
type Question={id:string;topic:string;prompt:string;exam_section:string;
 options:Array<{id:string;text:string}>}
type Paper={track:Track;section:Section;total:number;duration_minutes:number;items:Question[]}
type Pending={submission_id:string;expected_user_id:string;track:Track;section:Section;study_date:string;
 duration_seconds:number;answers:Array<{question_id:string;answer:string}>}
type Result={correct_count:number;total:number;review:Array<{
 id:string;answer:string;explanation:string}>;exam_name:string}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
const enabled=ref(false),track=ref<Track>('exam-sg'),section=ref<Section>('SG')
const busy=ref(false),loading=ref(false),error=ref(''),paper=ref<Paper|null>(null)
const page=ref(0),result=ref<Result|null>(null),pending=ref<Pending|null>(null)
const answers=reactive<Record<string,string>>({})
let createdAt=0,generation=0
const pageSize=5
const visible=computed(()=>paper.value?.items.slice(page.value*pageSize,(page.value+1)*pageSize)||[])
const answered=computed(()=>paper.value?.items.filter(q=>!!answers[q.id]).length||0)
const pages=computed(()=>paper.value?Math.ceil(paper.value.total/pageSize):0)
function reset(){
 generation++;paper.value=null;page.value=0;result.value=null;pending.value=null
 for(const key of Object.keys(answers))delete answers[key]
 createdAt=0;error.value=''
}
async function api(path:string,opts:RequestInit={}){
 const response=await fetch('/api/homeflow-study/exams/mock'+path,{
  credentials:'same-origin',cache:'no-store',...opts})
 const data=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(data.code||'模拟考试服务暂不可用'))
 return data
}
async function check(){
 const rev=++generation
 try{
  const data=await api('/status')
  if(rev!==generation)return
  enabled.value=data.enabled===true&&data.scope==='user'&&data.legacy_access===false
  if(!enabled.value)reset()
 }catch{if(rev===generation){enabled.value=false;reset()}}
}
async function start(){
 if(loading.value||busy.value||pending.value)return
 reset();const rev=++generation
 loading.value=true
 try{
  const sec:Section=track.value==='exam-sg'?'SG':section.value==='B'?'B':'A'
  const data=await api('/questions?track='+track.value+'&section='+sec)
  if(rev!==generation)return
  if(data.ok!==true||data.scope!=='user'||!Array.isArray(data.items)||
   data.items.length!==data.total||!Number.isSafeInteger(data.total)||
   ![20,60].includes(data.total)||data.section!==sec||
   data.items.some((x:Record<string,unknown>)=>!x.id||!Array.isArray(x.options)||
    'answer' in x||'answer_json' in x||'explanation' in x)||
   new Set(data.items.map((x:Question)=>x.id)).size!==data.total)
   throw Error('模拟试卷数据不完整')
  paper.value=data as Paper;createdAt=Date.now();page.value=0
 }catch(e){if(rev===generation)error.value=(e as Error).message}
 finally{if(rev===generation)loading.value=false}
}
async function submit(){
 if(!paper.value||busy.value||pending.value||result.value)return
 if(answered.value!==paper.value.total){error.value='请完成全部题目后再交卷';return}
 if(!window.confirm('交卷后将由服务器判分并保存到你自己的成绩记录。确定交卷？'))return
 const exam=paper.value
 pending.value={submission_id:crypto.randomUUID(),expected_user_id:props.userId,
  track:exam.track,section:exam.section,
  study_date:tokyoDate(),duration_seconds:Math.min(86400,
   Math.max(0,Math.floor((Date.now()-createdAt)/1000))),
  answers:exam.items.map(q=>({question_id:q.id,answer:answers[q.id]}))}
 await retry()
}
async function retry(){
 if(!pending.value||busy.value)return
 const payload=pending.value,rev=generation
 if(payload.expected_user_id!==props.userId){
  error.value='当前 HomeFlow 账号与原交卷账号不同，已阻止跨账号提交。'
  return
 }
 busy.value=true;error.value=''
 try{
  const data=await api('/submit',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(payload)
  })
  if(rev!==generation||props.userId!==payload.expected_user_id)return
  if(data.ok!==true||data.scope!=='user'||data.submission_id!==payload.submission_id||
    !Array.isArray(data.review)||data.review.length!==payload.answers.length)
    throw Error('交卷回执需要核验')
  result.value=data as Result
  pending.value=null
 }catch(e){if(rev===generation)error.value=(e as Error).message}
 finally{if(rev===generation)busy.value=false}
}
function foreground(){
 // Refresh feature status only while idle. Never discard an in-progress paper.
 if(document.visibilityState==='visible'&&!paper.value&&!busy.value)void check()
}
onMounted(()=>{void check();document.addEventListener('visibilitychange',foreground)})
onUnmounted(()=>{
 reset();document.removeEventListener('visibilitychange',foreground)
})
</script>

<template>
 <section v-if="enabled" class="hf-mock" aria-label="HomeFlow 个人模拟考试">
  <div class="hf-title">
   <strong>我的 SG / FE 模拟考试</strong>
   <small>试卷与成绩仅属于当前账号</small>
  </div>
  <div v-if="!paper" class="hf-start">
   <label>考试科目
    <select v-model="track" aria-label="模拟考试科目">
     <option value="exam-sg">SG 信息安全管理</option>
     <option value="exam-fe">FE 基本信息技术者</option>
    </select>
   </label>
   <label v-if="track==='exam-fe'">FE 科目
    <select v-model="section" aria-label="FE 模拟科目">
     <option value="A">科目 A（60 题）</option>
     <option value="B">科目 B（20 题）</option>
    </select>
   </label>
   <button type="button" :disabled="loading||busy" @click="start">
    {{loading?'正在组卷':'开始模拟考试'}}
   </button>
   <small>SG：48 道 A 类＋12 道 B 类；FE 科目 B：算法 16＋信息安全 4。</small>
  </div>
  <template v-else>
   <div class="hf-progress">
    <strong>{{paper.track==='exam-sg'?'SG':'FE '+paper.section}} · {{answered}} / {{paper.total}} 题</strong>
    <small>建议 {{paper.duration_minutes}} 分钟 · 第 {{page+1}}/{{pages}} 页</small>
   </div>
   <div v-if="result" class="hf-summary">
    <strong>考试已交卷：{{result.correct_count}} / {{result.total}} 正确</strong>
    <p>{{result.exam_name}} · 成绩已写入当前账号</p>
   </div>
   <div class="hf-questions">
    <article v-for="q in visible" :key="q.id" class="hf-question">
     <small>{{q.topic}} · {{q.id}}</small>
     <strong>{{q.prompt}}</strong>
     <label v-for="opt in q.options" :key="opt.id" class="hf-option">
      <input v-model="answers[q.id]" type="radio" :name="'mock-'+q.id"
       :value="opt.id" :disabled="!!result||busy||!!pending">
      <span>{{opt.id}}. {{opt.text}}</span>
     </label>
     <div v-if="result" class="hf-answered">
      <span>正确答案：{{result.review.find(r=>r.id===q.id)?.answer}}</span>
      <small>{{result.review.find(r=>r.id===q.id)?.explanation}}</small>
     </div>
    </article>
   </div>
   <div class="hf-navigation">
    <button type="button" :disabled="page===0||busy" @click="page--">上一页</button>
    <button type="button" :disabled="page>=pages-1||busy" @click="page++">下一页</button>
   </div>
   <button v-if="!result&&!pending" type="button" :disabled="busy||loading"
    @click="submit">交卷并保存个人成绩</button>
   <button v-if="pending" type="button" :disabled="busy" @click="retry">
    重试同一次交卷（不会重复计分）
   </button>
   <button v-if="result" type="button" @click="reset">完成 · 返回选卷</button>
   <small v-else>试卷暂存在当前页面；刷新或关闭前请先交卷。</small>
  </template>
  <StudyHomeFlowMockReceipts :key="props.userId"
   :user-id="props.userId" :role="props.role" />
  <p v-if="error" class="hf-error" role="alert">{{error}}</p>
 </section>
</template>

<style scoped>
.hf-mock{display:grid;gap:10px;min-width:0;border-top:1px solid var(--border-color,#dce5e0);padding-top:12px}
.hf-title{display:grid;gap:3px}
.hf-title strong{font-size:13px}
.hf-title small,.hf-start small,.hf-progress small,.hf-mock>small{font-size:11px;color:var(--text-muted,#69776d)}
.hf-start{display:grid;gap:10px}
.hf-start label{display:grid;gap:4px;font-size:12px}
.hf-start select{min-height:41px;min-width:0;border:1px solid var(--border-color,#c9d8d1);
 border-radius:10px;background:var(--surface,#fff);color:inherit;padding:7px;font:inherit}
.hf-mock button{min-height:42px;min-width:0;padding:8px 10px;border:1px solid var(--border-color,#c9d8d1);
 border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:12px}
.hf-mock button:disabled{opacity:.5}
.hf-progress{display:flex;justify-content:space-between;gap:9px;align-items:center}
.hf-progress strong{font-size:12px}
.hf-summary{display:grid;gap:5px;padding:12px;border-radius:12px;background:#e8f3ed;color:#205c44}
.hf-summary strong{font-size:13px}
.hf-summary p{margin:0;font-size:11px}
.hf-questions{display:grid;gap:9px}
.hf-question{display:grid;gap:9px;padding:12px;border:1px solid var(--border-color,#dce5e0);border-radius:12px;min-width:0}
.hf-question strong{font-size:12px;overflow-wrap:anywhere}
.hf-question small{font-size:11px;color:var(--text-muted,#69776d);overflow-wrap:anywhere}
.hf-option{display:flex;align-items:flex-start;gap:8px;font-size:12px}
.hf-option input{margin-top:2px;accent-color:#267858}
.hf-option span{overflow-wrap:anywhere;min-width:0}
.hf-answered{display:grid;gap:5px;color:#28745b;font-size:12px}
.hf-navigation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.hf-error{margin:0;color:#b34343;font-size:12px;overflow-wrap:anywhere}
</style>
