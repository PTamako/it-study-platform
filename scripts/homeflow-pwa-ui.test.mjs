import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const ui=readFileSync(new URL('../src/StudyHomeFlowAccess.vue',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
const daily=readFileSync(new URL('../src/StudyHomeFlowDailyTasks.vue',import.meta.url),'utf8')
const language=readFileSync(new URL('../src/StudyHomeFlowLanguage.vue',import.meta.url),'utf8')

test('HomeFlow PWA entry remains feature gated and cannot authenticate legacy study APIs',()=>{
 assert.match(ui,/api\('status'\)/)
 assert.match(ui,/enabled\.value=status\.enabled===true/)
 assert.match(ui,/<section v-if="enabled"/)
 assert.match(app,/import StudyHomeFlowAccess from '.\/StudyHomeFlowAccess.vue'/)
 assert.match(app,/<StudyHomeFlowAccess \/>/)
 assert.match(app,/<StudyHomeFlowAccess v-if="activeModule==='home'"/)
 assert.doesNotMatch(ui,/authenticated\.value\s*=\s*true/)
 assert.match(ui,/每日任务和语言卡可独立使用；考试、错题等仍待隔离/)
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


test('private HomeFlow daily checklist is keyed to the signed actor, not shared legacy cache',()=>{
 assert.match(ui,/import StudyHomeFlowDailyTasks from '.\/StudyHomeFlowDailyTasks.vue'/)
 assert.match(ui,/<StudyHomeFlowDailyTasks v-if="identity" :key="identity.user_id"/)
 assert.match(ui,/:user-id="identity.user_id" :role="identity.role"/)
 assert.match(daily,/\/api\/homeflow-study\/daily-tasks\?date=/)
 assert.match(daily,/\/api\/homeflow-study\/daily-tasks\/status/)
 assert.match(daily,/status.enabled===true&&status.scope==='user'/)
 assert.match(daily,/\/api\/homeflow-study\/daily-tasks\/legacy\/adopt/)
 assert.match(daily,/role==='owner'/)
 assert.match(daily,/window.confirm\(/)
 assert.match(daily,/version:t.version/)
 assert.match(daily,/document.addEventListener\('visibilitychange',foreground\)/)
 assert.match(daily,/document.removeEventListener\('visibilitychange',foreground\)/)
 assert.match(daily,/onUnmounted\(\(\)=>\{generation\+\+;rows.value=\[\]/)
 assert.doesNotMatch(daily,/localStorage\.(?:getItem|setItem)/)
 assert.doesNotMatch(daily,/authenticated\.value\s*=\s*true/)
 assert.doesNotMatch(daily,/fetch\('\/api\/daily-tasks/)
 assert.doesNotMatch(daily,/access_token|session_assertion/)
});


test('Stage E language UI only requests the signed actor isolated card space',()=>{
 assert.match(ui,/import StudyHomeFlowLanguage from '.\/StudyHomeFlowLanguage.vue'/)
 assert.match(ui,/<StudyHomeFlowLanguage v-if="identity" :key="'language:'\+identity.user_id"/)
 assert.match(ui,/:user-id="identity.user_id" :role="identity.role"/)
 assert.match(language,/\/api\/homeflow-study\/language\/status/)
 assert.match(language,/r.enabled===true&&r.scope==='user'&&r.legacy_access===false/)
 assert.match(language,/\/api\/homeflow-study\/language\/cards\?/)
 assert.match(language,/\/api\/homeflow-study\/language\/mastery/)
 assert.match(language,/\/api\/homeflow-study\/language\/review/)
 assert.match(language,/\/api\/homeflow-study\/language\/legacy\/adopt/)
 assert.match(language,/props.role!=='owner'/)
 assert.match(language,/window.confirm\(/)
 assert.match(language,/crypto.randomUUID\(\).replace\(\/-\/g,''\)/)
 assert.match(language,/request_id/)
 assert.match(language,/pendingReview.value=null/)
 assert.match(language,/重试上次复习（不重复计次）/)
 assert.match(language,/version:card.mastery_version/)
 assert.match(language,/version:card.review_version/)
 assert.match(language,/document.addEventListener\('visibilitychange',resume\)/)
 assert.match(language,/document.removeEventListener\('visibilitychange',resume\)/)
 assert.doesNotMatch(language,/localStorage\.(?:getItem|setItem)/)
 assert.doesNotMatch(language,/\/api\/language-(?:progress|review)(?![\w/-])/)
 assert.doesNotMatch(language,/document\.cookie|access_token|session_assertion/)
});
