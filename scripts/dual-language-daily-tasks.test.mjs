import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { mergeDailyTaskTemplates } from '../src/daily-tasks.ts'

const app = await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
const templates = [
  {id:'sg-review',title:'SG review',detail:'past questions',minutes:15,done:false},
  {id:'japanese-daily',title:'日本語',detail:'daily + work',minutes:20,done:false},
  {id:'english-daily',title:'TOEIC',detail:'daily + work',minutes:20,done:false},
]
test('existing generic task never falsely marks new JP and EN learning as finished', () => {
  const legacy=[{id:'sg-review',title:'Old SG',detail:'old',minutes:10,done:true},
    {id:'language',title:'Old language',detail:'old',minutes:10,done:true}]
  const migrated=mergeDailyTaskTemplates(legacy,templates)
  assert.deepEqual(migrated.map(t=>t.id),['sg-review','language','japanese-daily','english-daily'])
  assert.equal(migrated.find(t=>t.id==='sg-review').done,true)
  assert.equal(migrated.find(t=>t.id==='language').done,true)
  assert.equal(migrated.find(t=>t.id==='japanese-daily').done,false)
  assert.equal(migrated.find(t=>t.id==='english-daily').done,false)
  assert.equal(migrated.find(t=>t.id==='sg-review').minutes,15)
  assert.deepEqual(legacy[0],{id:'sg-review',title:'Old SG',detail:'old',minutes:10,done:true})
})
test('both daily language tasks are seeded once and retain same-day completions', () => {
  const initial=mergeDailyTaskTemplates(null,templates)
  assert.equal(initial.length,3)
  initial[1].done=true
  const hydrated=mergeDailyTaskTemplates(initial,templates)
  assert.equal(hydrated.length,3)
  assert.equal(hydrated[1].done,true)
  assert.equal(hydrated[2].done,false)
  assert.equal(mergeDailyTaskTemplates([...hydrated,hydrated[1]],templates).length,3)
})
test('do not delete user-defined tasks or silently accept malformed rows',()=>{
  const input=[{id:'custom',title:'我的任务',detail:'自定义',minutes:30,done:true},
    {id:'not-valid',done:'yes'},null]
  const output=mergeDailyTaskTemplates(input,templates)
  assert.equal(output.length,4)
  assert.equal(output[0].id,'custom')
  assert.equal(output[0].done,true)
  assert.ok(output.every(t=>typeof t.done==='boolean'))
})
test('homepage and Tokyo-day rollover both use migration without cloud writes',()=>{
  assert.match(app,/id: 'japanese-daily'/)
  assert.match(app,/id: 'english-daily'/)
  assert.match(app,/mergeDailyTaskTemplates\(\s*readStored\('zhixue:tasks:' \+ todayKey.value/)
  assert.match(app,/tasks.value = mergeDailyTaskTemplates\(readStored\('zhixue:tasks:' \+ next/)
  const start=app.slice(app.indexOf('const defaultTasks'),app.indexOf('function readStored'))
  assert.doesNotMatch(start,/fetch\(|\/api\//)
})
