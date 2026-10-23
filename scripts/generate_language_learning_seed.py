#!/usr/bin/env python3
import csv, hashlib, json, re, sqlite3, urllib.request
from pathlib import Path
import zstandard

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/"migrations/0079_language_learning_6000_cards.sql"
CACHE=Path("/tmp/language-learning-sources"); CACHE.mkdir(exist_ok=True)
OJ="0d1d3410bec90bd4098a7c72de820543cb4f707c"; EC="bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b"
TZ="https://github.com/tomoshi-app/tomoshi-dict-data/releases/download/v2026-10-13/tomoshi-dict-open.db.zst"
TSHA="51581856d3e563b32b05738efd67c38ed9946c013555fd3c0870e24d194c2048"
def dl(url,p):
 if p.exists() and p.stat().st_size:return p
 req=urllib.request.Request(url,headers={"User-Agent":"it-study-platform-language-seed/1.0"})
 with urllib.request.urlopen(req,timeout=240) as r,p.open("wb") as w:
  while True:
   b=r.read(1024*1024)
   if not b:break
   w.write(b)
 return p
def norm(x):return re.sub(r"\s+"," ",str(x or "")).strip()
def q(x):return "'"+str(x or "").replace("\x00","").replace("'","''")+"'"
def zhstrings(x):
 out=[]
 def walk(v, gloss_context=False):
  if isinstance(v,str):
   try: parsed=json.loads(v)
   except Exception: parsed=None
   if parsed is not None and isinstance(parsed,(dict,list,str)):
    walk(parsed,gloss_context)
   elif re.search(r"[\\u3400-\\u9fff]",v):
    out.append(norm(v))
  elif isinstance(v,dict):
   for k,z in v.items():
    key=k.lower()
    if key in {"examples","example","notes","note","source","license","licence"}: continue
    if key in {"glosses","gloss","meaning","meanings"}: walk(z,True)
    else: walk(z,gloss_context)
  elif isinstance(v,(list,tuple)):
   for z in v: walk(z,gloss_context)
 walk(x)
 return list(dict.fromkeys(z for z in out if z))
