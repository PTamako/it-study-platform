import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

test('answer progress upsert preserves counts and streaks, and failed batches roll back', async () => {
  const source = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
  const section = source.slice(source.indexOf("if (url.pathname === '/api/attempts'"), source.indexOf("// 实战任务由服务端", source.indexOf("if (url.pathname === '/api/attempts'")))
  assert.match(section, /await env\.DB\.batch\(\[/)
  const sql = section.match(/\x60(INSERT INTO question_review_state[\s\S]*?)\x60/)?.[1]
  assert.ok(sql, 'review upsert must be present')
  const program = `
import sqlite3, sys
db = sqlite3.connect(':memory:')
db.execute("CREATE TABLE question_review_state (question_id TEXT PRIMARY KEY, track_id TEXT, review_count INTEGER, correct_streak INTEGER, last_result TEXT, next_review_at TEXT, mastered INTEGER, updated_at TEXT)")
db.execute("CREATE TABLE study_attempts (id TEXT PRIMARY KEY)")
sql = sys.stdin.read()
for i in range(3):
    db.execute(sql, ('q1','track',1,'remembered','+1 day'))
r = db.execute('SELECT review_count, correct_streak, mastered FROM question_review_state').fetchone()
assert r == (3,3,1), r
db.execute(sql, ('q1','track',0,'again','+10 minutes'))
r = db.execute('SELECT review_count, correct_streak, mastered FROM question_review_state').fetchone()
assert r == (4,0,0), r
db.commit()
try:
    with db:
        db.execute("INSERT INTO study_attempts VALUES ('attempt')")
        db.execute('INSERT INTO no_such_table VALUES (1)')
except sqlite3.OperationalError:
    pass
assert db.execute('SELECT count(*) FROM study_attempts').fetchone()[0] == 0
`
  const result = spawnSync('python3', ['-c', program], { input: sql, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
})
