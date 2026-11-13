<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref} from 'vue'
import {tokyoDate} from './daily-tasks'

type ServerRow={task_id:string;study_date:string;completed:boolean;version:number;updated_at:string}
type Task={id:string;title:string;detail:string;completed:boolean;version:number}
type Cursor={after_date:string;after_task:string}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
// IDs deliberately match the original daily task templates. This component
// NEVER reads the legacy shared localStorage keys or /api/daily-tasks API.
const templates=[
 {id:'sg-review',title:'复习 SG 日语关键词',detail:'安全、技术与管理术语'},
 {id:'sg-questions',title:'完成一组考试练习',detail:'做题后核对解析'},
 {id:'japanese-daily',title:'日语 · 日常＋职场',detail:'会话、跟读与复习'},
 {id:'english-daily',title:'英语 TOEIC',detail:'商务词汇、语法与听力'}
]
const ready=ref(false),loading=ref(false),busy=ref(false),error=ref('')
const day=ref(tokyoDate())
const rows=ref<ServerRow[]>([])
const cursor=ref<Cursor|null>(null)
const adoptionStarted=ref(false),adoptionDone=ref(false)
const adoptedTotal=ref(0)
let generation=0
const tasks=computed<Task[]>(()=>{
 const known=new Map(rows.value.map(r=>[r.task_id,r]))
 const fixed=templates.map(t=>({
  ...t,completed:known.get(t.id)?.completed===true,version:known.get(t.id)?.version||0
 }))
 // Historical custom task IDs stay visible to their original owner after
 // explicit migration, but never invent a name or copy another user's cache.
 const extras=rows.value.filter(r=>!templates.some(t=>t.id===r.task_id))
  .map(r=>({id:r.task_id,title:r.task_id,detail:'个人历史任务',
    completed:r.completed,version:r.version}))
 return [...fixed,...extras]
})
const completedCount=computed(()=>tasks.value.filter(t=>t.completed).length)
async function getJson(path:string,options:RequestInit={}){
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...options})
 const data=await res.json().catch(()=>({})) as Record<string,any>
 if(!res.ok)throw Error(String(data.code||'连接失败'))
 return data
}
async function load(){
 const rev=++generation
 loading.value=true;error.value=''
 try{
  const current=tokyoDate()
  if(current!==day.value){day.value=current;rows.value=[]}
  const data=await getJson('/api/homeflow-study/daily-tasks?date='+encodeURIComponent(day.value)+'&limit=50')
  if(rev!==generation)return
  if(data.ok!==true||!Array.isArray(data.items))throw Error('任务读取失败')
  const received=data.items as ServerRow[]
  if(received.some(r=>typeof r.task_id!=='string'||typeof r.completed!=='boolean'||
    !Number.isSafeInteger(r.version)||r.version<1))throw Error('任务数据需要核验')
  rows.value=received
  if(data.next_cursor)error.value='任务超过 50 项，请在完整历史页面继续查看'
 }catch(e){if(rev===generation){rows.value=[];error.value=(e as Error).message}}
 finally{if(rev===generation)loading.value=false}
}
async function check(){
 const rev=++generation
 try{
  const status=await getJson('/api/homeflow-study/daily-tasks/status')
  if(rev!==generation)return
  ready.value=status.enabled===true&&status.scope==='user'
  if(ready.value)await load()
  else rows.value=[]
 }catch{if(rev===generation){ready.value=false;rows.value=[]}}
}
async function toggle(t:Task){
 if(!ready.value||loading.value||busy.value)return
 busy.value=true;error.value=''
 try{
  const data=await getJson('/api/homeflow-study/daily-tasks',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({task_id:t.id,study_date:day.value,
    completed:!t.completed,version:t.version})
  })
  if(data.ok!==true||data.scope!=='user')throw Error('任务保存需要核验')
  await load()
 }catch(e){error.value=(e as Error).message;await load()}
 finally{busy.value=false}
}
async function adopt(){
 if(props.role!=='owner'||!ready.value||busy.value||adoptionDone.value)return
 if(!adoptionStarted.value&&!window.confirm('确认将原知学的每日任务历史复制到当前 HomeFlow 管理员账号？不会更改旧数据。'))return
 busy.value=true;error.value=''
 try{
  const data=await getJson('/api/homeflow-study/daily-tasks/legacy/adopt',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({confirm:true,...(cursor.value||{})})
  })
  if(data.ok!==true||data.scope!=='owner_only')throw Error('历史迁移未完成')
  adoptedTotal.value+=Number(data.adopted||0)
  adoptionStarted.value=true
  cursor.value=data.has_more?data.next_cursor as Cursor:null
  adoptionDone.value=!data.has_more
  await load()
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
function foreground(){
 if(document.visibilityState==='visible'&&!busy.value)void check()
}
onMounted(()=>{void check();document.addEventListener('visibilitychange',foreground)})
onUnmounted(()=>{generation++;rows.value=[];document.removeEventListener('visibilitychange',foreground)})
</script>

<template>
 <section v-if="ready" class="hf-daily" aria-label="HomeFlow 个人每日任务">
  <div class="hf-daily-head">
   <div><strong>我的每日任务</strong>
    <small>{{day}} · {{completedCount}}/{{tasks.length}} 已完成</small>
   </div>
   <button type="button" :disabled="busy||loading" @click="load">刷新</button>
  </div>
  <ul class="hf-task-list">
   <li v-for="t in tasks" :key="t.id">
    <label>
     <input type="checkbox" :checked="t.completed" :disabled="busy||loading"
      @change="toggle(t)">
     <span><strong>{{t.title}}</strong><small>{{t.detail}}</small></span>
    </label>
   </li>
  </ul>
  <div v-if="role==='owner'" class="hf-adoption">
   <button v-if="!adoptionDone" type="button" :disabled="busy||loading"
    @click="adopt">{{adoptionStarted?'继续导入旧任务':'导入我原来的每日任务'}}</button>
   <small v-if="adoptionStarted">{{adoptionDone?'历史导入完成':'可继续导入下一批'}} · 已复制 {{adoptedTotal}} 条</small>
  </div>
  <p v-if="error" class="hf-error" role="alert">{{error}}</p>
  <small class="hf-note">只同步当前 HomeFlow 账号；不读取其他人的任务缓存。</small>
 </section>
</template>

<style scoped>
.hf-daily{min-width:0;display:grid;gap:10px;border-top:1px solid var(--border-color,#dce5e0);padding-top:12px}
.hf-daily-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hf-daily-head>div{display:grid;gap:2px}
.hf-daily-head strong{font-size:13px}
.hf-daily-head small,.hf-task-list small,.hf-adoption small,.hf-note{font-size:11px;color:var(--text-muted,#6f777a)}
.hf-daily button{min-height:38px;border-radius:10px;border:1px solid var(--border-color,#b6c8bf);padding:7px 11px;background:transparent;color:inherit;font:inherit;font-size:12px}
.hf-task-list{display:grid;gap:0;list-style:none;padding:0;margin:0;border:1px solid var(--border-color,#e2e9e5);border-radius:12px;overflow:hidden}
.hf-task-list li+li{border-top:1px solid var(--border-color,#e2e9e5)}
.hf-task-list label{display:flex;align-items:center;gap:10px;padding:10px 12px;min-height:45px;cursor:pointer}
.hf-task-list label input{width:18px;height:18px;accent-color:#28765b;flex:none}
.hf-task-list label span{display:grid;gap:3px;min-width:0}
.hf-task-list label strong{font-size:12px;overflow-wrap:anywhere}
.hf-adoption{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px}
.hf-error{color:#b34343;font-size:12px;overflow-wrap:anywhere;margin:0}
.hf-note{margin:0}
</style>
