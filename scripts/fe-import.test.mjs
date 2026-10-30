import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { DatabaseSync } from 'node:sqlite'
import { feSeeds, seedUrl } from '../worker/fe-question-bank.ts'
let source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
source = source.replace("import { checkWriteRateLimit, handleAuthRequest, requireAuth } from './auth'", `const checkWriteRateLimit = async () => null; const handleAuthRequest = async () => null; const requireAuth = async request => request.headers.get('x-auth') === 'yes' ? null : new Response('{}',{status:401});`)
source = source.replace("import { feSeeds, seedUrl } from './fe-question-bank'", `const feSeeds = ${JSON.stringify(feSeeds)}; const seedUrl = year => (${JSON.stringify(Object.fromEntries(feSeeds.map(q => [q.year, seedUrl(q.year)])))}[year]);`)
const js = stripTypeScriptTypes(source, {mode:'transform'})
const worker = (await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))).default
function setup() {
 const sql = new DatabaseSync(':memory:')
 sql.exec(`CREATE TABLE study_tracks (id TEXT PRIMARY KEY); INSERT INTO study_tracks VALUES ('exam-fe'),('exam-sg'); CREATE TABLE questions (id TEXT PRIMARY KEY,track_id TEXT NOT NULL,topic TEXT NOT NULL,difficulty TEXT,question_type TEXT,prompt TEXT,options_json TEXT,answer_json TEXT,explanation TEXT,source_type TEXT,source_reference TEXT,language TEXT,exam_section TEXT,exam_section_method TEXT,FOREIGN KEY (track_id) REFERENCES study_tracks(id)); CREATE TABLE study_attempts (id TEXT PRIMARY KEY, question_id TEXT, user_answer_json TEXT, is_correct INTEGER, duration_seconds INTEGER, answered_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY, track_id TEXT, review_count INTEGER, correct_streak INTEGER, last_result TEXT, next_review_at TEXT, mastered INTEGER, updated_at TEXT);`)
 let fail = false, batches = 0
 const db = {prepare(q) { return {bind(...args) { if (args.length > 40) throw Error('D1 parameter limit exceeded'); return {query:q,args,async all(){return {results:sql.prepare(q).all(...args)}}, async first(){return sql.prepare(q).get(...args) || null}, async run(){return sql.prepare(q).run(...args)}}}}},async batch(stmts){batches++; if (stmts.length > 40) throw Error('batch too large'); sql.exec('BEGIN');try{for(let i=0;i<stmts.length;i++){if(fail && (fail===true || fail===batches) && i===2)throw Error('simulated'); await stmts[i].run()}sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK'); throw e}}}
 return { sql, db, fail(value){ fail = value } }
}
async function req(db,{auth='yes',origin='https://example.test',method='POST'}={}) {const headers={};if(auth)headers['x-auth']=auth;if(origin)headers.origin=origin;return worker.fetch(new Request('https://example.test/api/fe-question-bank/install',{method,headers}),{DB:db})}
test('protected, same-origin and POST only', async()=>{const {sql,db}=setup();assert.equal((await req(db,{auth:''})).status,401);assert.equal((await req(db,{origin:'https://attacker.test'})).status,403);assert.notEqual((await req(db,{method:'GET'})).status,200);assert.equal(sql.prepare('SELECT count(*) AS c FROM questions').get().c,0)})
test('idempotent import preserves foreign questions and authentic references',async()=>{const {sql,db}=setup();sql.prepare("INSERT INTO questions(id,track_id,topic,prompt) VALUES('sg-existing','exam-sg','x','safe')").run();assert.equal((await req(db)).status,200);assert.equal((await req(db)).status,200);const rows=sql.prepare("SELECT * FROM questions WHERE track_id='exam-fe'").all();assert.equal(rows.length,feSeeds.length);assert.ok(rows.every(x=>['A','B'].includes(x.exam_section) && x.exam_section_method==='explicit' && (x.source_type==='licensed' ? x.prompt.includes('改編') : x.source_type==='generated' && x.prompt.includes('自主練習'))));assert.equal(sql.prepare("SELECT prompt FROM questions WHERE id='sg-existing'").get().prompt,'safe')})
test('colliding namespace does not overwrite and imports nothing',async()=>{const {sql,db}=setup();const id=`fe-ipa-adapt-${feSeeds[0].year}-${(feSeeds[0].section || 'A').toLowerCase()}-${String(feSeeds[0].number).padStart(2,'0')}`;sql.prepare("INSERT INTO questions(id,track_id,topic,prompt) VALUES(?,'exam-sg','other','keep')").run(id);assert.equal((await req(db)).status,409);assert.equal(sql.prepare('SELECT count(*) AS c FROM questions').get().c,1);assert.equal(sql.prepare('SELECT prompt FROM questions WHERE id=?').get(id).prompt,'keep')})
test('failed transactional batch can be retried safely',async()=>{const t=setup();t.fail(true);assert.equal((await req(t.db)).status,503);assert.equal(t.sql.prepare('SELECT count(*) AS c FROM questions').get().c,0);t.fail(false);assert.equal((await req(t.db)).status,200);assert.equal(t.sql.prepare('SELECT count(*) AS c FROM questions').get().c,feSeeds.length)})

test('adapted FE rows are separate from official question filtering',async()=>{
 const {db,sql}=setup(); assert.equal((await req(db)).status,200)
 const get = async source => (await worker.fetch(new Request('https://example.test/api/questions?track=exam-fe&mode=ordered&source='+source+'&limit=50'),{DB:db})).json()
 const adapted=await get('licensed'), original=await get('generated'), official=await get('official')
 assert.equal(adapted.total,feSeeds.filter(q=>q.origin !== 'original').length); assert.equal(original.total,6); assert.equal(official.total,0)
 assert.equal(sql.prepare("SELECT count(*) AS c FROM questions WHERE track_id='exam-fe' AND exam_section='B'").get().c,feSeeds.filter(q => q.section === 'B').length)
 assert.ok(adapted.items.every(q=>q.source_type==='licensed' && q.prompt.includes('改編')))
 assert.ok(original.items.every(q=>q.source_type==='generated' && q.prompt.includes('自主練習')))
})

test('all seed entries have unique source identities, answer bounds, and official attribution', () => {
 const ids = new Set()
 for (const q of feSeeds) {
   const id = [q.year, q.section || 'A', q.number].join(':')
   assert.ok(!ids.has(id), 'duplicate ' + id); ids.add(id)
   if (q.origin !== 'original') assert.match(seedUrl(q.year), /^https:\/\/www\.ipa\.go\.jp\//)
   assert.ok(q.options.length >= 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
   assert.ok(q.prompt && q.explanation && q.topic)
   if ((q.section || 'A') === 'A') assert.equal(q.options.length, 4)
 }
})

test('a failure in a later chunk preserves earlier inserts and retry resumes without duplicates', async()=>{
 const t=setup();t.fail(2);assert.equal((await req(t.db)).status,503)
 assert.equal(t.sql.prepare('SELECT count(*) AS c FROM questions').get().c,40)
 t.fail(false); assert.equal((await req(t.db)).status,200)
 assert.equal(t.sql.prepare('SELECT count(*) AS c FROM questions').get().c,feSeeds.length)
})
test('FE answer, wrong review, mastery and practice use the existing progress tables', async()=>{
 const t=setup();assert.equal((await req(t.db)).status,200)
 const q=t.sql.prepare("SELECT id,answer_json FROM questions WHERE track_id='exam-fe' AND source_type='licensed' LIMIT 1").get()
 const call=async(path,method='GET',body)=>worker.fetch(new Request('https://example.test'+path,{method,headers:{'x-auth':'yes',origin:'https://example.test','content-type':'application/json'},body:body?JSON.stringify(body):undefined}),{DB:t.db})
 let response=await call('/api/attempts','POST',{question_id:q.id,answer:'wrong'});assert.equal(response.status,201)
 assert.equal((await response.json()).correct,false)
 let wrong=await (await call('/api/wrong-questions?track=exam-fe&source=licensed&mode=wrong')).json()
 assert.ok(wrong.items.some(item=>item.id===q.id))
 response=await call('/api/question-progress','POST',{question_id:q.id,mastered:true});assert.equal(response.status,200)
 let mastered=await (await call('/api/wrong-questions?track=exam-fe&source=licensed&mode=mastered')).json()
 assert.ok(mastered.items.some(item=>item.id===q.id))
 response=await call('/api/question-progress','POST',{question_id:q.id,mastered:false});assert.equal(response.status,200)
 let practice=await (await call('/api/wrong-questions?track=exam-fe&source=licensed&mode=practice')).json()
 assert.ok(practice.items.some(item=>item.id===q.id))
 response=await call('/api/attempts','POST',{question_id:q.id,answer:JSON.parse(q.answer_json)});assert.equal((await response.json()).correct,true)
})
