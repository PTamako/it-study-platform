import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const src = await readFile(new URL('../src/dictionary-word-metadata.ts', import.meta.url), 'utf8')
const compiled = ts.transpile(src, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
const meta = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
const buildSource = await readFile(new URL('./build-japanese-pitch.mjs', import.meta.url), 'utf8')
const buildModule = await import('data:text/javascript;base64,' + Buffer.from(buildSource.replace(
  "import { mkdir, writeFile } from 'node:fs/promises'",
  "const mkdir = async()=>{}; const writeFile = async()=>{}",
).replace(
  "import { fileURLToPath } from 'node:url'",
  "const fileURLToPath = value=>String(value)",
)).toString('base64'))

test('Japanese pitch source keeps exact headword and reading distinct, with mora positions', () => {
  const sample = '学校\tがっこう\t0\n雨\tあめ\t1,0\n橋\tはし\t2\n箸\tはし\t1\n今日\tきょう\t1\n壊れた行\tあめ\tno-data'
  const { records, pairs } = buildModule.parseKanjiumAccents(sample)
  assert.equal(pairs, 5)
  assert.deepEqual(meta.matchingJapaneseAccents(records, '学校', 'がっこう'), [0])
  assert.deepEqual(meta.matchingJapaneseAccents(records, '橋', 'はし'), [2])
  assert.deepEqual(meta.matchingJapaneseAccents(records, '箸', 'はし'), [1])
  assert.deepEqual(meta.matchingJapaneseAccents(records, '橋', 'ハシ'), [])
  assert.deepEqual(meta.matchingJapaneseAccents(records, '壊れた行', 'あめ'), [])
  assert.equal(meta.japaneseMoraCount('きょう'), 2)
})
test('display proper pitch accent labels and do not invent missing accents', () => {
  assert.equal(meta.pitchLabel(0, 'あめ'), '⓪ 平板')
  assert.equal(meta.pitchLabel(1, 'あめ'), '① 头高')
  assert.equal(meta.pitchLabel(2, 'あめ'), '② 尾高')
  assert.equal(meta.pitchLabel(2, 'たまご'), '② 中高')
  assert.equal(meta.pitchLabel(-1, 'あめ'), '')
  assert.deepEqual(meta.matchingJapaneseAccents(null, '橋', 'はし'), [])
})
test('standalone words can display labels but sentence inputs cannot', () => {
  assert.equal(meta.isDictionaryHeadword('run', 'run', 'en'), true)
  assert.equal(meta.isDictionaryHeadword('ふさがる', 'ふさがる', 'ja'), true)
  assert.equal(meta.isDictionaryHeadword('学校', '学校', 'ja'), true)
  assert.equal(meta.isDictionaryHeadword('晚上', '晚上', 'zh'), true)
  assert.equal(meta.isDictionaryHeadword('今晚可能会下小雨', '今晚可能会下小雨', 'zh'), false)
  assert.equal(meta.isDictionaryHeadword('It might rain tonight.', 'It might rain tonight.', 'en'), false)
  assert.equal(meta.isDictionaryHeadword('今日は雨です。', '今日は雨です。', 'ja'), false)
  assert.equal(meta.isDictionaryHeadword('run fast', 'run fast', 'en'), false)
})
test('Chinese pinyin and POS are sourced only from curated word entries', () => {
  assert.deepEqual(meta.getChineseWordGuide('晚上'), { pinyin: 'wǎnshang', partOfSpeech: '时间名词' })
  assert.deepEqual(meta.getChineseWordGuide('工作'), { pinyin: 'gōngzuò', partOfSpeech: '动词／名词' })
  assert.equal(meta.getChineseWordGuide('今晚可能会下小雨'), undefined)
  assert.equal(meta.getChineseWordGuide('陌生的词'), undefined)
})
test('english and japanese speech parts have human-readable bilingual labels', () => {
  assert.equal(meta.partOfSpeechDisplay('verb'), 'verb · 动词')
  assert.equal(meta.partOfSpeechDisplay('noun'), 'noun · 名词')
  assert.equal(meta.partOfSpeechDisplay('Godan verb with ru ending'), 'Godan verb with ru ending · 动词')
  assert.equal(meta.partOfSpeechDisplay('Na-adjective (keiyodoshi)'), 'Na-adjective (keiyodoshi) · な形容词')
})
test('tablet-responsive dictionary remains readable and retains accessible controls', async () => {
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8')
  const vue = await readFile(new URL('../src/App.vue', import.meta.url), 'utf8')
  assert.match(css, /min-width:\s*768px\)\s*and\s*\(max-width:\s*1366px/)
  assert.match(css, /orientation:\s*landscape/)
  assert.match(css, /min-height:48px;min-width:48px/)
  assert.match(css, /user-select:text/)
  assert.match(vue, /dictionaryPitchLabels\(entry\)/)
  assert.match(vue, /dictionaryPosLabels\(entry\)/)
  assert.match(vue, /entry.senses\?\.length/)
  assert.match(vue, /lexical-source-row/)
})
test('dictionary worker retains multiple classes of meaning from upstream dictionary', async () => {
  const worker = await readFile(new URL('../worker/index.ts', import.meta.url), 'utf8')
  assert.match(worker, /partsOfSpeech:\s*partsOfSpeech\.slice/)
  assert.match(worker, /senses:\s*senses\.slice/)
  assert.match(worker, /partsOfSpeech:\s*\[\.\.\.new Set\(parts/)
  assert.match(worker, /senses:\s*senses\.slice\(0,\s*5\)/)
  assert.doesNotMatch(worker, /api\/dictionary\/connection-test/)
})
