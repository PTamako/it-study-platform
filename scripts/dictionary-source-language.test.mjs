import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

async function loadTs(rel) {
  const source = await readFile(new URL(rel, import.meta.url), 'utf8')
  const compiled = ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })
  return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'))
}
const presentation = await loadTs('../src/dictionary-presentation.ts')
const moedict = await loadTs('../worker/chinese-word-dictionary.ts')

test('Chinese original is not repeated beneath Chinese headword', () => {
  const rows = presentation.dictionaryTranslationRows({
    term:'栗子', language:'zh', zh:'栗子', translationJa:'栗',
    en:'chestnut', englishTerm:'chestnut',
  })
  assert.deepEqual(rows, [
    { language:'ja', label:'日', value:'栗' },
    { language:'en', label:'英', value:'chestnut' },
  ])
  assert.equal(rows.filter(row => row.language === 'zh').length,0)
  assert.equal(rows.filter(row => row.language === 'en').length,1)
})
test('English/Japanese original is never repeated; dictionary definitions remain independent', () => {
  assert.deepEqual(presentation.dictionaryTranslationRows({
    term:'book',language:'en',en:'book',englishTerm:'book',zh:'书',translationJa:'本',
    senses:[{ partOfSpeech:'noun',definitions:['A set of bound pages.'] }],
  }),[
    { language:'zh',label:'中',value:'书' },
    { language:'ja',label:'日',value:'本' },
  ])
  assert.deepEqual(presentation.dictionaryTranslationRows({
    term:'雨',language:'ja',translationJa:'雨',zh:'雨水',en:'rain',englishTerm:'rain',
  }),[
    { language:'zh',label:'中',value:'雨水' },
    { language:'en',label:'英',value:'rain' },
  ])
})
test('same-language raw sentences and repeated translations are filtered', () => {
  const result=presentation.dictionaryTranslationRows({
    term:'今晚可能会下小雨',language:'zh',zh:'今晚可能会下小雨',
    translationJa:'今夜は小雨が降るかもしれない。',
    en:'It might rain lightly tonight.',englishTerm:'It might rain lightly tonight.',
  })
  assert.equal(result.length,2)
  assert.deepEqual(result.map(row=>row.language),['ja','en'])
})
test('Mandarin pinyin tone marks render all syllable tones (incl. neutral tone)', () => {
  assert.deepEqual(presentation.chinesePinyinToneLabels('lì zi'), ['四声','轻声'])
  assert.deepEqual(presentation.chinesePinyinToneLabels('píng guǒ'), ['二声','三声'])
  assert.deepEqual(presentation.chinesePinyinToneLabels('wǎn shang'), ['三声','轻声'])
  assert.deepEqual(presentation.chinesePinyinToneLabels(''), [])
})
test('Moedict parser retrieves exact headword pronunciation and vetted grammatical labels', () => {
  const data={title:'栗子',heteronyms:[{
    pinyin:'lì zi',definitions:[{type:'名',def:'test content'}, {type:'名',def:'other'}],
  }]}
  const row=moedict.parseMoedictWord(data,'栗子')
  assert.deepEqual(row, {
    pinyin:'lì zi',partsOfSpeech:['名词'],lexicalSource:'萌典 · 教育部国语辞典',
  })
  assert.equal(moedict.parseMoedictWord({...data,title:'栗'},'栗子'),null)
  assert.equal(moedict.parseMoedictWord({title:'栗子',heteronyms:[{pinyin:'',definitions:[]}]},'栗子'),null)
})
test('unknown remote classes do not become invented POS; limit lookup to short Chinese words', async () => {
  let calls=0
  const fetcher=async (url) => {
    calls++
    assert.equal(url,'https://www.moedict.tw/raw/%E6%A0%97%E5%AD%90.json')
    return new Response(JSON.stringify({
      title:'栗子',heteronyms:[{pinyin:'lì zi',definitions:[{type:'unknown'}]}],
    }), {status:200})
  }
  assert.equal(moedict.eligibleChineseWord('栗子'),true)
  assert.equal(moedict.eligibleChineseWord('今晚可能会下小雨'),false)
  assert.equal(moedict.eligibleChineseWord('栗子 pudding'),false)
  assert.equal(await moedict.fetchChineseWordMetadata('今晚可能会下小雨',fetcher),null)
  assert.equal(calls,0)
  assert.deepEqual(await moedict.fetchChineseWordMetadata('栗子',fetcher),{
    pinyin:'lì zi',partsOfSpeech:[],lexicalSource:'萌典 · 教育部国语辞典',
  })
  assert.equal(calls,1)
})
test('UI reflects source language, pinyin+tone and provenance while retaining audio/bookmark/AI',async()=>{
  const app=await readFile(new URL('../src/App.vue',import.meta.url),'utf8')
  const worker=await readFile(new URL('../worker/index.ts',import.meta.url),'utf8')
  assert.match(app,/dictionaryTranslationRows\(entry\)/)
  assert.match(app,/dictionaryWordPinyin\(entry\)/)
  assert.match(app,/dictionaryWordTones\(entry\)/)
  assert.match(app,/普通话声调/)
  assert.match(app,/entry\.lexicalSource/)
  assert.doesNotMatch(app,/v-if="entry\.zh" class="lexical-translation-row"/)
  assert.match(app,/speakDictionaryChinese\(entry\)/)
  assert.match(app,/toggleSaved\(entry\)/)
  assert.match(app,/supplementDictionaryWithAi\(entry\)/)
  assert.match(worker,/fetchChineseWordMetadata\(query\)/)
  assert.match(worker,/pinyin:\s*lexical\?\.pinyin/)
  assert.match(worker,/partsOfSpeech:\s*lexical\?\.partsOfSpeech/)
})
