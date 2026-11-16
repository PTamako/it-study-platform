import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateStudyHomeflowAuthorizationUrl as validate} from '../src/homeflow-authorization-url.mjs'
const origin='https://study.example.jp'
const state='a'.repeat(64)
const input=()=>{const u=new URL('https://homeflow.example.jp/authorize')
 for(const [k,v] of Object.entries({
 response_type:'code',client_id:'it-study-platform',
 redirect_uri:origin+'/api/homeflow-sso/callback',
 code_challenge:'A'.repeat(43),code_challenge_method:'S256',
 state,nonce:'b'.repeat(64)}))u.searchParams.set(k,v)
 return u}
test('installed iPhone PWA OAuth URL binds exact state/PKCE/client and same-app callback',()=>{
 const u=input()
 assert.equal(validate(u.href,state,origin).href,u.href)
})
test('browser cannot be redirected by tampered OAuth response or leak verifier into Safari',()=>{
 const tamper=[
  u=>u.searchParams.set('state','c'.repeat(64)),
  u=>u.searchParams.set('client_id','another'),
  u=>u.searchParams.set('redirect_uri','https://evil.example.jp/callback'),
  u=>u.searchParams.set('response_type','token'),
  u=>u.searchParams.set('code_challenge_method','plain'),
  u=>u.searchParams.set('code_challenge','invalid'),
  u=>u.searchParams.set('nonce','bad'),
  u=>u.searchParams.set('extra','injected'),
  u=>u.username='stolen',
  u=>u.hash='secret',
  u=>u.pathname='/wrong'
 ]
 for(const change of tamper){const u=input();change(u)
  assert.throws(()=>validate(u.href,state,origin),/地址校验失败/,u.href)}
 assert.throws(()=>validate(input().href,state,'http://study.example.jp'),/地址校验失败/)
 assert.throws(()=>validate('javascript:alert(1)',state,origin),/地址校验失败/)
 const source=readFileSync(new URL('../src/StudyHomeFlowAccess.vue',import.meta.url),'utf8')
 assert.match(source,/validateStudyHomeflowAuthorizationUrl\(result\.authorization_url,result\.state,window\.location\.origin\)/)
 assert.doesNotMatch(source,/localStorage\.setItem\([^,\n]*code_verifier/)
})
test('legacy learning caches must remain quarantined when HomeFlow member is active',()=>{
 const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
 const grammar=readFileSync(new URL('../src/StudyHomeFlowGrammar.vue',import.meta.url),'utf8')
 const listening=readFileSync(new URL('../src/StudyHomeFlowListening.vue',import.meta.url),'utf8')
 const worker=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')
 assert.match(app,/function quarantineLegacyStudy\(userId:string\)/)
 assert.match(app,/authenticated\.value=false[\s\S]*?legacyWritesAllowed\(\)/)
 assert.match(app,/function legacyWritesAllowed\(\)\{[\s\S]*?!homeflowIdentityUser\.value/)
 assert.match(grammar,/expected_user_id:props\.userId/)
 assert.match(listening,/expected_user_id:props\.userId/)
 assert.match(worker,/url\.pathname\.startsWith\(API_PREFIX\)/)
 assert.doesNotMatch(worker,/cache\.put\([^)]*api/i)
})
