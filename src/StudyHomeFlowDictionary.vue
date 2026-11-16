<script setup lang="ts">
import {onMounted,onUnmounted,ref,watch} from 'vue'
import {Search,Volume2,Languages,Bookmark,BookMarked,X} from 'lucide-vue-next'
type Entry={term:string;reading?:string;phonetic?:string;language?:string;en?:string;
 zh?:string;translationJa?:string;tag?:string;example?:string;source?:string}
type Saved={language:string;term:string;entry:Entry|null;is_deleted:boolean}
const props=defineProps<{userId:string}>()
const query=ref(''),language=ref<'auto'|'ja'|'en'|'zh'|'it'>('auto')
const results=ref<Entry[]>([]),saved=ref<Saved[]>([]),tab=ref<'search'|'saved'>('search')
const searching=ref(false),saving=ref(false),loadingSaved=ref(false),error=ref(''),info=ref('')
let generation=0,alive=true
const modes=[{id:'auto',label:'自动'},{id:'ja',label:'日语'},{id:'en',label:'英语'},
 {id:'zh',label:'中文'},{id:'it',label:'IT 术语'}] as const
async function api(path:string,options:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options})
 const data=await response.json().catch(()=>({})) as Record<string,any>
 if(!response.ok)throw Error(String(data.error||data.code||'服务暂时不可用'))
 return data
}
async function search(){
 const q=query.value.normalize('NFKC').trim()
 if(!q||q.length>100){error.value='请输入 1～100 个字的单词或短句';return}
 const rev=++generation,actor=props.userId
 searching.value=true;error.value='';info.value='';results.value=[]
 try{
  const data=await api('/api/dictionary?'+new URLSearchParams({q,lang:language.value}))
  if(rev!==generation||actor!==props.userId||!alive)return
  if(!Array.isArray(data.items))throw Error('词典结果格式异常')
  results.value=data.items
  if(!results.value.length)info.value='没有找到可靠词条，可以尝试切换语言'
 }catch(e){if(rev===generation&&alive)error.value=(e as Error).message}
 finally{if(rev===generation&&alive)searching.value=false}
}
async function loadSaved(){
 const rev=generation,actor=props.userId
 loadingSaved.value=true;error.value=''
 try{
  let after:string|null=null,all:Saved[]=[]
  for(let page=0;page<50;page++){
   const params=new URLSearchParams({limit:'20'})
   if(after)params.set('after',after)
   const data=await api('/api/homeflow-study/vocabulary?'+params)
   if(!alive||rev!==generation||actor!==props.userId)return
   if(data.ok!==true||data.scope!=='user'||data.actor_user_id!==actor||
    !Array.isArray(data.items))throw Error('生词本身份核验失败')
   all=[...all,...data.items]
   after=typeof data.next_cursor==='string'?data.next_cursor:null
   if(!after)break
  }
  if(alive&&rev===generation)saved.value=all.filter(w=>w.is_deleted===false)
 }catch(e){if(alive&&rev===generation)error.value=(e as Error).message}
 finally{if(alive&&rev===generation)loadingSaved.value=false}
}
function key(entry:Entry){return (entry.language==='ja'||entry.language==='en'||
 entry.language==='zh'?entry.language:'auto')+':'+entry.term}
