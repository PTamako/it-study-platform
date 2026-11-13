import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ui=readFileSync(new URL('../src/StudyHomeFlowAccess.vue',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')

test('HomeFlow PWA entry remains feature gated and cannot authenticate legacy study APIs',()=>{
 assert.match(ui,/api\('status'\)/)
 assert.match(ui,/enabled\.value=status\.enabled===true/)
 assert.match(ui,/<section v-if="enabled"/)
 assert.match(app,/import StudyHomeFlowAccess from '.\/StudyHomeFlowAccess.vue'/)
 assert.match(app,/<StudyHomeFlowAccess \/>/)
 assert.match(app,/<StudyHomeFlowAccess v-if="activeModule==='home'"/)
 assert.doesNotMatch(ui,/authenticated\.value\s*=\s*true/)
 assert.match(ui,/study data|个人学习数据隔离尚未开放/)
})

test('Safari-to-installed-PWA resume uses only short-lived one-time proof, not bearer token',()=>{
 assert.match(ui,/expires_at:Date\.now\(\)\+Math\.min\(300/)
 assert.match(ui,/localStorage\.setItem\(KEY,JSON\.stringify\(value\)\)/)
 assert.match(ui,/localStorage\.removeItem\(KEY\)/)
 assert.match(ui,/window\.location\.assign\(url\.toString\(\)\)/)
 assert.match(ui,/url\.protocol!=='https:'\|\|url\.pathname!=='\/authorize'/)
 assert.match(ui,/JSON\.stringify\(\{state:proof\.state,resume_secret:proof\.resume_secret\}\)/)
 assert.match(ui,/identity\.value=null/)
 assert.match(ui,/api\('logout',\{method:'POST'\}\)/)
 assert.doesNotMatch(ui,/localStorage\.setItem\([^\n]*(?:access_token|session_assertion|bearer_token)/i)
 assert.doesNotMatch(ui,/document\.cookie\s*=/)
})
