import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow=await readFile(new URL('../.github/workflows/deploy-cloudflare.yml',import.meta.url),'utf8')
test('production learning schema is inspected read-only after migrations, before deploying Worker',()=>{
  const migrate=workflow.indexOf('      - name: Apply reviewed D1 migrations')
  const schema=workflow.indexOf('      - name: Verify production learning schema (read-only, zero data rows)')
  const deploy=workflow.indexOf('      - name: Deploy Worker and static assets')
  assert.ok(migrate>0 && migrate<schema && schema<deploy)
  const commands=workflow.slice(schema,deploy)
  const required=[
    'daily_listening_answers',
    'daily_grammar_answers',
    'language_card_reviews',
    'study_attempts',
    'saved_vocabulary_entries',
    'saved_vocabulary_entries_v2',
    'daily_word_reviews',
  ]
  for(const table of required)assert.match(commands,new RegExp('FROM '+table+' WHERE 0 LIMIT 0;'))
  assert.equal((commands.match(/npx wrangler d1 execute it-study-platform-db --remote --command/g)||[]).length,7)
  assert.match(commands, /Verify production answer JSON before publishing/)
  assert.match(commands, /scripts\/check-question-json\.mjs/)
  assert.doesNotMatch(commands,/--file|--persist-to|DROP TABLE|DELETE FROM|UPDATE [A-Za-z_]|INSERT INTO|ALTER TABLE/)
})
