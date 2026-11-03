import {readFileSync,writeFileSync} from 'node:fs'
import {feGrowthAlgorithmQuestions} from './fe-growth1-algorithm-bank.mjs'

// This script is run in GitHub CI before tests and local/remote D1 migrations.
// It NEVER reads or writes a remote D1 database. The source data is committed,
// the generated SQL is deterministic, and all inserts preserve existing IDs.
const read = name => JSON.parse(readFileSync(new URL('data/'+name,import.meta.url),'utf8')).items
const A=read('fe-growth1-subject-a.json')
const security=read('fe-growth1-subject-b-security.json')
const all=[...A,...feGrowthAlgorithmQuestions,...security]
const ids=new Set(), normalizedQuestions=new Set()
const topics=new Set()
const expectedSource='知学オリジナル練習問題（IPA公式過去問ではありません）'
for(const q of all){
  if(ids.has(q.id))throw Error('Duplicate FE question ID: '+q.id)
  ids.add(q.id)
  const normalized=q.prompt.normalize('NFKC').replace(/\s+/g,'').toLowerCase()
  if(normalizedQuestions.has(normalized))throw Error('Repeated FE prompt: '+q.id)
  normalizedQuestions.add(normalized)
  if(!['A','B'].includes(q.section) || (q.section==='B'&&
     !['FE算法与程序设计','FE信息安全'].includes(q.topic)))throw Error('Unsupported FE section/topic: '+q.id)
  if(!Array.isArray(q.options)||q.options.length!==4||
     new Set(q.options).size!==4||
     !Number.isInteger(q.answer)||q.answer<0||q.answer>3)throw Error('Invalid answers: '+q.id)
  if(!q.prompt||q.prompt.length<(q.section==='A'?24:75)||!q.explanation||q.explanation.length<27)
    throw Error('Too little context or reasoning: '+q.id)
  if(q.section==='B'&&q.prompt.length<75)
    throw Error('Subject B should include a multi-step trace or realistic scenario: '+q.id)
  if(q.topic.includes('算法')&&!q.prompt.includes('\n'))
    throw Error('Subject B algorithm must provide code or input trace: '+q.id)
  topics.add(q.topic)
}
if(A.length!==30||feGrowthAlgorithmQuestions.length!==40||security.length!==10||all.length!==80)
  throw Error('FE phase-1 corpus count mismatch')
if(topics.size<18)throw Error('Not enough different FE curricular topics')
const sqlquote = v=>"'"+String(v).replaceAll("'","''")+"'"
const columns=['id','track_id','topic','difficulty','question_type','prompt','options_json',
               'answer_json','explanation','source_type','source_reference','language',
               'exam_section','exam_section_method']
const lines=[
  '-- Original FE phase-1 bank (30 A + 40 B algorithm + 10 B security = 80).',
  '-- Generated entirely from reviewed, committed source data; not IPA past questions.',
  '-- INSERT OR IGNORE preserves all existing exam attempts and mastery.',
]
for(let i=0;i<all.length;i+=8){
  const rows=all.slice(i,i+8).map(q=>{
    const values=[q.id,'exam-fe',q.topic,'standard','single_choice',
       '【知学オリジナル・科目'+q.section+'】'+q.prompt,
       JSON.stringify(q.options.map((text,j)=>({id:'abcd'[j],text}))),
       JSON.stringify('abcd'[q.answer]),q.explanation,'generated',
       expectedSource,'ja',q.section,'explicit']
    return '  ('+values.map(sqlquote).join(', ')+')'
  })
  lines.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES\n'+rows.join(',\n')+';')
}
const outfile=new URL('../migrations/0119_fe_growth_phase1_original_80.sql',import.meta.url)
writeFileSync(outfile,lines.join('\n')+'\n','utf8')
console.log('Generated FE phase-1 bank: '+all.length+' original questions (30 A, 40 B algorithm, 10 B security; '+topics.size+' topics)')
