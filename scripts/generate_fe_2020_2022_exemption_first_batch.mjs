import {readFileSync,writeFileSync} from 'node:fs'
// No network, no Cloudflare reads: compile source-reviewed, fully deterministic items.
const data=JSON.parse(readFileSync(new URL('./data/fe-exemption-official-first23.json',import.meta.url),'utf8'))
const keys={
 '2020-06-14':{1:'c',2:'d',3:'a',4:'b',5:'c',6:'b',8:'c',9:'b'},
 '2021-06-13':{1:'a',2:'a',3:'d',4:'c',6:'d',7:'c',8:'b',9:'b'},
 '2022-06-12':{1:'a',2:'c',3:'c',6:'a',9:'a',11:'b',12:'d',5:'b'},
}
const root='https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/'
const quote=v=>"'"+String(v).replaceAll("'","''")+"'"
const columns=['id','track_id','topic','difficulty','question_type','prompt','options_json','answer_json','explanation','source_type','source_reference','language','exam_section','exam_section_method','question_kind','exam_origin']
if(data.items.length!==23||data.additional_occurrences.length!==1)throw Error('Unexpected source bank cardinality')
const seen=new Set(),occurrences=new Set(),sql=[
  '-- IPA official FY2020–2022 FE 修了認定試験, NOT real CBT exam papers.',
  '-- 23 independently authored, source-based training adaptations + 24 exam occurrences.',
  '-- Repeated June 2022 question 5 maps to June 2020 question 4 (one canonical question).',
  '-- 0125 creates exam_origin and fe_exemption_occurrences before this migration.',
  '-- INSERT OR IGNORE preserves previous questions, attempts, and review state.'
]
function validatePaper(year,date,n,url,answerUrl,letter){
 const yyyy=date.slice(0,4),mm=date.slice(5,7),dd=date.slice(8,10),stamp=yyyy+mm+dd
 if(!keys[date]||letter!==keys[date][n]||url!==root+'tokurei_Mondai_'+stamp+'_FE.pdf'||
    answerUrl!==root+'tokurei_ans_'+stamp+'_FE.pdf'||Number(year)!==Number(date.slice(0,4))-(mm==='01'?1:0))
  throw Error('IPA original source/official answer mismatch: '+date+' #'+n)
}
function addOccurrence(year,date,n,id,letter,url,answerUrl){
 validatePaper(year,date,n,url,answerUrl,letter)
 const k=date+'#'+n;if(occurrences.has(k))throw Error('Duplicate sitting/number '+k);occurrences.add(k)
 const values=[date,n,year,id,letter,url,answerUrl]
 sql.push('INSERT OR IGNORE INTO fe_exemption_occurrences (sitting_date,original_question,fiscal_year,canonical_question_id,official_answer,question_url,answer_url) VALUES ('+values.map(quote).join(', ')+');')
}
for(const x of data.items){
 const compact=x.sitting_date.replaceAll('-','')
 const id='fe-exempt-'+x.fiscal_year+'-'+compact+'-q'+String(x.original_question).padStart(2,'0')
 if(x.id!==id||seen.has(id)||x.exam_origin!=='fe_exemption'||x.source_type!=='licensed'||
    !x.topic||!x.prompt||x.prompt.length<25||x.explanation_ja.length<20||x.explanation_zh.length<10||
    x.options.length!==4||new Set(x.options).size!==4||!Number.isInteger(x.answer)||x.answer<0||x.answer>=4)
   throw Error('Malformed FE exemption practice question '+id)
 seen.add(id)
 const letter='abcd'[x.answer]
 validatePaper(x.fiscal_year,x.sitting_date,x.original_question,x.source_url,x.answer_url,letter)
 const vals=[id,'exam-fe',x.topic,'standard','single_choice',
  '【IPA '+x.fiscal_year+'年度 修了認定試験 '+x.sitting_date+' 問'+x.original_question+'・改編】'+x.prompt,
  JSON.stringify(x.options.map((text,i)=>({id:'abcd'[i],text}))),JSON.stringify(letter),
  x.explanation_ja+'\n\n中文解析：'+x.explanation_zh+
  '\n\n出典：IPA '+x.fiscal_year+'年度基本情報技術者試験 修了認定試験 '+x.sitting_date+' 問'+x.original_question+'（学習用改編。通常CBT本試験ではありません）。',
  'licensed',x.source_url,'ja','A','explicit','standard','fe_exemption']
 sql.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES ('+vals.map(quote).join(', ')+');')
 addOccurrence(x.fiscal_year,x.sitting_date,x.original_question,id,letter,x.source_url,x.answer_url)
}
for(const x of data.additional_occurrences){
 if(!seen.has(x.canonical_question_id))throw Error('Missing canonical question for repeat '+x.canonical_question_id)
 addOccurrence(x.fiscal_year,x.sitting_date,x.original_question,x.canonical_question_id,x.official_answer,x.question_url,x.answer_url)
}
if(seen.size!==23||occurrences.size!==24)throw Error('Expected 23 distinct questions and 24 official occurrences')
writeFileSync(new URL('../migrations/0126_fe_ipa_exemption_first23.sql',import.meta.url),sql.join('\n')+'\n','utf8')
console.log('Generated verified FE exemption corpus: 23 distinct learning questions, 24 official source occurrences. D1 untouched.')
