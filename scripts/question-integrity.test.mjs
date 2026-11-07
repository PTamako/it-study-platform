import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const sql = readFileSync(new URL('./question-integrity.sql',import.meta.url),'utf8')

test('answer integrity rejects missing answer, duplicate option IDs, blank option, invalid JSON and empty prompt',()=>{
  const db=new DatabaseSync(':memory:')
  try {
    db.exec('CREATE TABLE questions (id TEXT PRIMARY KEY, answer_json TEXT, options_json TEXT, prompt TEXT, explanation TEXT)')
    const valid = JSON.stringify([{id:'a',text:'yes'},{id:'b',text:'no'}])
    const add=(id,ans,opts=valid,prompt='What?',explanation='Because')=>db.prepare('INSERT INTO questions VALUES (?,?,?,?,?)').run(id,ans,opts,prompt,explanation)
    add('okay','"a"')
    assert.equal(db.prepare(sql).get().invalid_count,0)
    add('bad-answer','"c"')
    add('duplicate','"a"',JSON.stringify([{id:'a',text:'yes'},{id:'a',text:'no'}]))
    add('blank','"a"',JSON.stringify([{id:'a',text:' '},{id:'b',text:'no'}]))
    add('invalid-json','"a',valid)
    add('empty-prompt','"a"',valid,'')
    add('not-array','"a"','{"a":"yes"}')
    assert.equal(db.prepare(sql).get().invalid_count,6)
  } finally {db.close()}
})
