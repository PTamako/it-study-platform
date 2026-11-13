<script setup lang="ts">
import {onMounted,ref} from 'vue'
import StudyHomeFlowDailyTasks from './StudyHomeFlowDailyTasks.vue'
import StudyHomeFlowGrammar from './StudyHomeFlowGrammar.vue'
import StudyHomeFlowLanguage from './StudyHomeFlowLanguage.vue'
import StudyHomeFlowExams from './StudyHomeFlowExams.vue'
import StudyHomeFlowMock from './StudyHomeFlowMock.vue'

type Identity={user_id:string;household_id:string;role:'owner'|'member';display_name:string}
type Pending={state:string;resume_secret:string;expires_at:number}
const KEY='zhixue:homeflow-sso-pending-v1'
const hex=/^[a-f0-9]{64}$/i
const enabled=ref(false)
const loading=ref(false)
const busy=ref(false)
const error=ref('')
const identity=ref<Identity|null>(null)
const pending=ref<Pending|null>(null)

// This is a five-minute, one-time PWA resume proof, never a HomeFlow access
// token or study session. It must survive Safari leaving the installed PWA.
function clearPending(){
 try{localStorage.removeItem(KEY)}catch{/* Storage can be disabled. */}
 pending.value=null
}
function restorePending(){
 try{
  const raw=localStorage.getItem(KEY)
  if(!raw)return
  const value=JSON.parse(raw) as Partial<Pending>
  if(!hex.test(value.state||'')||!hex.test(value.resume_secret||'')||
   !Number.isFinite(value.expires_at)||Number(value.expires_at)<=Date.now()){
   clearPending();return
  }
  pending.value=value as Pending
 }catch{clearPending()}
}
async function api(path:string,options:RequestInit={}){
 const res=await fetch('/api/homeflow-sso/'+path,{
  credentials:'same-origin',cache:'no-store',...options
 })
 const value=await res.json().catch(()=>({})) as Record<string,any>
 if(!res.ok)throw Error(String(value.code||'授权服务暂不可用'))
 return value
}
async function check(){
 loading.value=true;error.value='';identity.value=null
 restorePending()
 try{
  const status=await api('status')
  enabled.value=status.enabled===true
  if(!enabled.value){clearPending();return}
  const res=await fetch('/api/homeflow-sso/me',{
   cache:'no-store',credentials:'same-origin'
  })
  if(res.ok){
   const value=await res.json() as {identity?:Identity}
   identity.value=value.identity||null
   if(identity.value)clearPending()
  }
 }catch{
  // The feature remains invisible while its backend is disabled/unavailable.
  enabled.value=false
 }finally{loading.value=false}
}
async function begin(){
 if(busy.value||!enabled.value)return
 busy.value=true;error.value=''
 try{
  const result=await api('start',{method:'POST'})
  if(!hex.test(result.state)||!hex.test(result.resume_secret)||
   typeof result.authorization_url!=='string')
   throw Error('授权信息无效')
  const url=new URL(result.authorization_url)
  if(url.protocol!=='https:'||url.pathname!=='/authorize')
   throw Error('授权地址不安全')
  const expires=Number(result.expires_in)
  const value:Pending={state:result.state,resume_secret:result.resume_secret,
   expires_at:Date.now()+Math.min(300,Math.max(1,expires||300))*1000}
  localStorage.setItem(KEY,JSON.stringify(value))
  pending.value=value
  window.location.assign(url.toString())
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
async function complete(){
 if(busy.value||!pending.value)return
 if(pending.value.expires_at<=Date.now()){clearPending();error.value='授权已过期，请重新登录';return}
 busy.value=true;error.value=''
 try{
  const proof=pending.value
  const value=await api('complete',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({state:proof.state,resume_secret:proof.resume_secret})
  })
  // Identity cookie is HttpOnly; no token, assertion, or code enters storage.
  if(value.ok!==true)throw Error('授权未完成')
  clearPending()
  await check()
  if(!identity.value)throw Error('已关联，请重新打开知学检查登录状态')
 }catch(e){
  // Returning before Safari finished callback is safe to retry within 5 min.
  error.value=(e as Error).message
 }finally{busy.value=false}
}
async function signOut(){
 if(busy.value)return
 busy.value=true;error.value=''
 try{
  await api('logout',{method:'POST'})
  identity.value=null
  clearPending()
 }catch(e){error.value=(e as Error).message}
 finally{busy.value=false}
}
onMounted(()=>{void check()})
</script>

<template>
 <section v-if="enabled" class="hf-study-card" aria-label="HomeFlow 统一账号">
  <div class="hf-title"><strong>HomeFlow 统一账号</strong>
   <span v-if="identity" class="hf-linked">已关联</span>
  </div>
  <p v-if="identity" class="hf-description">
   {{ identity.display_name }} · {{ identity.role==='owner'?'家庭管理员':'家庭成员' }}
  </p>
  <p v-else class="hf-description">使用已有 HomeFlow 账号授权，不需要新建知学密码。</p>
  <p v-if="identity" class="hf-note">每日任务、每日语法、语言卡、练习错题、成绩与 SG/FE 模拟考试使用独立身份接口；其余模块仍待隔离。</p>
  <p v-else-if="pending" class="hf-note">在 Safari 完成授权后，返回此 PWA 点击「完成登录」。</p>
  <p v-if="error" class="hf-error" role="alert">{{ error }}</p>
  <div class="hf-actions">
   <button v-if="identity" type="button" class="hf-secondary" :disabled="busy||loading"
    @click="signOut">退出 HomeFlow 身份</button>
   <template v-else>
    <button v-if="pending" type="button" class="hf-primary" :disabled="busy||loading"
     @click="complete">{{ busy?'处理中…':'完成登录' }}</button>
    <button type="button" :class="pending?'hf-secondary':'hf-primary'"
     :disabled="busy||loading" @click="begin">
     {{ busy?'处理中…':pending?'重新授权':'使用 HomeFlow 登录' }}
    </button>
   </template>
  </div>
  <StudyHomeFlowDailyTasks v-if="identity" :key="identity.user_id"
   :user-id="identity.user_id" :role="identity.role" />
  <StudyHomeFlowGrammar v-if="identity" :key="'grammar:'+identity.user_id"
   :user-id="identity.user_id" :role="identity.role" />
  <StudyHomeFlowLanguage v-if="identity" :key="'language:'+identity.user_id"
   :user-id="identity.user_id" :role="identity.role" />
  <StudyHomeFlowExams v-if="identity" :key="'exams:'+identity.user_id"
   :user-id="identity.user_id" :role="identity.role" />
  <StudyHomeFlowMock v-if="identity" :key="'mock:'+identity.user_id"
   :user-id="identity.user_id" :role="identity.role" />
 </section>
</template>

<style scoped>
.hf-study-card{box-sizing:border-box;width:100%;min-width:0;max-width:560px;
 padding:14px;border:1px solid var(--border-color,#dce5e0);
 border-radius:16px;background:var(--surface,#fff);display:grid;gap:8px}
.hf-title{display:flex;align-items:center;justify-content:space-between;
 gap:8px;font-size:14px}
.hf-linked{font-size:11px;color:#276b54;background:#e8f6ef;
 padding:3px 8px;border-radius:999px}
.hf-description,.hf-note{margin:0;font-size:12px;line-height:1.5}
.hf-note{color:var(--text-muted,#6f777a)}
.hf-error{margin:0;font-size:12px;color:#b44242;overflow-wrap:anywhere}
.hf-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.hf-actions button{min-height:42px;padding:8px 12px;border-radius:11px;
 font:inherit;font-size:13px;cursor:pointer}
.hf-primary{border:1px solid #246c57;background:#246c57;color:white}
.hf-secondary{border:1px solid #9cb4a9;background:transparent;color:inherit}
.hf-actions button:disabled{opacity:.5;cursor:not-allowed}
</style>
