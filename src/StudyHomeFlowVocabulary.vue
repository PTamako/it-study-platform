<script setup lang="ts">
import {onMounted,onUnmounted,ref} from 'vue'
type Word={language:string;term:string;entry:{zh?:string}|null;is_deleted:boolean}
type Intent={expected_user_id:string;language:string;term:string;action:'save'|'remove';
 explicit?:true;entry?:{term:string;zh:string}}
const props=defineProps<{userId:string;role:'owner'|'member'}>()
const ready=ref(false),opened=ref(false),busy=ref(false),loading=ref(false),error=ref('')
const words=ref<Word[]>([]),after=ref<string|null>(null),term=ref(''),zh=ref('')
const language=ref<'ja'|'en'|'zh'>('ja'),pending=ref<Intent|null>(null)
const importCursor=ref<string|null>(null),importRequest=ref<Record<string,unknown>|null>(null)
let epoch=0,alive=true
async function api(url:string,options:RequestInit={}){
 const res=await fetch(url,{credentials:'same-origin',cache:'no-store',...options})
 const result=await res.json().catch(()=>({})) as Record<string,any>
 if(!res.ok)throw Error(String(result.code||'个人生词本暂不可用'))
 return result
}
function clear(){epoch++;words.value=[];after.value=null;error.value=''}
async function check(){
 const n=++epoch,actor=props.userId
 try{
  const data=await api('/api/homeflow-study/vocabulary?limit=1')
  if(!alive||n!==epoch||actor!==props.userId)return
  ready.value=data.ok===true&&data.scope==='user'&&data.actor_user_id===actor
  if(opened.value&&ready.value)void load()
 }catch{if(alive&&n===epoch){ready.value=false;clear()}}
}
async function load(more=false){
 if(!ready.value||!opened.value||loading.value||busy.value||(more&&!after.value))return
 const n=++epoch,actor=props.userId,cursor=more?after.value:null
 loading.value=true;error.value=''
 if(!more){words.value=[];after.value=null}
 try{
  const query=new URLSearchParams({limit:'10'})
  if(cursor)query.set('after',cursor)
  const data=await api('/api/homeflow-study/vocabulary?'+query)
  if(!alive||n!==epoch||actor!==props.userId||!opened.value)return
  if(data.ok!==true||data.scope!=='user'||data.actor_user_id!==actor||
   !Array.isArray(data.items)||data.items.some((w:Word)=>
    typeof w.term!=='string'||w.is_deleted!==false||!w.entry))
   throw Error('生词身份核对不一致')
  words.value=more?[...words.value,...data.items]:data.items
  after.value=typeof data.next_cursor==='string'?data.next_cursor:null
 }catch(e){if(alive&&n===epoch)error.value=(e as Error).message}
 finally{if(alive&&n===epoch)loading.value=false}
}
function toggle(){if(busy.value||loading.value)return;opened.value=!opened.value;clear();if(opened.value)void load()}
async function submit(){
 const intent=pending.value,actor=props.userId,n=epoch
 if(!intent||busy.value||actor!==intent.expected_user_id)return
 busy.value=true;error.value='';let success=false
 try{
  const data=await api('/api/homeflow-study/vocabulary',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(intent)})
  if(!alive||n!==epoch||actor!==props.userId)return
  if(data.ok!==true||data.actor_user_id!==actor||data.term!==intent.term||
   data.language!==intent.language||data.saved!==(intent.action==='save'))
   throw Error('结果尚未确认，请按原内容重试')
  pending.value=null;success=true
  if(intent.action==='save'){term.value='';zh.value=''}
 }catch(e){if(alive&&n===epoch)error.value=(e as Error).message}
 finally{if(alive&&n===epoch)busy.value=false}
 if(success)void load()
}
function save(){
 if(busy.value||pending.value||importRequest.value||!term.value.trim()||
  term.value.length>100||zh.value.length>500)return
 pending.value={expected_user_id:props.userId,language:language.value,
  term:term.value.trim(),action:'save',explicit:true,entry:{term:term.value.trim(),zh:zh.value.trim()}}
 void submit()
}
function remove(word:Word){
 if(busy.value||pending.value||importRequest.value||!window.confirm('确认移除此个人收藏？'))return
 pending.value={expected_user_id:props.userId,language:word.language,term:word.term,action:'remove'}
 void submit()
}
async function adopt(){
 if(props.role!=='owner'||busy.value||pending.value||loading.value||!ready.value)return
 if(!importRequest.value){
  if(!window.confirm('确认只把原知学历史生词导入管理员本人空间？原数据不删除。'))return
  importRequest.value={confirm:true,expected_user_id:props.userId,
   ...(importCursor.value?{after:importCursor.value}:{})}
 }
 const frozen=importRequest.value,n=epoch,actor=props.userId
 busy.value=true;error.value='';let success=false
 try{
  const data=await api('/api/homeflow-study/vocabulary/legacy/adopt',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(frozen)})
  if(!alive||n!==epoch||actor!==props.userId)return
  if(data.ok!==true||data.scope!=='owner_only'||!Number.isSafeInteger(data.adopted)||
   typeof data.has_more!=='boolean'||(data.has_more&&typeof data.next_cursor!=='string'))
   throw Error('导入回执未确认，请原样重试')
  importCursor.value=data.has_more?data.next_cursor:null;importRequest.value=null;success=true
 }catch(e){if(alive&&n===epoch)error.value=(e as Error).message}
 finally{if(alive&&n===epoch)busy.value=false}
 if(success)void load()
}
function resume(){
 if(document.visibilityState!=='visible')return
 clear();ready.value=false;void check()
}
onMounted(()=>{void check();document.addEventListener('visibilitychange',resume)})
onUnmounted(()=>{
 alive=false;clear();pending.value=null;importRequest.value=null
 document.removeEventListener('visibilitychange',resume)
})
</script>
<template>
 <section v-if="ready" class="personal-vocab" aria-label="个人生词本">
  <div class="head"><strong>本人 HomeFlow 生词本</strong>
   <button type="button" :aria-expanded="opened" :disabled="busy||loading" @click="toggle">{{opened?'收起':'查看'}}</button>
  </div>
  <template v-if="opened">
   <p class="note">每位成员独立保存，不从另一账号或旧本机缓存自动继承。</p>
   <p v-if="error" class="err" role="alert">{{error}}</p>
   <button v-if="pending" :disabled="busy" @click="submit">保存结果待确认 · 原样重试</button>
   <form v-else class="form" @submit.prevent="save">
    <label>语言<select v-model="language" :disabled="busy">
     <option value="ja">日语</option><option value="en">英语</option><option value="zh">中文</option>
    </select></label>
    <label>单词<input v-model="term" maxlength="100" required :disabled="busy"/></label>
    <label>中文意思<input v-model="zh" maxlength="500" :disabled="busy"/></label>
    <button type="submit" :disabled="busy||!term.trim()||!!importRequest">收藏</button>
   </form>
   <p v-if="loading" class="note">读取中…</p>
   <ul class="list">
    <li v-for="w in words" :key="w.language+':'+w.term">
     <span>{{w.term}} · {{w.entry?.zh||''}}</span>
     <button type="button" :disabled="busy||!!pending||!!importRequest" @click="remove(w)">移除</button>
    </li>
   </ul>
   <button v-if="after" :disabled="busy||loading||!!pending" @click="load(true)">更多</button>
   <template v-if="role==='owner'">
    <p class="note">历史生词每批最多导入20条，仅管理员明确确认。</p>
    <button :disabled="busy||loading||!!pending" @click="adopt">{{importRequest?'重试原导入':'核对并导入本人旧生词'}}</button>
    <p v-if="importCursor" class="note">有下一批可继续导入</p>
   </template>
  </template>
 </section>
</template>
<style scoped>
.personal-vocab{display:grid;gap:9px;min-width:0;border-top:1px solid var(--border-color,#ddd);padding-top:12px}
.head,.list li{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.head strong{font-size:13px}
.personal-vocab button{font:inherit;min-height:42px;border:1px solid var(--border-color,#ddd);
 border-radius:10px;padding:7px 12px;background:transparent;color:inherit;font-size:12px}
.personal-vocab button:disabled{opacity:.5}
.form,.form label,.list{display:grid;gap:8px;min-width:0}
.form label,.list span{font-size:12px}
.form input,.form select{width:100%;box-sizing:border-box;min-width:0;
 padding:8px;border:1px solid var(--border-color,#ddd);border-radius:10px;font:inherit}
.list{list-style:none;padding:0;margin:0}
.list li{border:1px solid var(--border-color,#ddd);border-radius:10px;padding:8px}
.note{margin:0;font-size:11px;color:var(--text-muted,#777)}
.err{font-size:12px;color:#b44242}
</style>