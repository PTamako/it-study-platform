<script setup lang="ts">
import {onUnmounted,ref} from 'vue'

type Receipt={id:string;track:string;section:string;date:string;created_at:string;
 correct:number;total:number;legacy_imported:boolean}
type Detail={id:string;track:string;section:string;study_date:string;
 legacy_imported:boolean;result:{correct_count:number;total:number;exam_name:string;
 review:Array<{id:string;answer:string;explanation:string}>}}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
const open=ref(false),loading=ref(false),busy=ref(false),error=ref('')
const records=ref<Receipt[]>([]),next=ref<string|null>(null)
const chosen=ref<Detail|null>(null)
const adopted=ref(0),adoptionStarted=ref(false),adoptionFinished=ref(false)
const adoptAfter=ref<string|null>(null)
let revision=0
async function api(path:string,options:RequestInit={}){
 const response=await fetch('/api/homeflow-study/exams/mock'+path,{
  credentials:'same-origin',cache:'no-store',...options})
 const payload=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(payload.code||'历史回执暂不可用'))
 return payload
}
async function list(append=false){
 const rev=++revision
 loading.value=true;error.value=''
 const cursor=append?next.value:null
 if(!append){records.value=[];next.value=null}
 try{
  const payload=await api('/receipts?limit=10'+(cursor?'&after='+encodeURIComponent(cursor):''))
  if(rev!==revision)return
  if(payload.ok!==true||payload.scope!=='user'||!Array.isArray(payload.items))
   throw Error('回执列表读取失败')
  records.value=append?[...records.value,...payload.items]:payload.items
  next.value=typeof payload.next_cursor==='string'?payload.next_cursor:null
 }catch(e){if(rev===revision)error.value=(e as Error).message}
 finally{if(rev===revision)loading.value=false}
}
function toggle(){
 open.value=!open.value
 if(open.value){void list()}
 else {revision++;records.value=[];chosen.value=null;next.value=null;error.value=''}
}
async function show(id:string){
 if(busy.value||loading.value)return
 const rev=++revision
 busy.value=true;error.value='';chosen.value=null
 try{
  const payload=await api('/receipt?id='+encodeURIComponent(id))
  if(rev!==revision)return
  if(payload.ok!==true||payload.scope!=='user'||payload.id!==id||
   !payload.result||!Array.isArray(payload.result.review))throw Error('回执详情需要核验')
  chosen.value=payload as Detail
 }catch(e){if(rev===revision)error.value=(e as Error).message}
 finally{if(rev===revision)busy.value=false}
}
async function adoptLegacy(){
 if(props.role!=='owner'||!open.value||loading.value||busy.value||adoptionFinished.value)return
 if(!adoptionStarted.value&&!window.confirm(
  '将原知学的模拟考试交卷回执复制到你的 HomeFlow 账号？每次最多 5 份，旧试卷不修改。'))return
 busy.value=true;error.value=''
 try{
  const payload=await api('/legacy/adopt',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({confirm:true,...(adoptAfter.value?{after:adoptAfter.value}:{})})
  })
  if(payload.ok!==true||payload.scope!=='owner_only'||payload.legacy_changed!==false)
   throw Error('旧回执导入失败')
  adoptionStarted.value=true
  adopted.value+=Number(payload.adopted||0)
  adoptAfter.value=typeof payload.next_cursor==='string'?payload.next_cursor:null
  adoptionFinished.value=payload.has_more!==true
  await list()
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
onUnmounted(()=>{revision++;chosen.value=null;records.value=[]})
</script>

<template>
 <section class="hf-receipts" aria-label="个人模拟考试历史回执">
  <button type="button" class="hf-toggle" :aria-expanded="open" @click="toggle">
   {{open?'收起历史交卷':'查看我的历史交卷'}}
  </button>
  <template v-if="open">
   <small>仅当前账号可查看完整试卷答案和解析。</small>
   <div v-for="receipt in records" :key="receipt.id" class="hf-receipt">
    <div>
     <strong>{{receipt.date}} · {{receipt.track==='exam-sg'?'SG':'FE '+receipt.section}}</strong>
     <small>{{receipt.correct}} / {{receipt.total}} · {{receipt.legacy_imported?'原账号导入':'当前账号交卷'}}</small>
    </div>
    <button type="button" :disabled="busy||loading" @click="show(receipt.id)">查看答案</button>
   </div>
   <small v-if="!records.length&&!loading">当前账号暂无交卷回执</small>
   <button v-if="next" type="button" :disabled="busy||loading" @click="list(true)">查看更多历史</button>
   <div v-if="role==='owner'" class="hf-import">
    <button v-if="!adoptionFinished" type="button" :disabled="busy||loading"
     @click="adoptLegacy">{{adoptionStarted?'继续导入旧试卷':'导入原账号交卷回执'}}</button>
    <small v-if="adoptionStarted">已复制 {{adopted}} 份 ·
     {{adoptionFinished?'全部完成':'可继续导入下一批'}}</small>
   </div>
   <div v-if="chosen" class="hf-detail">
    <div class="hf-detail-header">
     <strong>{{chosen.result.exam_name}} · {{chosen.result.correct_count}}/{{chosen.result.total}}</strong>
     <button type="button" @click="chosen=null">关闭</button>
    </div>
    <details v-for="(item,i) in chosen.result.review" :key="item.id" class="hf-answer">
     <summary>第 {{i+1}} 题 · {{item.id}}</summary>
     <p>正确答案：{{item.answer}}</p>
     <p>{{item.explanation}}</p>
    </details>
   </div>
   <p v-if="error" role="alert" class="hf-error">{{error}}</p>
  </template>
 </section>
</template>

<style scoped>
.hf-receipts{display:grid;gap:8px;min-width:0;border-top:1px solid var(--border-color,#dce5e0);padding-top:11px}
.hf-receipts button{min-height:39px;min-width:0;border:1px solid var(--border-color,#c8d8ce);
 border-radius:10px;padding:7px 10px;background:transparent;color:inherit;font:inherit;font-size:12px}
.hf-receipts button:disabled{opacity:.5}
.hf-toggle{width:100%}
.hf-receipts small{color:var(--text-muted,#6b7971);font-size:11px}
.hf-receipt{display:flex;justify-content:space-between;align-items:center;gap:8px;
 padding:10px;border:1px solid var(--border-color,#dce5e0);border-radius:11px;min-width:0}
.hf-receipt>div{display:grid;gap:4px;min-width:0}
.hf-receipt strong{font-size:12px;overflow-wrap:anywhere}
.hf-import{display:grid;gap:6px}
.hf-detail{display:grid;gap:6px;border:1px solid var(--border-color,#dce5e0);
 border-radius:12px;padding:9px;min-width:0}
.hf-detail-header{display:flex;justify-content:space-between;align-items:center;gap:8px}
.hf-answer{border-top:1px solid var(--border-color,#dce5e0);padding:8px 0}
.hf-answer summary{font-size:11px;cursor:pointer;overflow-wrap:anywhere}
.hf-answer p{margin:5px 0;font-size:11px;overflow-wrap:anywhere}
.hf-error{margin:0;color:#b34343;font-size:12px;overflow-wrap:anywhere}
</style>
