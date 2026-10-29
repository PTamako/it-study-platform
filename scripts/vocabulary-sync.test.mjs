import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchVocabularySnapshot } from '../src/vocabulary-sync.ts'

test('retrieves all pages including tombstones', async () => {
  const urls=[]
  const rows=await fetchVocabularySnapshot(async url => {urls.push(url);return {ok:true,json:async()=>urls.length===1?{items:[{term:'a',deleted:false,entry:{term:'a'}}],next:'a'}:{items:[{term:'b',deleted:true}],next:null}}})
  assert.equal(rows.length,2); assert.equal(rows[1].deleted,true); assert.match(urls[1],/after=a/)
})
test('rejects partial responses and repeats without returning partial data',async()=>{
  let n=0
  await assert.rejects(fetchVocabularySnapshot(async()=>++n===1?{ok:true,json:async()=>({items:[{term:'a',deleted:true}],next:'a'})}:{ok:false}))
  await assert.rejects(fetchVocabularySnapshot(async()=>({ok:true,json:async()=>({items:[],next:'a'})})))
  await assert.rejects(fetchVocabularySnapshot(async()=>({ok:true,json:async()=>({items:[]})})))
})