function already(entry:Entry){return saved.value.some(w=>w.language+':'+w.term===key(entry))}
async function toggle(entry:Entry){
 if(saving.value)return
 const actor=props.userId,rev=generation,k=key(entry),found=already(entry)
 saving.value=true;error.value='';info.value=''
 try{
  const data=await api('/api/homeflow-study/vocabulary',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(found?
    {expected_user_id:actor,language:k.split(':')[0],term:entry.term,action:'remove'}:
    {expected_user_id:actor,language:k.split(':')[0],term:entry.term,action:'save',
     explicit:true,entry:{term:entry.term,reading:entry.reading||'',phonetic:entry.phonetic||'',
      language:entry.language||'auto',en:entry.en||'',zh:entry.zh||'',
      translationJa:entry.translationJa||'',tag:entry.tag||'',example:entry.example||''}})
  })
  if(!alive||rev!==generation||actor!==props.userId)return
  if(data.ok!==true||data.actor_user_id!==actor||data.term!==entry.term||
   data.saved===found)throw Error('收藏结果需要重新确认')
  info.value=found?'已从个人生词本移除':'已保存到个人生词本'
  await loadSaved()
 }catch(e){if(alive&&rev===generation)error.value=(e as Error).message}
 finally{if(alive&&rev===generation)saving.value=false}
}
function speak(entry:Entry,lang:'ja-JP'|'en-US'|'zh-CN'){
 if(!window.speechSynthesis)return
 const term=lang==='en-US'?entry.en||entry.term:lang==='ja-JP'?
  entry.translationJa||entry.reading||entry.term:entry.zh||entry.term
 window.speechSynthesis.cancel()
 const utterance=new SpeechSynthesisUtterance(term);utterance.lang=lang;utterance.rate=.9
 window.speechSynthesis.speak(utterance)
}
function switchTab(t:'search'|'saved'){tab.value=t;error.value='';info.value='';if(t==='saved')void loadSaved()}
watch(()=>props.userId,()=>{generation++;results.value=[];saved.value=[];query.value='';void loadSaved()})
onMounted(()=>{void loadSaved()})
onUnmounted(()=>{alive=false;generation++;window.speechSynthesis?.cancel()})
</script>
<template>
 <section class="section-block module-page-section" aria-label="知学词典与个人生词本">
  <div class="section-heading"><div><h2>词典与 IT 术语</h2>
   <p>中日英互译 · 多语言发音 · 个人生词本</p></div></div>
  <div class="dictionary-view-switch" role="group" aria-label="词典页面">
   <button :class="{active:tab==='search'}" :aria-pressed="tab==='search'" @click="switchTab('search')">查词</button>
   <button :class="{active:tab==='saved'}" :aria-pressed="tab==='saved'" @click="switchTab('saved')">生词本（{{saved.length}}）</button>
  </div>
  <template v-if="tab==='search'">
   <div class="dictionary-search">
    <div class="dictionary-language-switch" role="group" aria-label="词典语言">
     <button v-for="m in modes" :key="m.id" :class="{active:language===m.id}"
      :aria-pressed="language===m.id" @click="language=m.id">{{m.label}}</button>
    </div>
    <form class="search-box" @submit.prevent="search">
     <Search :size="18"/><input v-model="query" type="search" maxlength="100"
      aria-label="查词" placeholder="输入中文、日语、英文或 IT 缩写…"/>
     <button v-if="query" type="button" class="clear-search" aria-label="清空查询"
      @click="query='';results=[]"><X :size="17"/></button>
     <button type="submit" class="primary-button" :disabled="searching">{{searching?'查询中':'搜索'}}</button>
    </form>
    <p>词典查询与个人生词本分开；收藏后只保存到当前 HomeFlow 账号。</p>
   </div>
   <div class="dictionary-list">
    <article v-for="entry in results" :key="(entry.language||'auto')+':'+entry.term" class="dictionary-card">
     <div class="dict-main">
      <div class="dict-term-row"><h3>{{entry.term}}</h3><span class="reading">{{entry.reading||entry.phonetic||''}}</span>
       <span v-if="entry.tag" class="dict-tag">{{entry.tag}}</span></div>
      <div v-if="entry.en" class="dict-en">{{entry.en}}</div>
      <p v-if="entry.zh">{{entry.zh}}</p>
      <p v-if="entry.translationJa">{{entry.translationJa}}</p>
      <p v-if="entry.example">{{entry.example}}</p>
     </div>
     <div class="dict-actions">
      <button class="round-action" type="button" aria-label="英语发音" @click="speak(entry,'en-US')"><Volume2 :size="15"/>EN</button>
      <button class="round-action" type="button" aria-label="日语发音" @click="speak(entry,'ja-JP')"><Languages :size="15"/>日</button>
      <button class="round-action" type="button" aria-label="中文发音" @click="speak(entry,'zh-CN')"><Volume2 :size="15"/>中</button>
      <button class="round-action" type="button" :class="{saved:already(entry)}"
       :disabled="saving" :aria-label="already(entry)?'取消收藏':'收藏词条'" @click="toggle(entry)">
       <Bookmark :size="17"/></button>
     </div>
    </article>
   </div>
  </template>
  <template v-else>
   <div class="section-heading"><div><h2>生词本</h2><p>已从旧知学导入的收藏也显示在这里。</p></div></div>
   <div v-if="loadingSaved" class="dictionary-status">同步本人收藏中…</div>
   <div v-else-if="!saved.length" class="empty-state"><BookMarked :size="25"/>
    <strong>还没有收藏词条</strong><p>在查词页点击书签就可以收藏。</p></div>
   <div v-else class="saved-vocabulary-list">
    <article v-for="w in saved" :key="w.language+':'+w.term" class="saved-vocabulary-row">
     <div class="saved-vocabulary-header"><div class="saved-vocabulary-title">
      <h3>{{w.term}}</h3><span class="saved-vocabulary-tag">{{w.language.toUpperCase()}}</span></div></div>
     <div class="saved-vocabulary-definitions"><p>{{w.entry?.zh||w.entry?.en||w.entry?.translationJa||'暂无释义'}}</p></div>
     <div class="saved-vocabulary-footer"><button class="saved-remove-button" :disabled="saving"
      @click="toggle({...(w.entry||{}),term:w.term,language:w.language})"><Bookmark :size="14"/>取消收藏</button></div>
    </article>
   </div>
  </template>
  <p v-if="error" class="dictionary-status dictionary-error" role="alert">{{error}}</p>
  <p v-if="info" class="dictionary-status" role="status">{{info}}</p>
 </section>
</template>
