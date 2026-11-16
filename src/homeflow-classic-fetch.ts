// Only translates network protocols. All Vue markup stays in the ORIGINAL App.vue.
// IMPORTANT: no request may fall back to an unscoped legacy personal API when SSO is active.
// The actor is captured BEFORE network I/O and compared AFTER every response.
type Dict=Record<string,any>
type Actor=()=>string|null
const sharedReadOnly=new Set(['/api/tracks','/api/questions',
 '/api/mock-exam-questions','/api/question-categories','/api/question-classification-stats',
 '/api/question-sources','/api/fe-exemption-sittings','/api/scenarios',
 '/api/language-cards','/api/dictionary'])
const signedShared=new Set(['/api/translate-explanation','/api/dictionary/ai',
 '/api/dictionary/ai/status','/api/fe-question-bank/install'])
const jsonResponse=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,
 headers:{'content-type':'application/json','cache-control':'no-store'}})
function err(code:string,status=409){return jsonResponse({error:code,code},status)}
function bodyOf(init?:RequestInit):Dict|null{
 if(typeof init?.body!=='string')return null
 try{const parsed=JSON.parse(init.body);return parsed&&typeof parsed==='object'&&
  !Array.isArray(parsed)?parsed:null}catch{return null}
}
export function createClassicStudyFetch(actorId:Actor){
 const versions=new Map<string,number>()
 const checked=async(response:Response,actor:string)=>{
  // A stale PWA promise cannot update a new actor's original UI refs.
  if(actorId()!==actor)return err('ACCOUNT_CHANGED',409)
  return response
 }
 const verified=async(response:Response,actor:string)=>{
  if(actorId()!==actor)return err('ACCOUNT_CHANGED',409)
  if(!response.ok)return response
  const payload=await response.clone().json().catch(()=>null) as Dict|null
  if(payload&&(payload.scope&&payload.scope!=='user'||
    payload.actor_user_id&&payload.actor_user_id!==actor))
   return err('ACTOR_RESPONSE_MISMATCH',409)
  return response
 }
 const oldToNew=async(url:URL,init:RequestInit|undefined,actor:string):Promise<Response>=>{
  // Freeze the ORIGINAL actor into every actor-specific network request.
  // A cookie switch between queued operations can never re-attribute writes.
  const api=async(path:string,options?:RequestInit)=>{
   const headers=new Headers(options?.headers)
   headers.set('x-zhixue-expected-actor',actor)
   return globalThis.fetch(path,{...options,headers,
    cache:'no-store',credentials:'same-origin'})
  }
  const post=(path:string,data:Dict)=>api(path,{method:'POST',
   headers:{'content-type':'application/json'},body:JSON.stringify(data)})
  const path=url.pathname,method=(init?.method||'GET').toUpperCase()
  if(path.startsWith('/api/homeflow-sso/'))
   return checked(await globalThis.fetch(url.pathname+url.search,{
    ...init,cache:'no-store',credentials:'same-origin'}),actor)
  if(path.startsWith('/api/homeflow-study/'))
   return verified(await api(url.pathname+url.search,init),actor)
  const payload=bodyOf(init)
  const params=url.searchParams
  if(sharedReadOnly.has(path)&&method==='GET'||signedShared.has(path)){
   return checked(await api(url.pathname+url.search,init),actor)
  }
  if(path==='/api/dashboard'&&method==='GET')
   return verified(await api('/api/homeflow-classic/dashboard'),actor)
  if(path==='/api/question-progress'){
   if(method==='GET'){
    const result=await verified(await api('/api/homeflow-classic/question-progress'+url.search),actor)
    if(result.ok){const data=await result.clone().json() as Dict
     for(const item of data.items||[])versions.set(actor+':q:'+item.question_id,item.version||0)}
    return result
   }
   if(method==='POST'&&payload&&typeof payload.question_id==='string'){
    const key=actor+':q:'+payload.question_id
    const result=await verified(await post('/api/homeflow-classic/question-progress',{
     expected_user_id:actor,question_id:payload.question_id,mastered:payload.mastered,
     expected_version:versions.get(key)||0}),actor)
    if(result.ok){const data=await result.clone().json() as Dict
     if(data.progress)versions.set(key,data.progress.version||0)}
    return result
   }
   return err('INVALID_SCOPED_QUESTION_REQUEST',400)
  }
  if(path==='/api/wrong-questions'&&method==='GET')
   return verified(await api('/api/homeflow-classic/review-questions'+url.search),actor)
  if(path==='/api/attempts'&&method==='POST'&&payload){
   return verified(await post('/api/homeflow-study/exams/attempts',{
    ...payload,expected_user_id:actor}),actor)
  }
  if(path==='/api/scenario-attempts'&&method==='POST'&&payload){
   return verified(await post('/api/homeflow-study/scenarios',{
    ...payload,expected_user_id:actor}),actor)
  }
  if(path==='/api/daily-tasks'){
   if(method==='GET'){
    const date=params.get('date')||new Date(Date.now()+9*3600000).toISOString().slice(0,10)
    const result=await verified(await api('/api/homeflow-study/daily-tasks?'+
     new URLSearchParams({date,limit:'50'})),actor)
    if(!result.ok)return result
    const data=await result.json() as Dict
    for(const x of data.items||[])
     versions.set(actor+':task:'+x.study_date+':'+x.task_id,x.version||0)
    return jsonResponse({items:(data.items||[]).map((x:Dict)=>({
     task_id:x.task_id,study_date:x.study_date,completed:x.completed?1:0,
     updated_at:x.updated_at}))})
   }
   if(method==='POST'&&payload){
    // The original password PWA may try to re-import localStorage tasks.
    // Never silently assign those old snapshots to a HomeFlow actor.
    if(payload.import_only)return err('OLD_DEVICE_IMPORT_REQUIRES_OWNER_VERIFICATION')
    const key=actor+':task:'+payload.study_date+':'+payload.task_id
    const desired=payload.completed===true
    const result=await verified(await post('/api/homeflow-study/daily-tasks',{
     task_id:payload.task_id,study_date:payload.study_date,completed:desired,
     version:versions.get(key)||0}),actor)
    if(result.ok){const data=await result.clone().json() as Dict
     versions.set(key,Number(data.version)||0)}
    return result
   }
  }
  if(path==='/api/language-progress'){
   if(method==='GET'){
    const result=await verified(await api('/api/homeflow-classic/language-progress'),actor)
    if(!result.ok)return result
    const data=await result.json() as Dict
    for(const x of data.items||[])versions.set(actor+':lm:'+x.card_id,x.version||0)
    return jsonResponse({items:data.items||[]})
   }
   if(method==='POST'&&payload){
    if(payload.legacy_card_ids)return err('OLD_LANGUAGE_CACHE_IMPORT_NOT_ALLOWED')
    const id=String(payload.card_id||'')
    const key=actor+':lm:'+id
    const result=await verified(await post('/api/homeflow-study/language/mastery',{
     expected_user_id:actor,card_id:id,mastered:payload.mastered===true,
     version:versions.get(key)||0}),actor)
    if(result.ok){const data=await result.clone().json() as Dict
     versions.set(key,data.version||0)}
    return result
   }
  }
  if(path==='/api/language-review'){
   if(method==='GET'){
    const result=await verified(await api('/api/homeflow-classic/language-review'),actor)
    if(!result.ok)return result
    const data=await result.json() as Dict
    for(const x of data.items||[])versions.set(actor+':lr:'+x.card_id,x.version||0)
    return jsonResponse({items:data.items||[]})
   }
   if(method==='POST'&&payload){
    const id=String(payload.card_id||'')
    const key=actor+':lr:'+id
    const result=await verified(await post('/api/homeflow-study/language/review',{
     card_id:id,grade:payload.result,version:versions.get(key)||0,
     request_id:crypto.randomUUID().replace(/-/g,''),expected_user_id:actor}),actor)
    if(!result.ok)return result
    const data=await result.json() as Dict
    if(data.review)versions.set(key,data.review.version||0)
    return jsonResponse({review:data.review,ok:true})
   }
  }
  if(path==='/api/vocabulary/saved'){
   if(method==='GET'){
    const after=params.get('after')||''
    let cursor=after,items:Dict[]=[],more=false
    for(let step=0;step<10;step++){
     const result=await verified(await api('/api/homeflow-study/vocabulary?'+
      new URLSearchParams({limit:'20',sync:'1',...(cursor?{after:cursor}:{})})),actor)
     if(!result.ok)return result
     const data=await result.json() as Dict
     if(!Array.isArray(data.items))return err('VOCABULARY_PAGE_INVALID',503)
     items=items.concat(data.items.map((x:Dict)=>({
      term:x.term,language:x.language,deleted:x.is_deleted===true,
      entry:x.is_deleted===true?undefined:x.entry})))
     more=typeof data.next_cursor==='string'
     if(!more)break
     cursor=data.next_cursor
    }
    return jsonResponse({items,next:more?cursor:null})
   }
   if(method==='POST'&&payload){
    const result=await verified(await post('/api/homeflow-study/vocabulary',{
     expected_user_id:actor,language:payload.language,term:payload.term,
     action:payload.action==='remove'?'remove':'save',
     ...(payload.action==='remove'?{}:{entry:payload.entry,explicit:true})
    }),actor)
    return result
   }
  }
  if(path==='/api/exam-history'){
   if(method==='GET'){
    let cursor='',items:Dict[]=[]
    for(let step=0;step<25;step++){
     const result=await verified(await api('/api/homeflow-study/exams/history?'+
      new URLSearchParams({limit:'40',...(cursor?{after:cursor}:{})})),actor)
     if(!result.ok)return result
     const data=await result.json() as Dict
     items=items.concat(data.items||[])
     if(!data.next_cursor)return jsonResponse({items})
     cursor=data.next_cursor
    }
    return err('EXAM_HISTORY_TOO_LARGE',503)
   }
   if(method==='POST'&&payload)
    return verified(await post('/api/homeflow-study/exams/history',{
     ...payload,expected_user_id:actor}),actor)
   // Never turn an original UI delete-all request into a shared-table delete.
   if(method==='DELETE')return err('SCOPED_HISTORY_DELETE_NOT_IMPLEMENTED',409)
  }
  if(path==='/api/mock-exam-questions'&&method==='GET'){
   return checked(await api(url.pathname+url.search,init),actor)
  }
  if(path==='/api/mock-exam/submit'&&method==='POST'&&payload)
   return verified(await post('/api/homeflow-study/exams/mock/submit',{
    ...payload,expected_user_id:actor}),actor)
  if(path==='/api/grammar-progress'||path==='/api/listening-progress'){
   const dest=path==='/api/grammar-progress'?'grammar':'listening'
   if(method==='GET')
    return verified(await api('/api/homeflow-study/'+dest+url.search),actor)
   if(method==='POST'&&payload)
    return verified(await post('/api/homeflow-study/'+dest,{
     ...payload,expected_user_id:actor}),actor)
  }
  if(path==='/api/daily-word-reviews'){
   if(method==='GET'){
    let cursor=params.get('after')||'',items:Dict[]=[],more=false
    for(let step=0;step<10;step++){
     const result=await verified(await api('/api/homeflow-study/daily-words'+
      (cursor?'?after='+encodeURIComponent(cursor):'')),actor)
     if(!result.ok)return result
     const data=await result.json() as Dict
     if(!Array.isArray(data.items))return err('WORDS_PAGE_INVALID',503)
     items=items.concat(data.items)
     more=typeof data.next_cursor==='string'
     if(!more)break
     cursor=data.next_cursor
    }
    return jsonResponse({items,next_cursor:more?cursor:null})
   }
   return err('SCOPED_DAILY_WORD_WRITE_REQUIRES_GRADE_API',409)
  }
  // A missed personal route is a security failure, not a fallback to shared SQL.
  return err('UNMAPPED_PERSONAL_API:'+path,403)
 }
 const request=(async(input:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
  const actor=actorId()
  if(!actor)return globalThis.fetch(input,init)
  if(typeof input!=='string'&&! (input instanceof URL))
   return err('UNMAPPED_REQUEST_OBJECT_FOR_SSO',403)
  const raw=String(input),url=new URL(raw,globalThis.location.origin)
  if(url.origin!==globalThis.location.origin)return globalThis.fetch(input,init)
  if(!url.pathname.startsWith('/api/'))return globalThis.fetch(input,init)
  try{return await oldToNew(url,init,actor)}
  catch{return err('SCOPED_API_UNAVAILABLE',503)}
 }) as typeof globalThis.fetch
 return {request,clear:()=>versions.clear()}
}
