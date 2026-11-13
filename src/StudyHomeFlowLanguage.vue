<script setup lang="ts">
import {onMounted,onUnmounted,reactive,ref} from 'vue'

type Card={
 id:string;language:'ja'|'en';category:string;term:string;reading:string;
 meaning_zh:string;example:string;example_meaning_zh:string;
 mastered:boolean;mastery_version:number;review_count:number;correct_streak:number;
 last_grade:string|null;next_review_at:string|null;review_version:number
}
type Kind='mastery'|'reviews'
const importKinds:Kind[]=['mastery','reviews']
type ImportProgress={after:string;total:number;started:boolean;done:boolean}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
const enabled=ref(false),loading=ref(false),busy=ref(false),error=ref('')
const lang=ref<'ja'|'en'>('ja'),cards=ref<Card[]>([])
const nextCursor=ref<string|null>(null)
const adoption=reactive<Record<Kind,ImportProgress>>({
 mastery:{after:'',total:0,started:false,done:false},
 reviews:{after:'',total:0,started:false,done:false}
})
type PendingReview={card_id:string;grade:'again'|'hard'|'remembered';
 version:number;request_id:string}
const pendingReview=ref<PendingReview|null>(null)
let epoch=0
async function api(url:string,options:RequestInit={}){
 const res=await fetch(url,{credentials:'same-origin',cache:'no-store',...options})
 const data=await res.json().catch(()=>({})) as Record<string,any>
 if(!res.ok)throw Error(String(data.code||'学习数据暂不可用'))
 return data
}
async function load(reset=true){
 const revision=++epoch
 loading.value=true;error.value=''
 const after=reset?'':nextCursor.value||''
 if(reset){cards.value=[];nextCursor.value=null}
 try{
  const params=new URLSearchParams({lang:lang.value,limit:'12'})
  if(after)params.set('after',after)
  const payload=await api('/api/homeflow-study/language/cards?'+params)
  if(revision!==epoch)return
  if(payload.ok!==true||payload.scope!=='user'||!Array.isArray(payload.items))
   throw Error('课程卡片读取失败')
  const incoming=payload.items as Card[]
  if(incoming.some(x=>typeof x.id!=='string'||typeof x.mastered!=='boolean'||
    !Number.isSafeInteger(x.mastery_version)||!Number.isSafeInteger(x.review_version)))
   throw Error('课程进度数据需要核验')
  cards.value=reset?incoming:[...cards.value,...incoming]
  nextCursor.value=typeof payload.next_cursor==='string'?payload.next_cursor:null
 }catch(e){if(revision===epoch)error.value=(e as Error).message}
 finally{if(revision===epoch)loading.value=false}
}
async function check(){
 const revision=++epoch
 try{
  const r=await api('/api/homeflow-study/language/status')
  if(revision!==epoch)return
  enabled.value=r.enabled===true&&r.scope==='user'&&r.legacy_access===false
  if(enabled.value)await load()
  else {cards.value=[];nextCursor.value=null}
 }catch{
  if(revision===epoch){enabled.value=false;cards.value=[];nextCursor.value=null}
 }
}
async function setMastery(card:Card){
 if(!enabled.value||busy.value)return
 busy.value=true;error.value=''
 try{
  const payload=await api('/api/homeflow-study/language/mastery',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({card_id:card.id,mastered:!card.mastered,
    version:card.mastery_version})
  })
  if(payload.ok!==true||payload.scope!=='user')throw Error('掌握状态保存失败')
  card.mastered=payload.mastered===true
  card.mastery_version=Number(payload.version)
 }catch(e){const message=(e as Error).message;await load();error.value=message}
 finally{busy.value=false}
}
async function grade(card:Card,value:'again'|'hard'|'remembered'){
 if(!enabled.value||busy.value||pendingReview.value)return
 pendingReview.value={card_id:card.id,grade:value,version:card.review_version,
  request_id:crypto.randomUUID().replace(/-/g,'')}
 await submitGrade()
}
async function submitGrade(){
 const attempt=pendingReview.value
 if(!attempt||busy.value)return
 busy.value=true;error.value=''
 try{
  const payload=await api('/api/homeflow-study/language/review',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(attempt)
  })
  if(payload.ok!==true||payload.scope!=='user'||!payload.review)
   throw Error('复习记录保存失败')
  const card=cards.value.find(c=>c.id===attempt.card_id)
  if(card){
   card.review_version=Number(payload.review.version)
   card.review_count=Number(payload.review.review_count)
   card.correct_streak=Number(payload.review.correct_streak)
   card.last_grade=String(payload.review.last_grade)
   card.next_review_at=String(payload.review.next_review_at)
  }
  pendingReview.value=null
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
async function importLegacy(kind:Kind){
 if(!enabled.value||props.role!=='owner'||busy.value||adoption[kind].done)return
 const state=adoption[kind]
 if(!state.started&&!window.confirm(
  (kind==='mastery'?'掌握进度':'复习计划')+
  '只导入到本人 HomeFlow 账号，不会删除旧资料。确定继续？'
 ))return
 busy.value=true;error.value=''
 try{
  const payload=await api('/api/homeflow-study/language/legacy/adopt',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({confirm:true,kind,...(state.after?{after:state.after}:{})})
  })
  if(payload.ok!==true||payload.scope!=='owner_only'||payload.kind!==kind)
   throw Error('历史导入未完成')
  state.started=true
  state.total+=Number(payload.adopted||0)
  state.done=payload.has_more!==true
  state.after=typeof payload.next_cursor==='string'?payload.next_cursor:''
  await load()
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
function resume(){if(document.visibilityState==='visible'&&!busy.value)void check()}
onMounted(()=>{void check();document.addEventListener('visibilitychange',resume)})
onUnmounted(()=>{
 epoch++;cards.value=[];pendingReview.value=null
 document.removeEventListener('visibilitychange',resume)
})
</script>

<template>
 <section v-if="enabled" class="hf-language" aria-label="HomeFlow 个人语言卡学习">
  <div class="hf-heading">
   <strong>我的语言课程</strong>
   <label>语言
    <select v-model="lang" aria-label="课程语言" :disabled="busy||loading" @change="load(true)">
     <option value="ja">日本语</option>
     <option value="en">English</option>
    </select>
   </label>
  </div>
  <p class="hf-desc">掌握状态和复习次数仅属于当前账号，不与家庭成员共用。</p>
  <div class="hf-cards">
   <details v-for="card in cards" :key="card.id" class="hf-card">
    <summary>
     <span><strong>{{card.term}}</strong><small>{{card.category}} · {{card.meaning_zh}}</small></span>
     <span class="hf-state">{{card.mastered?'已掌握':'学习中'}} · 复习 {{card.review_count}} 次</span>
    </summary>
    <div class="hf-details">
     <p v-if="card.reading">发音：{{card.reading}}</p>
     <p>{{card.example}}</p>
     <p v-if="card.example_meaning_zh">{{card.example_meaning_zh}}</p>
     <small v-if="card.next_review_at">下次复习：{{card.next_review_at}}</small>
     <button class="hf-master" type="button" :disabled="busy||loading||!!pendingReview"
      @click="setMastery(card)">{{card.mastered?'取消掌握':'标记掌握'}}</button>
     <div class="hf-review" aria-label="复习反馈">
      <button type="button" :disabled="busy||loading||!!pendingReview" @click="grade(card,'again')">忘记了</button>
      <button type="button" :disabled="busy||loading||!!pendingReview" @click="grade(card,'hard')">有点难</button>
      <button type="button" :disabled="busy||loading||!!pendingReview" @click="grade(card,'remembered')">记住了</button>
     </div>
    </div>
   </details>
  </div>
  <button v-if="nextCursor" type="button" :disabled="busy||loading"
   @click="load(false)">加载更多课程</button>
  <div v-if="role==='owner'" class="hf-import">
   <strong>迁移原有学习记录</strong>
   <div v-for="kind in importKinds" :key="kind">
    <button v-if="!adoption[kind].done" type="button" :disabled="busy||loading"
     @click="importLegacy(kind)">
     {{adoption[kind].started?'继续导入':'导入'}}{{kind==='mastery'?'掌握记录':'复习记录'}}
    </button>
    <small v-if="adoption[kind].started">{{adoption[kind].done?'已完成':'还可继续'}} · 已复制 {{adoption[kind].total}} 条</small>
   </div>
  </div>
  <button v-if="pendingReview" type="button" :disabled="busy||loading"
   @click="submitGrade">重试上次复习（不重复计次）</button>
  <p v-if="error" class="hf-error" role="alert">{{error}}</p>
 </section>
</template>

<style scoped>
.hf-language{display:grid;gap:10px;min-width:0;border-top:1px solid var(--border-color,#dce5e0);padding-top:12px}
.hf-heading{display:flex;align-items:center;justify-content:space-between;gap:9px;font-size:13px}
.hf-heading label{display:flex;gap:6px;align-items:center;font-size:12px}
.hf-heading select{border:1px solid var(--border-color,#cadbd2);background:var(--surface,#fff);border-radius:9px;min-height:38px;padding:6px}
.hf-desc{margin:0;color:var(--text-muted,#65756b);font-size:11px}
.hf-cards{display:grid;gap:7px}
.hf-card{border:1px solid var(--border-color,#dce5e0);border-radius:12px;min-width:0;overflow:hidden}
.hf-card summary{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px;cursor:pointer}
.hf-card summary>span:first-child{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.hf-card summary strong{font-size:12px}
.hf-card summary small{font-size:11px;color:var(--text-muted,#65756b)}
.hf-state{font-size:11px;color:#276b54;text-align:right;flex-shrink:0}
.hf-details{padding:10px;display:grid;gap:9px;border-top:1px solid var(--border-color,#dce5e0)}
.hf-details p{margin:0;font-size:12px;overflow-wrap:anywhere}
.hf-details small,.hf-import small{font-size:11px;color:var(--text-muted,#65756b)}
.hf-language button{border:1px solid var(--border-color,#b6c8bf);background:transparent;color:inherit;
 font:inherit;font-size:12px;border-radius:10px;min-height:40px;padding:7px 11px}
.hf-language button:disabled{opacity:.5}
.hf-master{justify-self:start}
.hf-review{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.hf-review button{min-width:0}
.hf-import{display:grid;gap:8px;border-top:1px solid var(--border-color,#dce5e0);padding-top:9px;font-size:12px}
.hf-import>div{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap}
.hf-error{margin:0;color:#b34343;font-size:12px;overflow-wrap:anywhere}
</style>
