import { readFileSync, writeFileSync } from 'node:fs'

// IPA FY2020-06-14 修了認定試験: two image/flowchart questions carefully
// transcribed into fully answerable text, with the official answer-sheet keys.
const data = JSON.parse(readFileSync(
  new URL('./data/fe-exemption-20200614-q07-q10-reviewed.json', import.meta.url),'utf8'))
const expected = {7:'b',10:'a'}
const root = 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/'
const qUrl = root+'tokurei_Mondai_20200614_FE.pdf'
const aUrl = root+'tokurei_ans_20200614_FE.pdf'
const quote = x => "'" + String(x).replaceAll("'", "''") + "'"
const columns = ['id','track_id','topic','difficulty','question_type','prompt',
 'options_json','answer_json','explanation','source_type','source_reference','language',
 'exam_section','exam_section_method','question_kind','exam_origin']
if(data.version!==1 || data.items?.length!==2) throw Error('Expected exactly two reviewed FE exemption positions')
const seen = new Set()
const sql = [
 '-- IPA 2020-06-14 FE 修了認定試験 Q7 binary-tree diagram / Q10 flowchart.',
 '-- Fully transcribed into equivalent text notation; independently checked official keys.',
 '-- These are source-attributed study adaptations, not actual 2020 CBT exam releases.',
 '-- Insert-only, canonical questions plus official sitting occurrences. Existing histories preserved.'
]
for(const row of data.items){
 const n = row.original_question, key = row.id
 if(!Object.hasOwn(expected,n) || seen.has(n) ||
    key!=='fe-exempt-2020-20200614-q'+String(n).padStart(2,'0') ||
    row.fiscal_year!==2020 || row.sitting_date!=='2020-06-14' ||
    row.exam_origin!=='fe_exemption' || row.source_type!=='licensed' ||
    row.source_url!==qUrl || row.answer_url!==aUrl ||
    row.question_pdf_page!==(n===7?5:7) ||
    !row.topic || row.prompt?.length<80 ||
    !Array.isArray(row.options) || row.options.length!==4 ||
    new Set(row.options).size!==4 || expected[n]!=='abcd'[row.answer] ||
    row.explanation_ja?.length<70 || row.explanation_zh?.length<30 ||
    !row.visual_equivalent)
   throw Error('Unverified IPA source, complete diagram or key: '+key)
 seen.add(n)
 const vals=[
  key,'exam-fe',row.topic,'standard','single_choice',
  '【IPA 2020年度 修了認定試験 2020-06-14 問'+n+'・図表文字化／改編】'+row.prompt,
  JSON.stringify(row.options.map((text,i)=>({id:'abcd'[i],text}))),
  JSON.stringify(expected[n]),row.explanation_ja+'\n\n中文解析：'+row.explanation_zh+
    '\n\n図表の文字化：'+row.visual_equivalent+
    '\n\n出典：IPA 2020年度 修了認定試験 2020-06-14 問'+n+
    '（学習用改編・通常CBT本試験ではありません）。',
  'licensed',qUrl,'ja','A','explicit','standard','fe_exemption'
 ]
 sql.push('INSERT OR IGNORE INTO questions ('+columns.join(', ')+') VALUES ('+
   vals.map(quote).join(', ')+');')
 const occurrence=['2020-06-14',n,2020,key,expected[n],qUrl,aUrl]
 sql.push('INSERT OR IGNORE INTO fe_exemption_occurrences '+
  '(sitting_date,original_question,fiscal_year,canonical_question_id,official_answer,question_url,answer_url) VALUES ('+
  occurrence.map(quote).join(', ')+');')
}
if(seen.size!==2 || !seen.has(7) || !seen.has(10)) throw Error('Missing 2020 Q7 or Q10')
writeFileSync(new URL('../migrations/0131_fe_exemption_20200614_q07_q10.sql',import.meta.url),
 sql.join('\n')+'\n','utf8')
console.log('Prepared 2 official-paper-referenced, fully textualized FE exemption questions and 2 source occurrences. No D1 touched.')
