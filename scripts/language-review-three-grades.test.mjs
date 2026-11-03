import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const base = new URL('../', import.meta.url)
const [worker, app, originalSchema, gradeMigration] = await Promise.all([
  'worker/index.ts', 'src/App.vue',
  'migrations/0013_language_spaced_repetition.sql',
  'migrations/0132_language_review_grades.sql',
].map(path => readFile(new URL(path, base), 'utf8')))

test('three review levels are accessible and remain optional in the existing UI', () => {
  for (const result of ['again', 'hard', 'remembered'])
    assert.ok(app.includes("submitLanguageReview('"+result+"')"), result)
  assert.match(app, /复习/);
  assert.match(app, /reviewDueByCardId\.value\.get\(id\)/)
  assert.match(app, /async function submitLanguageReview\(result: 'again' \| 'hard' \| 'remembered'\)/)
  assert.doesNotMatch(app.slice(app.indexOf('async function submitLanguageReview'),app.indexOf('const languageProgressHydrating')),/fetch\(['"]\/api\/language-review['"]\)/)
})

test('additive migration and actual SQLite UPSERT preserve history and intervals', () => {
  const captured = worker.match(/`(INSERT INTO language_card_reviews[\s\S]*?)`/)
  assert.ok(captured, 'actual production UPSERT SQL is available for a SQLite smoke test')
  const script = `
import json,sys,sqlite3
payload=json.load(sys.stdin)
db=sqlite3.connect(':memory:')
db.row_factory=sqlite3.Row
db.execute('CREATE TABLE language_cards (id TEXT PRIMARY KEY)')
db.execute("INSERT INTO language_cards VALUES ('card-a')")
db.executescript(payload['original'])
db.execute("INSERT INTO language_card_reviews (card_id,review_count,correct_streak,next_review_at,last_reviewed_at,last_result) VALUES ('card-a',4,2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'remembered')")
db.executescript(payload['migration'])
old=db.execute("SELECT review_count,correct_streak,last_result,last_grade FROM language_card_reviews WHERE card_id='card-a'").fetchone()
assert tuple(old)==(4,2,'remembered',None), tuple(old)
cases=[('hard','again','+6 hours',0,5),('remembered','remembered','+1 day',1,6),('remembered','remembered','+3 days',2,7),('again','again','+10 minutes',0,8)]
for grade,legacy,interval,streak,count in cases:
    row=db.execute(payload['upsert'],('card-a',int(grade=='remembered'),interval,legacy,grade)).fetchone()
    assert row['review_count']==count,(grade,dict(row))
    assert row['correct_streak']==streak,(grade,dict(row))
    assert row['last_result']==legacy and row['last_grade']==grade,dict(row)
    seconds=db.execute("SELECT strftime('%s',next_review_at)-strftime('%s','now') FROM language_card_reviews WHERE card_id='card-a'").fetchone()[0]
    expected={'+6 hours':21600,'+1 day':86400,'+3 days':259200,'+10 minutes':600}[interval]
    assert abs(seconds-expected)<=2,(grade,seconds,expected)
print('4 grade transitions + existing review retention verified')
`
  const output = execFileSync('python3',['-c',script],{
    input:JSON.stringify({original:originalSchema,migration:gradeMigration,upsert:captured[1]}),
    encoding:'utf8',
  })
  assert.match(output, /review retention verified/)
})

test('legacy result semantics and response remain backward compatible', () => {
  assert.match(worker, /const legacyResult = result === 'hard' \? 'again' : result/)
  assert.match(worker, /COALESCE\(last_grade, last_result\) AS last_grade/)
  assert.match(worker, /review: results\[0\]/)
  assert.doesNotMatch(gradeMigration, /DROP TABLE|DELETE FROM|UPDATE language_card_reviews/i)
})