def zhmap(db):
 c=sqlite3.connect(f"file:{db}?mode=ro",uri=True)
 tables={r[0] for r in c.execute("select name from sqlite_master where type='table'")}
 if "zh_defs" not in tables:raise RuntimeError("Tomoshi DB has no zh_defs: "+str(sorted(tables)[:50]))
 aliases={};forms_by_key={}
 def add_forms(key, values):
  if key is None:return
  bucket=forms_by_key.setdefault(str(key),set())
  for value in values:
   if isinstance(value,str) and re.search(r"[\u3040-\u30ff\u3400-\u9fff]",value):bucket.add(value)
 def extract_forms(obj):
  values=[]
  if isinstance(obj,dict):
   for k,v in obj.items():
    key=k.lower()
    if key in {"kanji","kana","forms","readings","written_forms","k_ele","r_ele","written","reading","word","headword","text","form"}:
     if isinstance(v,str):values.append(v)
     elif isinstance(v,list):
      for item in v:
       if isinstance(item,str):values.append(item)
       elif isinstance(item,dict):
        for fkey in ("text","word","form","value","written","kana","reading"):
         if isinstance(item.get(fkey),str):values.append(item[fkey])
    elif isinstance(v,(dict,list)):values.extend(extract_forms(v))
  elif isinstance(obj,list):
   for item in obj:values.extend(extract_forms(item))
  return list(dict.fromkeys(values))
 if "entries" in tables:
  ecols=[r[1] for r in c.execute("pragma table_info(entries)")]
  def epick(candidates):return next((x for x in candidates if x in ecols),None)
  pk=epick(["id","entry_id","jmdict_id","ent_seq"])
  jidcol=epick(["jmdict_id","ent_seq"])
  jsoncol=epick(["data","entry_json","json","content","entry"])
  print("Tomoshi entries columns:",ecols,"selected:",pk,jidcol,jsoncol)
  if pk and (jidcol or jsoncol):
   select_cols=[pk]+([jidcol] if jidcol else [])+([jsoncol] if jsoncol and jsoncol!=jidcol else [])
   for row in c.execute("SELECT "+", ".join('"'+x+'"' for x in select_cols)+" FROM entries"):
    key=row[0]; pos=1; jid=row[pos] if jidcol else None; pos+=1 if jidcol else 0
    raw=row[pos] if jsoncol and jsoncol!=jidcol else None
    obj={}
    if raw:
     try:obj=json.loads(raw) if isinstance(raw,str) else raw
     except Exception:obj={}
    if jid is None and isinstance(obj,dict):jid=obj.get("jmdict_id") or obj.get("ent_seq") or obj.get("seq") or obj.get("id")
    if jid is not None:aliases[str(key)]=str(jid);aliases[str(jid)]=str(jid)
    values=extract_forms(obj)
    add_forms(key,values)
    if jid is not None:add_forms(jid,values)
 if "forms" in tables:
  fcols=[r[1] for r in c.execute("pragma table_info(forms)")]
  def fpick(candidates):return next((x for x in candidates if x in fcols),None)
  entrycol=fpick(["entry_id","word_id","id_entry","entry","jmdict_id","ent_seq"])
  formcol=fpick(["text","form","headword","word","value","surface","written","kana","reading"])
  print("Tomoshi forms columns:",fcols,"selected:",entrycol,formcol)
  if entrycol and formcol:
   for eid,form in c.execute(f'SELECT "{entrycol}","{formcol}" FROM forms'):
    if isinstance(form,str) and form:
     add_forms(eid,[form]);canonical=aliases.get(str(eid))
     if canonical:add_forms(canonical,[form])
 cols=[r[1] for r in c.execute("pragma table_info(zh_defs)")]
 key=next((x for x in ["jmdict_id","ent_seq","entry_id","id_entry","word_id"] if x in cols),None)
 dat=next((x for x in ["data","glosses","definition","text","content","json"] if x in cols),None)
 print("Tomoshi zh_defs columns:",cols,"selected:",key,dat)
 if not key or not dat:raise RuntimeError("Unexpected zh_defs schema "+str(cols))
 out={}
 for i,d in c.execute(f'SELECT "{key}","{dat}" FROM zh_defs'):
  canonical=aliases.get(str(i),str(i));vals=zhstrings(d)
  if not vals:continue
  out.setdefault(canonical,[]).extend(vals)
  for form in forms_by_key.get(str(i),set()) | forms_by_key.get(canonical,set()):
   out.setdefault(form,[]).extend(vals)
 for term in ("会う","あう","青","あお"):
  form_rows=c.execute("SELECT entry_id,is_kana FROM forms WHERE text=? LIMIT 5",(term,)).fetchall()
  ids=[str(row[0]) for row in form_rows]
  gloss_rows=[]
  if ids:
   marks=",".join("?" for _ in ids)
   gloss_rows=c.execute(f"SELECT entry_id,locale,substr(data,1,180) FROM zh_defs WHERE entry_id IN ({marks}) LIMIT 5",ids).fetchall()
  print("Tomoshi term lookup",term,"forms",form_rows,"zh_defs",gloss_rows,"mapped",term in out)
 print("Tomoshi gloss key sample:",list(out.keys())[:3],"JMdict ID 1198180:", "1198180" in out,"headword 会う:", "会う" in out,"reading あう:", "あう" in out,"headword 青:", "青" in out,"reading あお:", "あお" in out)
 c.close()
 return {k:list(dict.fromkeys(v)) for k,v in out.items()}
def english_data(p):
 rows=[]; translations={}
 with p.open(encoding="utf-8-sig",newline="") as f:
  for r in csv.DictReader(f):
   w,z=norm(r.get("word")),norm(r.get("translation"))
   if not w or not z:continue
   translations.setdefault(w.lower(),z.splitlines()[0][:160])
   if not re.fullmatch(r"[A-Za-z][A-Za-z '-]{0,30}",w) or len(w)>28:continue
   try:frq=int(r.get("frq") or 0)
   except ValueError:frq=0
   try:bnc=int(r.get("bnc") or 0)
   except ValueError:bnc=0
   try:ox=int(r.get("oxford") or 0)
   except ValueError:ox=0
   rows.append((w,z,norm(r.get("definition")),norm(r.get("phonetic")),norm(r.get("tag")),frq,bnc,ox))
 rows.sort(key=lambda x:(0 if x[7]==1 else 1,x[5] if x[5]>0 else 10**9,x[6] if x[6]>0 else 10**9,x[0].lower()))
 cards=[];seen=set()
 for w,z,definition,phon,tag,frq,bnc,ox in rows:
  k=w.casefold()
  if k in seen:continue
  rank=len(cards)+1
  cat="英语核心词汇（1–1000）" if rank<=1000 else "英语进阶词汇（1001–2000）" if rank<=2000 else "英语扩展词汇（2001–3000）"
  cards.append(dict(id="en-ecdict-"+hashlib.sha1(k.encode()).hexdigest()[:16],language="en",category=cat,term=w,reading=phon,meaning_zh=z,explanation=definition[:1000],example="",example_meaning_zh="",example_source_url="",source_type="licensed"));seen.add(k)
  if len(cards)==3000:break
 return cards,translations
