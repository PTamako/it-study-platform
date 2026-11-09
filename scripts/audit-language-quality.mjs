/**
 * Offline quality gate for licensed language assets + authored daily grammar.
 * Structural failures block CI; linguistic ambiguities enter a review queue.
 * No Worker, production D1, AI or network calls. Never claim semantic accuracy
 * merely because a sentence has valid spans and bilingual explanations.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import ts from 'typescript'

const ROOT = resolve(import.meta.dirname || new URL('..', import.meta.url).pathname, '..')
const LANGUAGES = ['ja', 'en']
const CATEGORIES = ['日常句子', '职场语言']
const FILLERS = new Set(['句中重点表达','句子结构观察点','句尾活用／表达观察点'])
const nonempty = value => typeof value === 'string' && Boolean(value.trim())
const normalized = value => String(value || '').trim().toLocaleLowerCase()

export function auditSentence(card, language) {
  const errors = [], warnings = []
  const field = (ok, label) => { if (!ok) errors.push(label) }
  field(card?.language === language, 'wrong language')
  field(card?.content_type === 'sentence', 'not a sentence')
  field(CATEGORIES.includes(card?.category), 'invalid sentence category')
  field(nonempty(card?.id) && nonempty(card?.term) && nonempty(card?.meaning_zh), 'missing sentence or translation')
  field(card?.source_type === 'licensed' && /^https:\/\/tatoeba\.org\/en\/sentences\/show\/\d+$/.test(card?.source_url || ''), 'invalid Tatoeba source')
  let hits = []
  for (const [name, expectedType] of [['highlight_json',null],['vocabulary_expansion_json','vocabulary'],['grammar_expansion_json','grammar']]) {
    try {
      const parsed = JSON.parse(card?.[name] || 'null')
      if (!Array.isArray(parsed)) throw Error('not array')
      if (name === 'highlight_json') hits = parsed
      else {
        if (!parsed.length) errors.push(name + ': empty explanations')
        const terms = new Set(hits.filter(x => x?.type === expectedType).map(x => x.term))
        for (const term of terms) {
          if (!parsed.some(x => x?.term === term && nonempty(x?.meaning) && nonempty(x?.explanation))) {
            errors.push(name + ': unexplained highlight ' + term)
          }
        }
      }
    } catch {
      errors.push(name + ': malformed JSON')
    }
  }
  const points = [...String(card?.term || '')]
  const sorted = []
  for (const hit of hits) {
    if (!hit || !['grammar','vocabulary'].includes(hit.type) ||
        !Number.isInteger(hit.start) || !Number.isInteger(hit.end) ||
        hit.start < 0 || hit.end <= hit.start || hit.end > points.length ||
        points.slice(hit.start, hit.end).join('') !== hit.term ||
        !nonempty(hit.meaning) || !nonempty(hit.explanation)) {
      errors.push('invalid or ungrounded highlight')
      continue
    }
    if (FILLERS.has(hit.meaning) || /未识别到明确/.test(hit.explanation)) errors.push('placeholder explanation')
    const before = points.slice(0, hit.start).join('')
    const after = points.slice(hit.end).join('')
    // Proven false positive forms from the published first 120 review queue.
    // Don't let the generator silently reintroduce them in future deployments.
    if (hit.type === 'grammar' && language === 'ja' &&
        /^(?:のだ|のです)$/.test(hit.term) && before.endsWith('も'))
      errors.push('ものだ/ものです is not explanatory のだ/のです')
    if (language === 'en' && /^(?:would you|could you)$/i.test(hit.term) &&
        before.trim() && !/[,!?。.]\s*$/.test(before))
      errors.push('embedded modal question is not a polite-request formula')
    if (language === 'ja') {
      if (hit.term === 'から' && /(?:分|判|解|わ)$/.test(before) && /^(?:ない|なかった|ず)/.test(after))
        errors.push('negative verb わからない is not causal から')
      if (hit.term === 'だけ' && /いた$/.test(before) && /^(?:る|ます|ません|ない|れ|た)/.test(after))
        errors.push('いただけます is not restriction だけ')
      if (hit.term === 'の' && /(?:こ|そ|あ|ど|ほん)$/.test(before))
        errors.push('demonstrative/adverb is not possessive の')
      if (hit.term === 'と' && (/^(?:ても|き)/.test(after) || /こ$/.test(before)))
        errors.push('fixed word fragment is not particle と')
      if (hit.term === 'に' && /(?:確か|本当|非常|特|実)$/.test(before))
        errors.push('fixed adverb is not case particle に')
      if (hit.term === 'あれ' && /^ば/.test(after))
        errors.push('verb conditional あれば is not demonstrative あれ')
      if (hit.term === 'の' && /^[。！？!?…]/.test(after) && /连接名词/.test(hit.meaning))
        errors.push('sentence-final の is not noun connector')
    }
    if (language === 'ja') {
      if (hit.term === 'の' && before.endsWith('も'))
        errors.push('もの is a noun, not standalone possessive の')
      if (hit.term === 'と' && before.endsWith('あ'))
        errors.push('あと is a word, not standalone conjunction と')
      if (hit.term === 'もの' && /^が言え/.test(after))
        errors.push('ものが言えない is an idiom, not a physical item')
      if (hit.term === 'よく' && /^ない/.test(after))
        errors.push('よくない is negative adjective, not positive/frequency よく')
      if (hit.term === 'で' && /^はない/.test(after) && /地点|手段/.test(hit.meaning))
        errors.push('ではない is copular negation, not location/instrument で')
      if (hit.term === 'に' && /目标|时间|对象/.test(hit.meaning) &&
          (before.endsWith('代わり') || (before.endsWith('よう') && /^お願いします/.test(after))))
        errors.push('代わりに / ようにお願いします must not be labelled as generic particle に')
      if (hit.term === 'で' && /地点|手段/.test(hit.meaning) && (
          /^(?:きる|きない|きます|きました|きません|きた|きて|きれば)/.test(after) ||
          /[0-9０-９一二三四五六七八九十]+(?:歩|日|分|時間|週間|か月|ヶ月|年)$/.test(before) ||
          /(?:る|た|ない)上$/.test(before) ||
          (before.endsWith('天気予報') && /^は/.test(after))
        )) errors.push('fixed expression or temporal/conditional で is not a place/instrument particle')
      if (hit.term === 'と' && before.endsWith('へ') && /共同对象|引用/.test(hit.meaning))
        errors.push('directional へと is not quotation or accompaniment と')
    }
    if (language === 'en') {
      if (hit.type === 'grammar' && /名词短语/.test(hit.meaning) &&
          (/^a bit(?:\s+(?:early|late|more|less|better|worse|faster|slower|longer|shorter))?$/i.test(hit.term) &&
           /^(?:a bit\s+|\s+(?:early|late|more|less|better|worse|faster|slower|longer|shorter)\b)/i.test(hit.term+' '+after)))
        errors.push('a bit + degree modifier is an adverbial, not an ordinary noun phrase')
      if (hit.type === 'grammar' && /^a customer$/i.test(hit.term) && /^\s+service\s+representative\b/i.test(after))
        errors.push('customer service representative is a full occupational compound')
      if (/^like$/i.test(hit.term) && /\b(?:eat|ate|run|ran|behave|act)\s+$/i.test(before) &&
          /^\s+(?:a|an|the)\s+/i.test(after) && /喜欢|love|enjoy/.test(hit.meaning))
        errors.push('comparative like is not the verb like/love')
      if (/^meeting$/i.test(hit.term) && /\b(?:my|your|his|her|our|their)\s+$/i.test(before) &&
          /^\s+(?:him|her|them|me|us|you)\b/i.test(after) && /会议/.test(hit.meaning))
        errors.push('gerund meeting somebody is not a conference')
      if (/^close$/i.test(hit.term) && /^\s+by\b/i.test(after) && /关闭|接近/.test(hit.meaning))
        errors.push('close by means nearby, not close/shut')
      if (/^a post$/i.test(hit.term) && /^\s+office\b/i.test(after))
        errors.push('post office is one compound noun')
      if (/^leave$/i.test(hit.term) && /^\s+(?:him|her|me|us|them|you)\s+a\s+message\b/i.test(after) && /离开/.test(hit.meaning))
        errors.push('leave someone a message must not be taught as depart')
      if (/^a lot$/i.test(hit.term) && /^\s+of\b/i.test(after))
        errors.push('a lot of is a quantity phrase, not noun phrase a lot')
      if (/^that$/i.test(hit.term) && /\b(?:said|say|says|knew|know|thought|think|sorry|glad|certain|aware)\s+$/i.test(before) &&
          /那个|那/.test(hit.meaning))
        errors.push('complementizer that is not a demonstrative')
      if (/^(?:make|leave|take)$/i.test(hit.term) &&
          new RegExp('^\\s+' + ({make:'a phone call',leave:'a message',take:'a dump'}[hit.term.toLowerCase()] || '$^'), 'i').test(after))
        errors.push('whole idiom must not be replaced with an unrelated literal verb sense')
    }
    if (language === 'en') {
      if (/^(?:have to|need to)$/i.test(hit.term) &&
          /\b(?:don't|doesn't|didn't|do not|does not|did not)\s+$/i.test(before))
        errors.push('negative necessity is not must or need')
      if (/^used$/i.test(hit.term) &&
          /\b(?:am|is|are|was|were|be|been|being|get|gets|got|getting)(?:n't)?\s+(?:not\s+)?$/i.test(before) &&
          /^\s+to\b/i.test(after))
        errors.push('be used to is not bare use')
      if (/^used to$/i.test(hit.term) &&
          /\b(?:am|is|are|was|were|be|been|being|get|gets|got|getting)(?:n't)?\s+(?:not\s+)?$/i.test(before))
        errors.push('passive or accustomed used to is not past habitual')
      if (/^(?:I|you|we|they|he|she|it|this|that|there)\s+(?:have|has|had)$/i.test(hit.term) &&
          /^\s+to\b/i.test(after))
        errors.push('generic subject have must not conceal deontic have to')
      if (/^who(?:\s+|$)/i.test(hit.term) && before.trim() && !/[.?!]\s*$/.test(before) &&
          /疑问/.test(hit.meaning)) errors.push('relative who is not interrogative')
    }
    if (hit.type === 'grammar' && language === 'en') {
      if (/^have to$/i.test(hit.term) && /\bwhat(?:'ll| will) you\s*$/i.test(before) &&
          /^\s*(?:drink|eat)\b/i.test(after))
        errors.push('ambiguous have to drink/eat must not be forced to obligation')
      if (/^need to$/i.test(hit.term) && /\b(?:the|a)\s+$/i.test(before))
        errors.push('nominal need to is not verbal need to')
      if (/^used to$/i.test(hit.term) &&
          /\b(?:am|is|are|was|were|be|been|being|get|gets|got|getting)(?:n't)?\s+(?:not\s+)?$/i.test(before))
        errors.push('passive or accustomed used to is not past habitual')
    }
    sorted.push(hit)
  }
  sorted.sort((a,b) => a.start - b.start)
  if (sorted.some((hit,i) => i > 0 && hit.start < sorted[i-1].end)) errors.push('overlapping highlights')
  if (!hits.some(x => x?.type === 'grammar') || !hits.some(x => x?.type === 'vocabulary')) errors.push('missing grammar/vocabulary pair')
  // Verifiable source text does not guarantee a semantically faithful community
  // translation. Flag concrete mismatches for review rather than altering a
  // Tatoeba Chinese contributor's text or implying a certified correction.
  const suspectTranslations = {
    '4907': '凡人 here means ordinary person, not necessarily 正常人',
    '211894': '会議 means a meeting; the linked Chinese says 委員會',
    '236366': 'こちらからお電話: who calls whom differs from Chinese',
    '4844477': "isn't going to work means plan will not work, not cannot begin a job",
    '7844518': 'very tired and 很睏 are not interchangeable in every context',
  }
  const sid=/^https:\/\/tatoeba\.org\/en\/sentences\/show\/(\d+)$/.exec(card?.source_url||'')?.[1]
  if(sid && suspectTranslations[sid]) warnings.push('potential community translation mismatch: '+suspectTranslations[sid])
  if (language === 'ja') {
    if (/(?:そいつ|分からない|食べるの|読むの|するの|から|のが|のは|だけ|しか)/.test(card?.term || '')) {
      warnings.push('Japanese token boundary / particle sense needs contextual review')
    }
  } else if (/\b(?:used to|would like to|have to|need to|there is|there are|would you|could you)\b/i.test(card?.term || '')) {
    warnings.push('English auxiliary / phrase sense needs contextual review')
  }
  return { errors, warnings, highlights: hits.length }
}

export function auditWord(word, language) {
  const errors = [], missing = []
  if (word?.language !== language || !nonempty(word?.id) || !nonempty(word?.term) || !nonempty(word?.meaning_zh)) errors.push('invalid word identity / gloss')
  if (!['licensed','generated'].includes(word?.source_type)) errors.push('missing provenance class')
  if (!nonempty(word?.reading)) missing.push('reading')
  if (!nonempty(word?.example)) missing.push('source example')
  if (nonempty(word?.example) && !nonempty(word?.example_meaning_zh)) missing.push('example translation')
  if (!nonempty(word?.example) || !nonempty(word?.example_meaning_zh)) missing.push('bilingual example')
  // These generated static seed cards have no dedicated verified POS/IPA/pitch field.
  // The live dictionary may obtain such fields from an attributed provider; do
  // not fabricate them during auditing or count unavailable fields as errors.
  if (word?.example_review_status) {
    if (word.example_review_status !== 'source-linked-unreviewed-sense' ||
        word.example_provenance !== 'tatoeba-direct-chinese-link' ||
        !/^https:\/\/tatoeba\.org\/en\/sentences\/show\/\d+$/.test(word.example_source_url || '') ||
        !nonempty(word.example) || !nonempty(word.example_meaning_zh))
      errors.push('invalid or misleading source-linked example provenance')
    if (word?.source_type !== 'licensed') errors.push('nonlicensed headword marked as source-linked')
  }
  if (word?.source_type === 'generated' && (!nonempty(word?.explanation) || !nonempty(word?.example))) {
    errors.push('original reviewed word missing explanation or example')
  }
  return { errors, missing }
}

export function auditGrammarLesson(lesson, language) {
  const errors = []
  if (!lesson || !String(lesson.id || '').startsWith(language+'-')) errors.push('grammar lesson ID/language mismatch')
  for (const name of ['point','zh','ja','form','example','translation','tipZh','tipJa']) {
    if (!nonempty(lesson?.[name])) errors.push('missing grammar field: '+name)
  }
  if (!Array.isArray(lesson?.questions) || lesson.questions.length !== 2) errors.push('unexpected question count')
  for (const [i, q] of (lesson?.questions || []).entries()) {
    if (typeof q?.prompt !== 'string' || q.prompt.split('___').length !== 2) errors.push('invalid fill-in-the-blank '+i)
    if (!Array.isArray(q?.options) || q.options.length !== 4 ||
        new Set(q.options.map(normalized)).size !== 4 || !q.options.every(nonempty)) errors.push('invalid answer options '+i)
    if (!Number.isInteger(q?.correct) || q.correct < 0 || q.correct >= 4) errors.push('invalid answer index '+i)
    if (!nonempty(q?.whyZh) || !nonempty(q?.whyJa)) errors.push('missing bilingual answer reasoning '+i)
  }
  return {errors}
}

export function inspectCorpus(sentencesByLanguage, wordsByLanguage, grammarByLanguage) {
  const errors=[], reviewCandidates=[], wordReviewCandidates=[], missingWordCandidates=[], stats={ sentences:{}, words:{}, grammar:{} }
  const fail=(scope, id, issue) => { errors.push({scope,id,issue}) }
  for (const language of LANGUAGES) {
    const sentences=sentencesByLanguage[language] || []
    const words=wordsByLanguage[language] || []
    const grammar=grammarByLanguage[language] || []
    const ids=new Set(), terms=new Set()
    let annotations=0
    for (const item of sentences) {
      const key=item?.id
      if (ids.has(key)) fail(language+' sentence',key,'duplicate ID')
      ids.add(key)
      const found=auditSentence(item,language)
      annotations+=found.highlights
      found.errors.forEach(error=>fail(language+' sentence',key,error))
      if (found.warnings.length) reviewCandidates.push({
        id:key,language,category:item.category,term:String(item.term || '').slice(0,150),
        meaning_zh:String(item.meaning_zh || '').slice(0,260),
        source_url:item.source_url,reasons:found.warnings,
        // The exact marked phrase and its proposed sense must be visible to
        // reviewers; source URL alone cannot diagnose a misleading gloss.
        highlights:(()=>{try{
          const parsed=JSON.parse(item.highlight_json || '[]')
          return Array.isArray(parsed) ? parsed.slice(0,8).filter(x=>x&&typeof x==='object').map(hit=>({
            term:hit.term,type:hit.type,meaning:hit.meaning,explanation:hit.explanation,
            start:hit.start,end:hit.end,
          })) : []
        }catch{return []}})(),
        review_status:'awaiting-linguistic-review',
      })
    }
    if (sentences.length!==5000) fail(language+' sentence','corpus','expected 5,000 source-backed cards')
    const missing={reading:0,sourceExample:0,exampleTranslation:0,bilingualExample:0}
    let linkedExamplesAwaitingSenseReview=0
    for(const word of words) {
      const key=normalized(word?.term)
      if (terms.has(key)) fail(language+' word',word?.id,'duplicate headword')
      terms.add(key)
      const found=auditWord(word,language)
      if(word?.example_review_status === 'source-linked-unreviewed-sense') {
        linkedExamplesAwaitingSenseReview++
        wordReviewCandidates.push({
          id:word.id,language,term:word.term,meaning_zh:String(word.meaning_zh || '').slice(0,160),
          example:String(word.example || '').slice(0,160),
          example_meaning_zh:String(word.example_meaning_zh || '').slice(0,160),
          example_source_url:word.example_source_url,
          review_status:'unreviewed-word-sense',
        })
      }
      if(found.missing.includes('bilingual example') || found.missing.includes('reading')) {
        missingWordCandidates.push({
          id:word.id,language,term:word.term,
          missing:found.missing.filter(x=>['bilingual example','reading'].includes(x)),
        })
      }
      found.errors.forEach(error=>fail(language+' word',word?.id,error))
      if(found.missing.includes('reading'))missing.reading++
      if(found.missing.includes('source example'))missing.sourceExample++
      if(found.missing.includes('example translation'))missing.exampleTranslation++
      if(found.missing.includes('bilingual example'))missing.bilingualExample++
    }
    if (words.length!==3010) fail(language+' word','corpus','expected 3,010 public learner terms')
    const lessonIds=new Set()
    let questions=0
    for(const lesson of grammar){
      if(lessonIds.has(lesson?.id))fail(language+' grammar',lesson?.id,'duplicate grammar topic')
      lessonIds.add(lesson?.id)
      questions+=(lesson?.questions||[]).length
      auditGrammarLesson(lesson,language).errors.forEach(err=>fail(language+' grammar',lesson?.id,err))
    }
    if(grammar.length!==12)fail(language+' grammar','curriculum','expected 12 topics')
    stats.sentences[language]={count:sentences.length,highlights:annotations}
    stats.words[language]={count:words.length,missingReading:missing.reading,
      missingSourceExample:missing.sourceExample,missingExampleTranslation:missing.exampleTranslation,
      missingBilingualExample:missing.bilingualExample,
      linkedExamplesAwaitingSenseReview,
      note:'Linked Tatoeba sentences prove source/translation pairing, not word-sense correctness. No missing phonetics are invented.'}
    stats.grammar[language]={topics:grammar.length,questions}
  }
  const reviewQueue=[]
  // Stable, balanced samples across language and scene category; not a claim
  // that the other sentences have been semantically verified.
  for(const language of LANGUAGES)for(const category of CATEGORIES){
    const group=reviewCandidates.filter(x=>x.language===language&&x.category===category)
      .sort((a,b)=>String(a.id).localeCompare(String(b.id)))
    reviewQueue.push(...group.slice(0,30))
  }
  const wordReviewQueue=[]
  const missingWordQueue=[]
  for(const language of LANGUAGES) {
    wordReviewQueue.push(...wordReviewCandidates.filter(x=>x.language===language)
      .sort((a,b)=>String(a.term).localeCompare(String(b.term))).slice(0,60))
    missingWordQueue.push(...missingWordCandidates.filter(x=>x.language===language)
      .sort((a,b)=>String(a.term).localeCompare(String(b.term))).slice(0,60))
  }
  return {ok:errors.length===0,errors:errors.slice(0,60),errorCount:errors.length,stats,
    reviewCandidateCount:reviewCandidates.length,reviewQueue,
    linkedWordReviewCandidateCount:wordReviewCandidates.length,wordReviewQueue,
    // Full public-only candidate inventory for offline semantic triage. Unlike
    // personal saved vocabulary, these are immutable published corpus rows.
    // Do not label them verified: every candidate remains unreviewed.
    allWordReviewCandidates:wordReviewCandidates,
    allMissingWordCandidates:missingWordCandidates,
    missingWordCandidateCount:missingWordCandidates.length,missingWordQueue,limitations:[
      'Structural checks and regex examples do not establish semantic correctness.',
      'Tatoeba Chinese translations may be contextually loose or ambiguous.',
      'Metadata absent from static word seeds is not invented.',
      'Human review is required for nuanced grammar, polysemy and phonetic claims.',
    ]}
}

async function readFingerprintAsset(dir,lang) {
  const manifest=JSON.parse(await readFile(resolve(ROOT,'public',dir,'manifest.json'),'utf8'))
  const path=manifest[lang]
  const match=new RegExp('^/'+dir+'/'+lang+'\\.([0-9a-f]{16})\\.json$').exec(path || '')
  if (manifest.version!==1 || !match) throw Error(dir+': invalid '+lang+' manifest')
  const raw=await readFile(resolve(ROOT,'public',dir,path.split('/').at(-1)),'utf8')
  const actual=createHash('sha256').update(raw.trimEnd()).digest('hex').slice(0,16)
  if(actual!==match[1])throw Error(dir+': fingerprint mismatch '+lang)
  const payload=JSON.parse(raw)
  if(!Array.isArray(payload.items))throw Error(dir+': invalid '+lang+' items')
  return payload.items
}

async function main() {
  const sentences={},words={},grammar={}
  const source=await readFile(resolve(ROOT,'src/daily-grammar-lessons.ts'),'utf8')
  const transpiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  const curriculum=await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'))
  for(const language of LANGUAGES){
    sentences[language]=await readFingerprintAsset('language-cards',language)
    words[language]=await readFingerprintAsset('learner-lexicon',language)
    grammar[language]=Array.from({length:12},(_,i)=>curriculum.dailyGrammarLesson('2026-11-'+String(i+1).padStart(2,'0'),language))
  }
  const result=inspectCorpus(sentences,words,grammar)
  const out=resolve(ROOT,'quality-reports/language-quality.json')
  await mkdir(resolve(ROOT,'quality-reports'),{recursive:true})
  await writeFile(out,JSON.stringify(result,null,2)+'\n','utf8')
  // Human-friendly worksheet; every row is source-backed and explicitly
  // UNVERIFIED, not silently counted as a linguistically approved sentence.
  const columnNames=['id','language','category','sentence','chinese_translation','source_url',
    'proposed_highlights_json','review_status','reviewer','reviewed_at','review_notes']
  const csv=(value)=>'"'+String(value ?? '').replace(/"/g,'""')+'"'
  const lines=[columnNames.map(csv).join(',')]
  for(const row of result.reviewQueue) lines.push([
    row.id,row.language,row.category,row.term,row.meaning_zh,row.source_url,
    JSON.stringify(row.highlights),'待人工逐条核验','','','',
  ].map(csv).join(','))
  await writeFile(resolve(ROOT,'quality-reports/language-semantic-first-120.csv'),
    lines.join('\n')+'\n','utf8')
  console.log(JSON.stringify({ok:result.ok,errorCount:result.errorCount,stats:result.stats,
    reviewCandidates:result.reviewCandidateCount,reviewQueue:result.reviewQueue.length,
    linkedWordReviewCandidates:result.linkedWordReviewCandidateCount,
    missingWordCandidates:result.missingWordCandidateCount,report:out},null,2))
  for(const err of result.errors)console.error('QUALITY FAIL',err.scope,err.id,err.issue)
  if(!result.ok)process.exitCode=1
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{console.error('Language quality audit failed:',error);process.exitCode=1})
}
