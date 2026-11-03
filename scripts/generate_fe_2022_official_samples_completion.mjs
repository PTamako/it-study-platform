import {readFileSync,writeFileSync} from 'node:fs'

// Source-reviewed IPA sample adaptations. This generator is local-only and does
// not query Cloudflare/D1. Reuse the original stable IDs from the official set.
const files=[
  'fe-2022-official-samples-a-remaining28.json',
  'fe-2022-official-samples-b-remaining14.json',
  'fe-2022-official-samples-april-b6.json'
]
const [a,b,april]=files.map(name=>JSON.parse(readFileSync(new URL('./data/'+name,import.meta.url),'utf8')).items)
const keyA={2:'d',3:'d',4:'a',5:'b',6:'d',10:'c',12:'b',14:'d',16:'a',17:'d',22:'b',24:'b',33:'c',34:'c',35:'b',41:'c',42:'d',43:'c',44:'d',45:'b',47:'d',50:'a',51:'d',52:'a',57:'c',58:'b',59:'b',60:'c'}
const keyB={2:'c',8:'d',9:'c',10:'f',11:'a',12:'d',13:'c',14:'h',15:'a',16:'h',17:'f',18:'d',19:'d',20:'f'}
const keyApril={1:'f',2:'c',3:'a',4:'b',5:'c',6:'e'}
if(a.length!==28||b.length!==14||april.length!==6)throw Error('Expected 28+14+6 source-reviewed sample questions')
const old=JSON.parse(readFileSync(new URL('./data/fe-2022-official-samples-part1.json',import.meta.url),'utf8')).items
if(old.length!==38)throw Error('Existing official sample set unexpectedly changed')
const seen=new Set(old.map(x=>x.id))
const quote=s=>"'"+String(s).replaceAll("'","''")+"'"
const columns=['id','track_id','topic','difficulty','question_type','prompt','options_json','answer_json','explanation','source_type','source_reference','language','exam_section','exam_section_method','question_kind']
const DecRoot='https://www.ipa.go.jp/shiken/syllabus/henkou/2022/ssf7ph000000h5tb-att/'
const AprPdf='https://www.ipa.go.jp/shiken/syllabus/ps6vr7000000oett-att/fe_kamoku_b_sample.pdf'
const statements=[
  '-- 2022 IPA official SAMPLE problems (not actual 2020-2022 CBT exam past papers).',
  '-- Second batch: Dec 2022 subject A 28 + B 14 and April 2022 B 6 = 48.',
  '-- Rewritten for learning; preserve original year/set/number, exact IPA PDF URL and answer.',
  '-- 0121 adds question_kind; 0122 adds first 38. This 0123 adds remaining 48 only.',
  '-- INSERT OR IGNORE never rewrites existing question or personal learning records.'
]
for(const item of [...a,...b,...april]){
 const isApril=item.source_set==='2022-april'||item.id.includes('-april-')
 const key=isApril?keyApril:(item.section==='A'?keyA:keyB)
 const expectedId=isApril
   ?'fe-ipa-sample-2022-april-b-'+String(item.question_number).padStart(3,'0')
   :'fe-ipa-sample-2022-'+item.section.toLowerCase()+'-'+String(item.question_number).padStart(3,'0')
 const expectedUrl=isApril?AprPdf:DecRoot+'fe_kamoku_'+item.section.toLowerCase()+'_set_sample_qs.pdf'
 const expectedAns=isApril?AprPdf:DecRoot+'fe_kamoku_'+item.section.toLowerCase()+'_set_sample_ans.pdf'
 if(item.id!==expectedId||seen.has(item.id)||item.question_kind!=='official_sample'||item.source_type!=='licensed'||
    item.source_published_year!==2022||item.source_url!==expectedUrl||item.source_answers_url!==expectedAns||
    !['A','B'].includes(item.section)||!item.topic||item.prompt.length<24||
    !Array.isArray(item.options)||item.options.length<4||item.options.length>10||
    new Set(item.options).size!==item.options.length||!Number.isInteger(item.answer)||
    'abcdefghij'[item.answer]!==key[item.question_number]||
    !item.explanation_ja||item.explanation_ja.length<21||
    !item.explanation_zh||item.explanation_zh.length<10)
   throw Error('Invalid IPA provenance, explanation or official answer for '+item.id)
 seen.add(item.id)
 const sourceLabel=isApril?'2022年4月公開・科目Bサンプル':'2022年12月公開・科目'+item.section+'サンプル'
 const values=[
   item.id,'exam-fe',item.topic,'standard','single_choice',
   '【IPA 2022年公開・公式サンプル問題 '+sourceLabel+' 問'+item.question_number+'・改編】'+item.prompt,
   JSON.stringify(item.options.map((text,i)=>({id:'abcdefghij'[i],text}))),
   JSON.stringify('abcdefghij'[item.answer]),
   item.explanation_ja+'\n\n中文解析：'+item.explanation_zh+'\n\n出典：IPA 基本情報技術者試験 '+sourceLabel+' 原問'+item.question_number+'（学習用改編。実試験のCBT過去問ではありません）。',
   'licensed',item.source_url,'ja',item.section,'explicit','official_sample'
 ]
 statements.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES ('+values.map(quote).join(', ')+');')
}
if(seen.size!==86)throw Error('December A60/B20 plus April B6 must total 86 unique sample IDs')
const outfile=new URL('../migrations/0123_fe_ipa_2022_sample_completion.sql',import.meta.url)
writeFileSync(outfile,statements.join('\n')+'\n','utf8')
console.log('Prepared 48 2022 IPA sample adaptations; complete verified corpus 86 (A60; B26). No remote D1 access.')
