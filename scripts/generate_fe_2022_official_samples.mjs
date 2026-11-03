import {readFileSync,writeFileSync} from 'node:fs'
// Local, deterministic generator: no remote D1 or network access.
const data=JSON.parse(readFileSync(new URL('./data/fe-2022-official-samples-part1.json',import.meta.url),'utf8'))
const items=data.items
const q=s=>"'"+String(s).replaceAll("'","''")+"'"
const ids=new Set()
const keyA={1:'d',7:'b',8:'c',9:'d',11:'c',13:'d',15:'d',18:'d',19:'d',20:'d',21:'a',23:'a',25:'a',26:'d',27:'b',28:'d',29:'a',30:'a',31:'d',32:'a',36:'a',37:'d',38:'b',39:'b',40:'b',46:'d',48:'b',49:'a',53:'d',54:'d',55:'b',56:'d'}
const keyB={1:'f',3:'f',4:'d',5:'e',6:'a',7:'f'}
const columns=['id','track_id','topic','difficulty','question_type','prompt','options_json','answer_json','explanation','source_type','source_reference','language','exam_section','exam_section_method','question_kind']
if(items.length!==38||data.available_official.A!==60||data.available_official.B!==20)throw Error('2022 batch1 count changed unexpectedly')
const sql=[
  '-- IPA 2022-12-26 FE Official SAMPLE questions: first reviewed 32 A + 6 B.',
  '-- These ARE NOT 2020, 2021 or 2022 actual CBT examination questions.',
  '-- Training adaptations with original IPA sample PDF/answer references retained.',
  '-- source_type=licensed for backwards compatibility; question_kind=official_sample.',
  '-- Migration 0121 must run first; INSERT OR IGNORE preserves old review state.'
]
for(const x of items){
 const key=x.section==='A'?keyA:keyB
 const id='fe-ipa-sample-2022-'+x.section.toLowerCase()+'-'+String(x.question_number).padStart(3,'0')
 const correctUrl='https://www.ipa.go.jp/shiken/syllabus/henkou/2022/ssf7ph000000h5tb-att/fe_kamoku_'+x.section.toLowerCase()+'_set_sample_qs.pdf'
 if(x.id!==id||ids.has(id)||x.question_kind!=='official_sample'||x.source_type!=='licensed'||
    x.source_published_year!==2022||x.source_url!==correctUrl||
    !x.source_answers_url.endsWith('/fe_kamoku_'+x.section.toLowerCase()+'_set_sample_ans.pdf')||
    x.options.length<4||x.options.length>10||new Set(x.options).size!==x.options.length||
    key[x.question_number]!=='abcdefghij'[x.answer]||x.explanation_ja.length<22||
    x.explanation_zh.length<8||x.prompt.length<21)throw Error('Failed IPA provenance/answer validation: '+id)
 ids.add(id)
 const values=[id,'exam-fe',x.topic,'standard','single_choice',
 '【IPA 2022年公開・公式サンプル問題 科目'+x.section+' 問'+x.question_number+'・改編】'+x.prompt,
 JSON.stringify(x.options.map((text,i)=>({id:'abcdefghij'[i],text}))),
 JSON.stringify('abcdefghij'[x.answer]),
 x.explanation_ja+'\n\n中文解析：'+x.explanation_zh+
 '\n\n出典：基本情報技術者試験（科目'+x.section+'試験）サンプル問題セット。IPA 2022年12月公開，原問'+x.question_number+'（学習用改編）。',
 'licensed',x.source_url,'ja',x.section,'explicit','official_sample']
 sql.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES ('+values.map(q).join(', ')+');')
}
writeFileSync(new URL('../migrations/0122_fe_ipa_2022_sample_training_batch1.sql',import.meta.url),sql.join('\n')+'\n','utf8')
console.log('Generated '+items.length+' 2022 IPA sample adaptations (A32/B6) without D1 reads')
