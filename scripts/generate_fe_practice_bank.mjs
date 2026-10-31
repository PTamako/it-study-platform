import { writeFileSync } from 'node:fs'
import { feSeeds, seedUrl } from '../worker/fe-question-bank.ts'

// Build the FE learning bank for D1 at validation/deploy time.
// Official question text is held in reviewed, versioned SQL migrations separately.
// These seeds remain "licensed" (IPA-adapted) and "generated" (original),
// never "official". This script only writes local SQL; it NEVER connects to D1.
const quote = (value) => "'" + String(value ?? '').replaceAll("'", "''") + "'"
const columns = [
  'id', 'track_id', 'topic', 'difficulty', 'question_type', 'prompt',
  'options_json', 'answer_json', 'explanation', 'source_type',
  'source_reference', 'language', 'exam_section', 'exam_section_method',
]
const ids = new Set()
const rows = feSeeds.map((item) => {
  const section = item.section || 'A'
  const original = item.origin === 'original'
  const id = original
    ? `fe-original-${section.toLowerCase()}-${String(item.number).padStart(2, '0')}`
    : `fe-ipa-adapt-${item.year}-${section.toLowerCase()}-${String(item.number).padStart(2, '0')}`
  if (ids.has(id)) throw Error('Duplicate FE seed identity: ' + id)
  ids.add(id)
  const sourceReference = original
    ? '知学オリジナル練習問題（IPA公式過去問ではありません）'
    : seedUrl(item.year)
  if (!original && !sourceReference?.startsWith('https://www.ipa.go.jp/')) {
    throw Error('Unverified FE source: ' + id)
  }
  if (!['A', 'B'].includes(section) || item.options.length < 4
    || item.options.length > 26 || item.answer < 0 || item.answer >= item.options.length) {
    throw Error('Invalid FE seed: ' + id)
  }
  const prompt = original
    ? `【FE自主練習 科目${section} 問${item.number}】${item.prompt}`
    : `【${item.year}年度 科目${section} 問${item.number}・改編】${item.prompt}`
  const vals = [
    id, 'exam-fe', item.topic, 'standard', 'single_choice', prompt,
    JSON.stringify(item.options.map((text, n) => ({
      id: String.fromCharCode(97 + n), text,
    }))),
    JSON.stringify(String.fromCharCode(97 + item.answer)),
    item.explanation, original ? 'generated' : 'licensed',
    sourceReference, 'ja', section, 'explicit',
  ]
  return '(' + vals.map(quote).join(', ') + ')'
})
const lines = [
  '-- Prepared FE practice bank from reviewed TypeScript seeds.',
  '-- Non-official adaptations (licensed) and original practice (generated) only.',
  '-- Stable IDs match the existing /api/fe-question-bank/install endpoint.',
  '-- INSERT OR IGNORE never changes existing questions, attempts or mastery.',
]
for (let i = 0; i < rows.length; i += 10) {
  lines.push('INSERT OR IGNORE INTO questions (' + columns.join(', ') + ') VALUES\n'
    + rows.slice(i, i + 10).join(',\n') + ';')
}
writeFileSync(new URL('../migrations/0092_fe_practice_bank.sql', import.meta.url),
  lines.join('\n') + '\n', 'utf8')
console.log('Generated FE practice D1 migration:', rows.length, 'rows; existing IDs preserved')
