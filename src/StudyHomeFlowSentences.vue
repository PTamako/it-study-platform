<script setup lang="ts">
import {onMounted,onUnmounted,ref} from 'vue'
type Card={card_id:string;language:'ja'|'en';sentence:string;translation_zh:string;
 notes:string;version:number;updated_at:string}
type Mutation={expected_user_id:string;card_id:string;expected_version:number;
 action:'save'|'remove';language?:'ja'|'en';sentence?:string;
 translation_zh?:string;notes?:string}
const props=defineProps<{userId:string}>()
const enabled=ref(false),opened=ref(false),busy=ref(false),loading=ref(false),error=ref('')
const cards=ref<Card[]>([]),next=ref<string|null>(null)
const language=ref<'ja'|'en'>('ja'),sentence=ref(''),meaning=ref(''),notes=ref('')
const editing=ref<string|null>(null),pending=ref<Mutation|null>(null)
let epoch=0
async function api(path:string,options:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options})
 const payload=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(payload.code||'句子卡操作失败'))
 return payload
}
async function check(){
 const revision=++epoch,actor=props.userId
 try{
  const r=await api('/api/homeflow-study/sentences/status')
  if(revision!==epoch||actor!==props.userId)return
  enabled.value=r.enabled===true&&r.scope==='user'&&r.legacy_access===false
  if(!enabled.value){cards.value=[];next.value=null}
 }catch{if(revision===epoch)enabled.value=false}
}
async function load(reset=true){
 if(!enabled.value||!opened.value||busy.value||loading.value)return
 const revision=++epoch,actor=props.userId
 loading.value=true;error.value=''
 const after=reset?'':next.value||''
 if(reset){cards.value=[];next.value=null}
 try{
  const query=new URLSearchParams({limit:'10'});if(after)query.set('after',after)
  const payload=await api('/api/homeflow-study/sentences?'+query)
  if(revision!==epoch||actor!==props.userId||!opened.value)return
  if(payload.ok!==true||payload.scope!=='user'||payload.actor_user_id!==actor||
   !Array.isArray(payload.items)||payload.items.some((x:Card)=>
    !/^[0-9a-f]{32}$/.test(x.card_id)||!Number.isSafeInteger(x.version)))
   throw Error('句子卡身份或版本数据异常')
  cards.value=reset?payload.items:[...cards.value,...payload.items]
  next.value=typeof payload.next_cursor==='string'?payload.next_cursor:null
 }catch(e){if(revision===epoch)error.value=(e as Error).message}
 finally{if(revision===epoch)loading.value=false}
}
function toggle(){
 if(loading.value||busy.value)return
 opened.value=!opened.value
 if(opened.value)void load()
 else{epoch++;cards.value=[];next.value=null;error.value=''}
}
function edit(card:Card){
 if(busy.value||pending.value)return
 editing.value=card.card_id;language.value=card.language
 sentence.value=card.sentence;meaning.value=card.translation_zh;notes.value=card.notes
}
function resetEditor(){
 editing.value=null;language.value='ja';sentence.value='';meaning.value='';notes.value=''
}
function compose(){
 const existing=cards.value.find(x=>x.card_id===editing.value)
 return {expected_user_id:props.userId,card_id:existing?.card_id||
  crypto.randomUUID().replace(/-/g,''),expected_version:existing?.version||0,
  action:'save' as const,language:language.value,sentence:sentence.value.trim(),
  translation_zh:meaning.value.trim(),notes:notes.value.trim()}
}
async function save(){
 if(!enabled.value||!opened.value||busy.value||!sentence.value.trim()||
  sentence.value.length>700||meaning.value.length>700||notes.value.length>500)return
 if(!pending.value)pending.value=compose()
 await submit()
}
async function remove(card:Card){
 if(!enabled.value||!opened.value||busy.value||pending.value||
  !window.confirm('确认将这张句子卡从本人学习空间移除？'))return
 pending.value={expected_user_id:props.userId,card_id:card.card_id,
  expected_version:card.version,action:'remove'}
 await submit()
}
async function submit(){
 const intent=pending.value,revision=epoch,actor=props.userId
 if(!intent||busy.value||actor!==intent.expected_user_id||!opened.value)return
 busy.value=true;error.value=''
 try{
  const payload=await api('/api/homeflow-study/sentences',{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(intent)
  })
  if(revision!==epoch||actor!==props.userId)return
  if(payload.ok!==true||payload.scope!=='user'||payload.actor_user_id!==actor||
   payload.card_id!==intent.card_id||!Number.isSafeInteger(payload.version))
   throw Error('句子卡回执身份或版本不匹配，保留原请求供安全重试')
  pending.value=null
  if(intent.action==='save')resetEditor()
  busy.value=false
  await load()
 }catch(e){if(revision===epoch)error.value=(e as Error).message}
 finally{if(revision===epoch)busy.value=false}
}
function resume(){
 if(document.visibilityState!=='visible'||busy.value)return
 epoch++;cards.value=[];next.value=null
 void check().then(()=>{if(opened.value&&enabled.value)void load()})
}
onMounted(()=>{void check();document.addEventListener('visibilitychange',resume)})
onUnmounted(()=>{
 epoch++;cards.value=[];pending.value=null;opened.value=false
 document.removeEventListener('visibilitychange',resume)
})
</script>
<template>
 <section v-if="enabled" class="hf-sentences" aria-label="个人句子卡">
  <div class="head"><strong>个人句子卡</strong>
   <button type="button" :aria-expanded="opened" @click="toggle">{{opened?'收起':'查看'}}</button>
  </div>
  <template v-if="opened">
   <p class="sub">只保存在当前 HomeFlow 本人空间；不读取另一位成员的句子卡，也不自动认领旧数据。</p>
   <p v-if="error" role="alert" class="err">{{error}}</p>
   <p v-if="pending" class="sub">上一笔保存结果尚待核对。请用原请求重试，不要新建重复记录。</p>
   <button v-if="pending" :disabled="busy" @click="submit">重试原操作</button>
   <form v-else class="editor" @submit.prevent="save">
    <label>语言
     <select v-model="language" :disabled="busy">
      <option value="ja">日语</option><option value="en">英语</option>
     </select>
    </label>
    <label>例句<textarea v-model="sentence" maxlength="700" required :disabled="busy" rows="2"/></label>
    <label>中文含义<textarea v-model="meaning" maxlength="700" :disabled="busy" rows="2"/></label>
    <label>笔记<textarea v-model="notes" maxlength="500" :disabled="busy" rows="2"/></label>
    <div class="actions">
     <button type="submit" :disabled="busy||!sentence.trim()">{{editing?'更新句子卡':'保存到本人空间'}}</button>
     <button v-if="editing" type="button" :disabled="busy" @click="resetEditor">取消编辑</button>
    </div>
   </form>
   <p v-if="loading" class="sub">读取中…</p>
   <ul class="cards">
    <li v-for="card in cards" :key="card.card_id">
     <strong>{{card.sentence}}</strong><span>{{card.translation_zh}}</span>
     <small v-if="card.notes">{{card.notes}}</small>
     <div class="actions">
      <button :disabled="busy||!!pending" @click="edit(card)">编辑</button>
      <button :disabled="busy||!!pending" @click="remove(card)">移除</button>
     </div>
    </li>
   </ul>
   <button v-if="next" :disabled="busy||loading||!!pending" @click="load(false)">加载更多</button>
   <p class="sub">文书助手句子同步尚未授权执行，不能绕过家庭审批直接导入。</p>
  </template>
 </section>
