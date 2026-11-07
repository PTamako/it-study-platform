import test from 'node:test'
import assert from 'node:assert/strict'
import {fetchVocabularySnapshot,vocabularyKey,parseVocabularyKey} from '../src/vocabulary-sync.ts'
test('composite language keys keep same spelling separate',()=>{
 assert.notEqual(vocabularyKey('gift','en'),vocabularyKey('gift','ja'))
 assert.deepEqual(parseVocabularyKey('ja:gift'),{term:'gift',language:'ja'})
})
test('composite pagination includes every row and tombstone',async()=>{
 const first=Array.from({length:200},(_,i)=>({language:'en',term:'t'+String(i).padStart(3,'0'),deleted:false,entry:{term:'t'}}))
 let n=0; const result=await fetchVocabularySnapshot(async url=>{
  n++;if(n===2)assert.match(url,/after=en%3At199/)
  return {ok:true,json:async()=>n===1?{items:first,next:'en:t199'}:{items:[{language:'ja',term:'t',deleted:true}],next:null}}
 })
 assert.equal(result.length,201);assert.equal(result.at(-1).deleted,true)
})
test('partial and repeated pages fail closed',async()=>{
 await assert.rejects(fetchVocabularySnapshot(async()=>({ok:true,json:async()=>({items:[]})})))
 await assert.rejects(fetchVocabularySnapshot(async()=>({ok:true,json:async()=>({items:[{language:'ja',term:'t',deleted:true},{language:'ja',term:'t',deleted:true}],next:null})})))
})
