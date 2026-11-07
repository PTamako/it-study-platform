import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8')
const workflows=['deploy-cloudflare.yml','validate-pr.yml'].map(p=>readFileSync(new URL('../.github/workflows/'+p,import.meta.url),'utf8'))

test('release markers announce new builds without automatically dropping unfinished exam state',()=>{
  for(const workflow of workflows){
    assert.match(workflow,/Generate immutable release version marker/)
    assert.match(workflow,/VITE_APP_VERSION:/)
    assert.match(workflow,/public\/version\.json/)
  }
  assert.match(main,/fetch\('\/version\.json\?ts='/)
  assert.match(main,/cache: 'no-store'/)
  assert.match(main,/zhixue:update-available/)
  assert.doesNotMatch(main,/location\.reload\(/)
  assert.match(app,/v-if="updateAvailable"/)
  assert.match(app,/更新并刷新/)
  assert.match(sw,/zhixue-app-v4/)
  assert.match(sw,/url\.pathname\.startsWith\(API_PREFIX\)/)
})
