// Opt-in signed Wordbook import. The current app is SINGLE USER: reject all other account mappings.
// The bridge NEVER updates existing saved vocabulary definitions.
type BridgeEnv={DB:D1Database,JPDA_BRIDGE_ENABLED?:string,JPDA_BRIDGE_SECRET?:string,JPDA_BRIDGE_STUDY_ACTOR_ID?:string}
const enc=new TextEncoder()
const json=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
async function verify(secret:string,text:string,signature:string){
  if(!/^[0-9a-f]{64}$/i.test(signature))return false
  const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const expected=new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(text)))
  const supplied=Uint8Array.from(signature.match(/.{2}/g)!,h=>parseInt(h,16))
  let diff=0;for(let i=0;i<32;i++)diff|=expected[i]^supplied[i]
  return diff===0
}
export async function documentAssistantBridge(request:Request,env:BridgeEnv):Promise<Response>{
  if(env.JPDA_BRIDGE_ENABLED!=='true')return json({ok:false,error:'bridge_disabled'},404)
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405)
  const secret=env.JPDA_BRIDGE_SECRET
  if(!secret||secret.length<32)return json({ok:false,error:'bridge_not_configured'},503)
  const stamp=request.headers.get('X-DA-Timestamp')||''
  if(!/^\d{13}$/.test(stamp)||Math.abs(Date.now()-Number(stamp))>300000)return json({ok:false,error:'expired_signature'},401)
  const raw=await request.text()
  if(raw.length>9000)return json({ok:false,error:'too_large'},413)
  if(!await verify(secret,`${stamp}\n${raw}`,request.headers.get('X-DA-Signature')||''))return json({ok:false,error:'invalid_signature'},401)
  let body:Record<string,any>
  try{body=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
  const id=body.actor_user_id
  if(!env.JPDA_BRIDGE_STUDY_ACTOR_ID||id!==env.JPDA_BRIDGE_STUDY_ACTOR_ID)
    return json({ok:false,error:'study_account_not_linked'},403)
  if(body.source!=='jp-document-assistant'||body.payload?.operation!=='vocabulary'||
    !/^jda:zhixue:[a-f0-9]{16,64}$/i.test(body.idempotency_key||'')||
    request.headers.get('Idempotency-Key')!==body.idempotency_key)return json({ok:false,error:'invalid_source'},400)
  const p=body.payload
  if(p.language!=='ja'||p.skip_existing!==true||typeof p.term!=='string'||!p.term.trim()||p.term.length>100||
    typeof p.meaning_zh!=='string'||!p.meaning_zh.trim()||p.meaning_zh.length>200||
    /[\d０-９]{5,}|@|〒|\n/.test(p.term))return json({ok:false,error:'invalid_vocabulary'},400)
  const term=p.term.trim()
  const entry={term,language:'ja',reading:typeof p.reading==='string'?p.reading.slice(0,100):'',
    zh:p.meaning_zh.trim(),en:'',tag:'文书',source:'jp-document-assistant'}
  try{
    const inserted=await env.DB.prepare(`INSERT OR IGNORE INTO saved_vocabulary_entries_v2
      (language,term,entry_json,saved_at) VALUES('ja',?1,?2,CURRENT_TIMESTAMP)`)
      .bind(term,JSON.stringify(entry)).run()
    const existed=!inserted.meta?.changes
    // Existing rows (including tombstones) are authoritative. Never overwrite them.
    return json({ok:true,remote_id:`ja:${term}`,reused:existed})
  }catch{return json({ok:false,error:'vocabulary_database_unavailable'},503)}
}
