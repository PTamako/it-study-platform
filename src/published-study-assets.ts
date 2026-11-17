/**
 * Load public, fingerprinted course assets without accidentally treating a
 * stale iOS PWA SPA fallback (HTML with HTTP 200) as a JSON lesson pack.
 *
 * Retrying with a fixed release-specific query bypasses both the old SW's
 * caches.match(request) and WebKit's stale HTTP cache. Never touch private
 * D1 data, personal API paths or a learner's local state.
 */
export type StudyStaticCollection='language-cards'|'learner-lexicon'
export type StudyStaticLanguage='ja'|'en'
type Manifest={version:number;ja:string;en:string}
type Item={language:string;term:string}
const RECOVERY_TAG='zhixue-ios-pwa-static-20261117-1'
const validPath=/^\/(?:language-cards|learner-lexicon)\/(?:ja|en)\.[0-9a-f]{16}\.json$/

async function readJson(url:string,cache:RequestCache,signal?:AbortSignal):Promise<unknown>{
 const response=await fetch(url,{cache,signal})
 if(!response.ok)throw Error('HTTP '+response.status)
 const type=response.headers.get('content-type')||''
 // Cloudflare's SPA fallback returns index.html with status 200 for absent
 // hashes. Safari throws the generic "string did not match" on .json().
 if(!/\bapplication\/json\b/i.test(type))throw Error('not-json:'+type.slice(0,60))
 try{return await response.json()}
 catch{throw Error('invalid-json')}
}
export async function fetchPublishedStudyItems<T extends Item>(
 collection:StudyStaticCollection,language:StudyStaticLanguage,signal?:AbortSignal,
):Promise<T[]>{
 let failure='unavailable'
 for(let attempt=0;attempt<2;attempt++){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError')
  const refresh=attempt===1
  const suffix=refresh?'?zhixue_recovery='+RECOVERY_TAG:''
  const manifestUrl='/'+collection+'/manifest.json'+suffix
  try{
   const manifest=await readJson(manifestUrl,refresh?'reload':'no-cache',signal) as Manifest
   const path=manifest?.[language]
   if(manifest?.version!==1||typeof path!=='string'||!validPath.test(path)||
    !path.startsWith('/'+collection+'/'+language+'.'))
    throw Error('invalid-manifest')
   const packet=await readJson(path+suffix,refresh?'reload':'force-cache',signal) as {items?:T[]}
   const items=packet?.items
   if(!Array.isArray(items)||
    (collection==='language-cards'?items.length!==5000:items.length<3000)||
    items.some(item=>!item||item.language!==language||
     typeof item.term!=='string'||!item.term))
    throw Error('incomplete-packet')
   return items
  }catch(error){
   if(signal?.aborted)throw error
   failure=error instanceof Error?error.message:'unexpected-asset-error'
  }
 }
 const label=collection==='language-cards'?'日英课程':'日英词库'
 throw Error(label+'加载失败（静态资源或PWA缓存异常：'+failure+
  '）。请联网后在右上角菜单选择「更新并刷新」。')
}
