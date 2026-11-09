import { readFileSync, appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// A production-only, read-only inventory: never access personal records.
export function summarizeInventory(payload) {
  const rows=payload?.[0]?.results
  if(!Array.isArray(rows) || !rows.length) throw Error('Missing production question rows')
  const tally={ 'exam-sg':{official:0,generated:0,licensed:0,total:0},
    'exam-fe':{official:0,generated:0,licensed:0,total:0} }
  for(const row of rows){
    if(!Object.hasOwn(tally,row.track_id) || !['official','generated','licensed'].includes(row.source_type)
      || !Number.isSafeInteger(row.n) || row.n<0) throw Error('Invalid production question inventory row')
    tally[row.track_id][row.source_type]+=row.n
    tally[row.track_id].total+=row.n
  }
  if(!tally['exam-sg'].total || !tally['exam-fe'].total) throw Error('Exam bank unexpectedly empty')
  return tally
}
export function inventoryMarkdown(tally) {
  const s=tally['exam-sg'],f=tally['exam-fe']
  return [
    '### Production question inventory (D1, read-only)',
    '| Track | Official | Adapted / samples / exemptions | Generated | Total |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| SG | ${s.official} | ${s.licensed} | ${s.generated} | **${s.total}** |`,
    `| FE | ${f.official} | ${f.licensed} | ${f.generated} | **${f.total}** |`,
    '',
    'Source labels are not proof of verbatim official exam content; review the source catalog and provenance.',
    '',
  ].join('\n')
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const raw=readFileSync(0,'utf8')
  const start=raw.search(/\[\s*\{/)
  if(start<0) throw Error('No Wrangler D1 JSON returned')
  const data=JSON.parse(raw.slice(start))
  const markdown=inventoryMarkdown(summarizeInventory(data))
  console.log(markdown)
  if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown+'\n')
}
