import { readFileSync, writeFileSync } from 'node:fs'

// Source-reviewed IPA FY2019 spring legacy FE morning questions #71–80.
// Rewritten for bilingual study, never represented as released CBT items.
const data = JSON.parse(readFileSync(new URL('./data/fe-ipa-2019-spring-71-80-reviewed.json', import.meta.url), 'utf8'))
const key = { 71:'d',72:'d',73:'d',74:'c',75:'b',76:'d',77:'a',78:'d',79:'d',80:'c' }
const pages = {71:31,72:32,73:32,74:33,75:33,76:33,77:34,78:34,79:35,80:35}
const Q_URL = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A_URL = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'
const quote = x => "'" + String(x).replaceAll("'", "''") + "'"
const columns=['id','track_id','topic','difficulty','question_type','prompt','options_json',
 'answer_json','explanation','source_type','source_reference','language','exam_section','exam_section_method']
if(data.version!==1 || data.items?.length!==10)throw Error('Expected 10 reviewed IPA questions (#71-80)')
const seen = new Set(), prompts = new Set()
const sql=[
  '-- IPA FY2019 spring FE legacy morning #71-80: adapted bilingual study content.',
  '-- Original question and official answer PDFs confirmed before writing this batch.',
  '-- No fabricated CBT releases; never rewrite previous questions or progress.',
  '-- INSERT OR IGNORE is idempotent; original source and number are retained.'
]
for(const q of data.items){
 const n=q.original_number
 const id='fe-ipa-2019-spring-am-adapt-'+String(n).padStart(2,'0')
 if(n<71||n>80||q.id!==id||seen.has(id)||prompts.has(q.prompt)||
  q.year!==2019||q.exam!=='FE'||q.session!=='spring'||q.original_section!=='午前'||
  q.current_section!=='A'||q.source_type!=='licensed'||q.source_reference!==Q_URL||
  q.official_answer_reference!==A_URL||q.pdf_page!==pages[n]||
  !q.adaptation||q.topic?.length<2||q.prompt?.length<25||
  !Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4||
  !Number.isInteger(q.answer)||'abcd'[q.answer]!==key[n]||
  q.explanation_ja?.length<30||q.explanation_zh?.length<20)
  throw Error('Unverified or duplicate FE IPA source adaptation: '+id)
 seen.add(id);prompts.add(q.prompt)
 const values=[
  id,'exam-fe',q.topic,'standard','single_choice',
  '【2019年度 春期 FE旧制度午前 問'+n+'・改編】'+q.prompt,
  JSON.stringify(q.options.map((text,index)=>({id:'abcd'[index],text}))),
  JSON.stringify('abcd'[q.answer]),
  q.explanation_ja+'\n\n中文解析：'+q.explanation_zh+
    '\n\n出典：IPA 2019年度春期 基本情報技術者試験 午前 問'+n+'（学習用改編）。正答はIPA公式解答表と照合。',
  'licensed',Q_URL,'ja','A','explicit'
 ]
 sql.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES ('+
   values.map(quote).join(', ')+');')
}
if(seen.size!==10||Object.keys(key).some(n=>!seen.has('fe-ipa-2019-spring-am-adapt-'+n)))
 throw Error('Review batch missing one of the 13 original numbers')
writeFileSync(new URL('../migrations/0134_fe_ipa_2019_spring_am_71_80.sql',import.meta.url),sql.join('\n')+'\n','utf8')
console.log('Generated 10 verified FE 2019 spring legacy AM adaptations; D1 untouched.')
