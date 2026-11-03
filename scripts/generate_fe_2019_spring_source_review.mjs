import { readFileSync, writeFileSync } from 'node:fs'

// IPA-source reviewed 2019 spring FE *legacy morning* adaptations.
// Compiled locally in CI and then applied by the existing D1 migration flow.
// No remote D1 reads, writes, API requests or external content downloads here.
const file = new URL('./data/fe-ipa-2019-spring-07-27-reviewed.json',import.meta.url)
const data = JSON.parse(readFileSync(file,'utf8'))
const items = data.items
const quote = s => "'" + String(s).replaceAll("'","''") + "'"
const Q_URL = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf'
const A_URL = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf'
const key = {7:'d',8:'a',9:'c',10:'b',11:'d',12:'c',13:'d',14:'d',
  15:'d',16:'b',17:'a',18:'d',19:'a',20:'d',21:'d',22:'b',23:'a',
  24:'c',25:'c',26:'b',27:'b'}
if(data.version!==1||items.length!==21)throw Error('FE source review count mismatch')
const ids=new Set(), prompts=new Set()
const columns=['id','track_id','topic','difficulty','question_type','prompt',
  'options_json','answer_json','explanation','source_type','source_reference',
  'language','exam_section','exam_section_method']
let lines=[
  '-- 2019 spring FE former morning exam: IPA official-source-adapted questions 7-27.',
  '-- Official original IDs/answer sheet verified; diagrams/text are rewritten for study.',
  '-- NOT current CBT Subject B or unmodified IPA original text.',
  '-- License: https://www.ipa.go.jp/shiken/faq.html ; cite year/session/number and 改編.',
  '-- INSERT OR IGNORE preserves existing attempts, mastery and previous questions.',
]
for(const item of items){
  const {id,year,session,original_section,original_number,current_section,
    source_type,source_reference,official_answer_reference,pdf_page,
    adaptation,topic,prompt,options,answer,explanation_ja,explanation_zh}=item
  if(ids.has(id)||prompts.has(prompt))throw Error('Duplicated question: '+id)
  ids.add(id);prompts.add(prompt)
  if(id!=='fe-ipa-2019-spring-am-adapt-'+String(original_number).padStart(2,'0')||
    year!==2019||session!=='spring'||original_section!=='午前'||
    original_number<7||original_number>27||current_section!=='A'||
    source_type!=='licensed'||source_reference!==Q_URL||
    official_answer_reference!==A_URL||
    !Number.isInteger(pdf_page)||pdf_page<6||pdf_page>13||
    !adaptation||!topic||!prompt||prompt.length<16||
    !Array.isArray(options)||options.length!==4||
    new Set(options).size!==4||!Number.isInteger(answer)||
    'abcd'[answer]!==key[original_number]||
    !explanation_ja||!explanation_zh||
    explanation_ja.length<27||explanation_zh.length<14){
      throw Error('Invalid IPA source/answer/annotation: '+id)
  }
  const vals=[
    id,'exam-fe',topic,'standard','single_choice',
    '【2019年度 春期 FE旧制度午前 問'+original_number+'・改編】'+prompt,
    JSON.stringify(options.map((text,index)=>({id:'abcd'[index],text}))),
    JSON.stringify('abcd'[answer]),
    explanation_ja+'\n\n中文解析：'+explanation_zh+'\n\n出典：IPA 2019年度 春期 基本情報技術者試験 午前 問'+original_number+'（学習用に改編，特に図表は文章化）。',
    'licensed',Q_URL,'ja','A','explicit'
  ]
  lines.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES ('+
    vals.map(quote).join(', ')+');')
}
const target=new URL('../migrations/0120_fe_ipa_2019_spring_morning_07_27.sql',import.meta.url)
writeFileSync(target,lines.join('\n')+'\n','utf8')
console.log('Prepared '+items.length+' IPA-source 2019 spring FE morning adapted items, IDs 7-27; D1 untouched')