def japanese_data(zmap,trans):
 cards=[];seen=set()
 for level in ("n5","n4","n3","n2","n1"):
  p=dl(f"https://raw.githubusercontent.com/evanclan/OpenJLPT/{OJ}/data/json/vocab/{level}.json",CACHE/f"openjlpt-{level}.json")
  for item in json.loads(p.read_text(encoding="utf-8")):
   w,reading=norm(item.get("word")),norm(item.get("reading"))
   if not w or not reading or w in seen:continue
   gloss=zmap.get(str(item.get("jmdict_id") or ""),[]) or zmap.get(w,[]) or zmap.get(reading,[])
   if not gloss:
    stopwords={"a","an","the","to","be","is","are","was","were","of","for","in","on","at","by","with","and","or","not","as","from","into","than","that","this","it","its"}
    for g in item.get("meanings",[]):
     tokens=[t for t in re.findall(r"[A-Za-z][A-Za-z'-]*",str(g).lower()) if t not in stopwords]
     mapped=[trans[t] for t in tokens if t in trans]
     if mapped:
      gloss.extend(mapped[:2])
      break
   gloss=list(dict.fromkeys(norm(x) for x in gloss if norm(x)))
   if not gloss:continue
   ex=item.get("examples") or []
   cards.append(dict(id="ja-openjlpt-"+str(item.get("id") or hashlib.sha1(w.encode()).hexdigest()[:12]),language="ja",category="JLPT "+str(item.get("level") or level).upper(),term=w,reading=reading,meaning_zh="；".join(gloss[:3]),explanation="JLPT 社区参考等级，并非官方公布词表。",example=norm(ex[0].get("ja")) if ex and ex[0].get("tatoeba_id") else "",example_meaning_zh="",example_source_url=("https://tatoeba.org/sentences/show/"+str(ex[0].get("tatoeba_id"))) if ex and ex[0].get("tatoeba_id") else "",source_type="licensed"));seen.add(w)
   if len(cards)==3000:return cards
 return cards
def write(cards):
 for lang in ("ja","en"):
  group=[x for x in cards if x["language"]==lang]
  if len(group)!=3000:raise RuntimeError(f"Need 3000 {lang} cards, got {len(group)}")
  if len({x["term"].casefold() for x in group})!=3000:raise RuntimeError(f"Duplicate {lang} headwords")
 if len({x["id"] for x in cards})!=6000:raise RuntimeError("Duplicate card IDs")
 cols=["id","language","category","term","reading","meaning_zh","explanation","example","example_meaning_zh","example_source_url","source_type"]
 lines=["-- Generated from pinned, attributed open datasets; do not hand-edit.","-- OpenJLPT + Tomoshi dictionary/JMdict: CC BY-SA 4.0; Tatoeba examples: CC BY 2.0 FR; ECDICT: MIT.","-- See docs/language-learning-data-sources.md for attribution and modifications.","ALTER TABLE language_cards ADD COLUMN example_source_url TEXT NOT NULL DEFAULT '';"]
 for start in range(0,6000,100):
  lines += ["INSERT OR IGNORE INTO language_cards","("+", ".join(cols)+")","VALUES"]
  lines.append("  "+",\n  ".join("("+", ".join(q(x[k]) for k in cols)+")" for x in cards[start:start+100])+";")
 OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
 print("Generated exactly 3,000 Japanese + 3,000 English cards.")
def main():
 zst=dl(TZ,CACHE/"tomoshi-dict-open.db.zst")
 if hashlib.sha256(zst.read_bytes()).hexdigest()!=TSHA:raise RuntimeError("Tomoshi SHA-256 mismatch")
 db=CACHE/"tomoshi-dict-open.db"
 if not db.exists():
  with zst.open("rb") as s,db.open("wb") as d:zstandard.ZstdDecompressor().copy_stream(s,d)
 zmap=zhmap(db)
 ec=dl(f"https://raw.githubusercontent.com/skywind3000/ECDICT/{EC}/ecdict.csv",CACHE/"ecdict.csv")
 en,trans=english_data(ec);ja=japanese_data(zmap,trans)
 if len(ja)!=3000:raise RuntimeError(f"Only {len(ja)} Japanese entries have reliable Chinese glosses; refusing placeholders.")
 if len(en)!=3000:raise RuntimeError(f"Only {len(en)} English entries have Chinese translations.")
 write(ja+en)
if __name__=="__main__":main()