</template>
<style scoped>
.hf-sentences{box-sizing:border-box;display:grid;gap:9px;min-width:0;padding:12px 0;
 border-top:1px solid var(--border-color,#ddd)}
.head,.actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.head strong{font-size:13px}
.sub{font-size:11px;color:var(--text-muted,#777);margin:0;line-height:1.5}
.err{font-size:12px;color:#b44242;margin:0;overflow-wrap:anywhere}
.editor,.cards{display:grid;gap:8px;min-width:0}
.editor label{display:grid;gap:4px;font-size:12px}
.editor textarea,.editor select{font:inherit;min-width:0;width:100%;box-sizing:border-box;
 border:1px solid var(--border-color,#ddd);border-radius:10px;padding:8px}
.cards{list-style:none;padding:0;margin:0}
.cards li{display:grid;gap:6px;min-width:0;border:1px solid var(--border-color,#ddd);
 border-radius:10px;padding:10px}
.cards strong{font-size:13px;overflow-wrap:anywhere}
.cards span,.cards small{font-size:12px;overflow-wrap:anywhere}
.hf-sentences button{font:inherit;min-height:42px;padding:7px 12px;font-size:12px;
 border:1px solid var(--border-color,#ddd);border-radius:10px;background:transparent;color:inherit}
.hf-sentences button:disabled{opacity:.5}
</style>