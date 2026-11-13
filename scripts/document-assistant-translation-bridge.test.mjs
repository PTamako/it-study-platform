import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import {inlineChineseDictionary} from './inline-chinese-dictionary.mjs';

const SECRET='bridge-signing-secret-for-private-translation-123';
const TOKEN='long-private-gas-token-not-exposed-to-client-123';
const GAS='https://script.google.com/macros/s/AKfycbxPrivateDeployment123/exec';
const REDIRECT='https://script.googleusercontent.com/macros/echo?user_content_key=private';
let source=await readFile(new URL('../worker/index.ts',import.meta.url),'utf8');
source=source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'",
"const checkWriteRateLimit=async()=>null; const handleAuthRequest=async()=>null; const requireAuth=async()=>null;");
source=source.replace("import { feSeeds, seedUrl } from './fe-question-bank'",
"const feSeeds=[]; const seedUrl=()=>'';");
source=inlineChineseDictionary(source);
const worker=(await import('data:text/javascript;base64,'+Buffer.from(ts.transpile(source,{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,
})).toString('base64'))).default;
const env={JPDA_BRIDGE_ENABLED:'true',JPDA_BRIDGE_SECRET:SECRET,
 GAS_TRANSLATOR_URL:GAS,GAS_TRANSLATOR_TOKEN:TOKEN};
const req=(payload,options={})=>{
 const raw=JSON.stringify(payload),timestamp=options.timestamp||String(Date.now());
 const signature=createHmac('sha256',options.secret||SECRET).update(timestamp+'\n'+raw).digest('hex');
 return new Request('https://it-study-platform.test/api/bridge/document-assistant/translate',{
 method:'POST',headers:{
  'X-DA-Timestamp':timestamp,'X-DA-Signature':options.signature||signature,
  'Content-Type':'application/json'
 },body:raw});
};
const packet=(text='これは日本の文書です。')=>({
 source:'jp-document-assistant',operation:'translate_chunk',
 source_language:'ja',target_language:'zh-CN',text});
test('signed document translation uses existing Google Apps Script only',async()=>{
 const prev=globalThis.fetch;
 const requests=[];
 globalThis.fetch=async(input,init={})=>{
  const url=String(input);requests.push({url,init});
  if(url===GAS){
   assert.equal(init.redirect,'manual');
   const body=JSON.parse(init.body);
   assert.equal(body.text,'これは日本の文書です。');
   assert.equal(body.source,'ja');
   assert.equal(body.target,'zh');
   assert.equal(body.token,TOKEN);
   return new Response('',{status:302,headers:{location:REDIRECT}});
  }
  assert.equal(url,REDIRECT);
  assert.equal(init.method,'GET');
  assert.equal(init.redirect,'manual');
  assert.ok(!('body' in init));
  return new Response(JSON.stringify({ok:true,translation:'这是日本的文件。'}));
 };
 try{
  const resp=await worker.fetch(req(packet()),env);
  assert.equal(resp.status,200);
  assert.deepEqual(await resp.json(),{ok:true,translation:'这是日本的文件。',provider:'google_apps_script'});
  assert.equal(requests.length,2);
  assert.ok(!requests.some(x=>JSON.stringify(x).includes('mymemory.translated.net')));
 }finally{globalThis.fetch=prev;}
});
test('invalid signatures, stale clock, oversize or arbitrary language cannot spend Google quota',async()=>{
 const prev=globalThis.fetch;
 let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('must not call Google');};
 try{
  const cases=[
   req(packet(),{secret:'wrong-bridge-key'}),
   req(packet(),{timestamp:String(Date.now()-3600000)}),
   req(packet('あ'.repeat(1401))),
   req({...packet(),target_language:'en'}),
   req({...packet(),operation:'arbitrary'}),
  ];
  for(const request of cases){
   const response=await worker.fetch(request,env);
   assert.ok(response.status>=400);
   assert.equal((await response.json()).ok,false);
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=prev;}
});
test('document translation fails closed when Google script credentials are absent or down',async()=>{
 const prev=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:'provider_unavailable'}));
 try{
  const missing=await worker.fetch(req(packet()),{...env,GAS_TRANSLATOR_TOKEN:undefined});
  assert.equal(missing.status,503);
  assert.equal((await missing.json()).error,'translator_not_configured');
  const failure=await worker.fetch(req(packet()),env);
  assert.equal(failure.status,503);
  assert.equal((await failure.json()).error,'translation_unavailable');
 }finally{globalThis.fetch=prev;}
});
