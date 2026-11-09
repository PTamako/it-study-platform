import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeInventory,inventoryMarkdown } from './report-production-question-inventory.mjs'
test('production question inventory reads aggregate rows only and rejects malformed responses',()=>{
  const data=[{results:[
    {track_id:'exam-sg',source_type:'official',n:448},
    {track_id:'exam-sg',source_type:'generated',n:951},
    {track_id:'exam-fe',source_type:'official',n:116},
    {track_id:'exam-fe',source_type:'licensed',n:259},
    {track_id:'exam-fe',source_type:'generated',n:130},
  ]}]
  const report=summarizeInventory(data)
  assert.equal(report['exam-sg'].total,1399)
  assert.equal(report['exam-fe'].total,505)
  assert.match(inventoryMarkdown(report), /SG \| 448/)
  assert.match(inventoryMarkdown(report), /FE \| 116 \| 259 \| 130/)
  assert.throws(()=>summarizeInventory([{results:[{track_id:'exam-fe',source_type:'official',n:'505'}]}]))
  assert.throws(()=>summarizeInventory([{results:[{track_id:'exam-fe',source_type:'something',n:1}]}]))
})
