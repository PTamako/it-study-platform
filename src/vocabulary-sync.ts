export type VocabularyLanguage = 'auto'|'ja'|'en'|'zh'
export type VocabularySyncRow = {term:string;language:VocabularyLanguage;deleted:boolean;entry?:unknown}
export function vocabularyKey(term:string,language:string='auto'):string {
 return (['auto','ja','en','zh'].includes(language)?language:'auto')+':'+term
}
export function parseVocabularyKey(key:string):{term:string;language:VocabularyLanguage}{
 const match=/^(auto|ja|en|zh):(.*)$/.exec(key)
 return match?{language:match[1] as VocabularyLanguage,term:match[2]}:{term:key,language:'auto'}
}
export async function fetchVocabularySnapshot(request:typeof fetch):Promise<VocabularySyncRow[]>{
 const rows:VocabularySyncRow[]=[]; const cursors=new Set<string>()
 let after='',last=''
 while(true){
  const response=await request('/api/vocabulary/saved?sync=1&after='+encodeURIComponent(after),{cache:'no-store'})
  if(!response.ok)throw Error('Unable to load vocabulary')
  const data=await response.json() as {items?:unknown;next?:unknown}
  if(!Array.isArray(data.items)||data.items.length>200||!('next' in data))throw Error('Invalid vocabulary page')
  for(const row of data.items){
   if(!row||typeof row!=='object'||typeof row.term!=='string'||
     !['auto','ja','en','zh'].includes(row.language)||typeof row.deleted!=='boolean')
     throw Error('Invalid vocabulary item')
   if(!row.deleted&&(!row.entry||typeof row.entry!=='object'))throw Error('Invalid vocabulary entry')
   const key=vocabularyKey(row.term,row.language)
   if(key<=last)throw Error('Unsorted vocabulary rows')
   last=key;rows.push(row as VocabularySyncRow)
  }
  if(data.next===null)return rows
  if(typeof data.next!=='string'||data.next!==last||data.next===after||cursors.has(data.next)||data.items.length!==200)
   throw Error('Invalid vocabulary cursor')
  cursors.add(data.next);after=data.next
 }
}
