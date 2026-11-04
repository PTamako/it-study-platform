import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {auditSentence, auditWord, auditGrammarLesson, inspectCorpus} from './audit-language-quality.mjs'

const hit = (sentence, term, type, meaning='含义', explanation='根据具体语境解释') => ({
  start:[...sentence.slice(0,sentence.indexOf(term))].length,
  end:[...sentence.slice(0,sentence.indexOf(term))].length+[...term].length,
  term,type,meaning,explanation,
})
function sentence(term='学校から駅まで歩きます。', lang='ja'){
  const word=hit(term,lang==='ja'?'学校':'meeting','vocabulary')
  const gram=hit(term,lang==='ja'?'から':'Could you','grammar')
  const all=[word,gram].sort((a,b)=>a.start-b.start)
  return {id:lang+'-1',language:lang,category:'日常句子',term,meaning_zh:'到车站走路。',
    source_type:'licensed',content_type:'sentence',source_url:'https://tatoeba.org/en/sentences/show/12345',
    highlight_json:JSON.stringify(all),
    vocabulary_expansion_json:JSON.stringify([{term:word.term,meaning:word.meaning,explanation:word.explanation}]),
    grammar_expansion_json:JSON.stringify([{term:gram.term,meaning:gram.meaning,explanation:gram.explanation}])}
}
const word=(term='学校',lang='ja')=>({
  id:lang+':'+term,language:lang,term,meaning_zh:'学校',reading:'',example:'',
  example_meaning_zh:'',source_type:'licensed',
})
const lesson=(lang='ja')=>({
  id:lang+'-01',point:'重点语法',zh:'解释',ja:'説明',form:'名词 + ...',
  example:'例句',translation:'译文',tipZh:'中文提示',tipJa:'日本語の説明',
  questions:[0,1].map(n=>({prompt:'这句话___。',options:['a','b','c','d'],correct:n,whyZh:'中文理由',whyJa:'日本語の理由'})),
})

test('a valid sourced sentence validates structural spans but queues ambiguous particles for review',()=>{
  const item=sentence()
  const result=auditSentence(item,'ja')
  assert.deepEqual(result.errors,[])
  assert.ok(result.warnings.some(x=>x.includes('contextual')))
  assert.equal(result.highlights,2)
})

test('invalid segmentation, fake sources and missing explanations are blocked instead of passed to UI',()=>{
  const item=sentence()
  const bad=JSON.parse(item.highlight_json)
  bad[0]={...bad[0],start:5,end:7,term:'いつ'}
  item.highlight_json=JSON.stringify(bad)
  item.source_url='https://third-party.invalid/word/123'
  item.grammar_expansion_json='not-json'
  const errors=auditSentence(item,'ja').errors.join('; ')
  assert.match(errors,/invalid Tatoeba source/)
  assert.match(errors,/malformed JSON/)
  assert.match(errors,/invalid or ungrounded highlight/)
})
test('Unicode astral symbols use Unicode code-point rather than UTF-16 offsets',()=>{
  const item=sentence()
  item.term='😊'+item.term
  const hits=JSON.parse(item.highlight_json).map(h=>({...h,start:h.start+1,end:h.end+1}))
  item.highlight_json=JSON.stringify(hits)
  assert.deepEqual(auditSentence(item,'ja').errors,[])
})
test('missing reading or bilingual example is a reportable gap, not a license to hallucinate',()=>{
  const item=word()
  assert.deepEqual(auditWord(item,'ja').errors,[])
  assert.deepEqual(auditWord(item,'ja').missing,['reading','source example','bilingual example'])
  assert.deepEqual(auditWord({...item,example:'学校に行く'},'ja').missing,['reading','example translation','bilingual example'])
  assert.ok(auditWord({...item,source_type:'generated'},'ja').errors.some(x=>x.includes('original reviewed')))
})
test('daily grammar requires bilingual reasons, unique distractors and one exercise blank',()=>{
  assert.deepEqual(auditGrammarLesson(lesson(),'ja').errors,[])
  const broken=lesson()
  broken.questions[0].correct=4
  broken.questions[0].options[1]='a'
  broken.questions[1].prompt='没有空格'
  broken.questions[1].whyJa=''
  const errors=auditGrammarLesson(broken,'ja').errors.join('; ')
  assert.match(errors,/invalid answer index/)
  assert.match(errors,/invalid answer options/)
  assert.match(errors,/invalid fill-in-the-blank/)
  assert.match(errors,/missing bilingual answer reasoning/)
})
test('collection audit reports duplicate IDs/terms and never calls Worker or production D1',async()=>{
  const result=inspectCorpus({ja:[sentence(),sentence()],en:[]},{ja:[word(),word()],en:[]},{ja:[lesson()],en:[]})
  assert.equal(result.ok,false)
  assert.ok(result.errors.some(e=>e.issue==='duplicate ID'))
  assert.ok(result.errors.some(e=>e.issue==='duplicate headword'))
  assert.ok(result.reviewQueue.length>0)
  const source=await readFile(new URL('./audit-language-quality.mjs',import.meta.url),'utf8')
  assert.doesNotMatch(source,/cloudflare\.request|wrangler d1|AI\.run|fetch\(/)
})
