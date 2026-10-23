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
 def walk(v):
  if isinstance(v,str):
   try: parsed=json.loads(v)
   except Exception: parsed=None
   if parsed is not None and isinstance(parsed,(dict,list,str)):
    walk(parsed)
   elif re.search(r"[\u3400-\u9fff]",v):out.append(norm(v))
  elif isinstance(v,dict):
   for k,z in v.items():
    if k.lower() not in {"notes","note","source","license","licence"}:walk(z)
  elif isinstance(v,(list,tuple)):
   for z in v:walk(z)
 walk(x);return list(dict.fromkeys(z for z in out if z))
def zhmap(db):
 c=sqlite3.connect(f"file:{db}?mode=ro",uri=True); tables={r[0] for r in c.execute("select name from sqlite_master where type='table'")}
 if "zh_defs" not in tables:raise RuntimeError("Tomoshi DB has no zh_defs: "+str(sorted(tables)[:50]))
 cols=[r[1] for r in c.execute("pragma table_info(zh_defs)")]
 key=next((x for x in ["entry_id","jmdict_id","id_entry","word_id"] if x in cols),None)
 dat=next((x for x in ["data","glosses","definition","text","content","json"] if x in cols),None)
 if not key or not dat:raise RuntimeError("Unexpected zh_defs schema "+str(cols))
 out={}
 for i,d in c.execute(f'SELECT "{key}","{dat}" FROM zh_defs'):
  vals=zhstrings(d)
  if vals:out.setdefault(str(i),[]).extend(vals)
 c.close();return {k:list(dict.fromkeys(v)) for k,v in out.items()}
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
  t=tag.lower()
  cat="Oxford 3000 核心词汇" if ox==1 else "大学英语四级" if "cet4" in t or "四级" in tag else "大学英语六级" if "cet6" in t or "六级" in tag else "雅思词汇" if "ielts" in t or "雅思" in tag else "托福词汇" if "toefl" in t or "托福" in tag else "高频词汇"
  cards.append(dict(id="en-ecdict-"+hashlib.sha1(k.encode()).hexdigest()[:16],language="en",category=cat,term=w,reading=phon,meaning_zh=z,explanation=definition[:1000],example="",example_meaning_zh="",source_type="licensed"));seen.add(k)
  if len(cards)==3000:break
 return cards,translations
def japanese_data(zmap,trans):
 cards=[];seen=set()
 for level in ("n5","n4","n3","n2","n1"):
  p=dl(f"https://raw.githubusercontent.com/evanclan/OpenJLPT/{OJ}/data/json/vocab/{level}.json",CACHE/f"openjlpt-{level}.json")
  for item in json.loads(p.read_text(encoding="utf-8")):
   w,reading=norm(item.get("word")),norm(item.get("reading"))
   if not w or not reading or w in seen:continue
   gloss=zmap.get(str(item.get("jmdict_id") or ""),[])
   if not gloss:
    for g in item.get("meanings",[]):
     gloss.extend(trans[t] for t in re.findall(r"[A-Za-z][A-Za-z'-]*",str(g).lower()) if t in trans)
   gloss=list(dict.fromkeys(norm(x) for x in gloss if norm(x)))
   if not gloss:continue
   ex=item.get("examples") or []
   cards.append(dict(id="ja-openjlpt-"+str(item.get("id") or hashlib.sha1(w.encode()).hexdigest()[:12]),language="ja",category="JLPT "+str(item.get("level") or level).upper(),term=w,reading=reading,meaning_zh="；".join(gloss[:3]),explanation="JLPT 社区参考等级，并非官方公布词表。",example=norm(ex[0].get("ja")) if ex else "",example_meaning_zh="",source_type="licensed"));seen.add(w)
   if len(cards)==3000:return cards
 return cards
def write(cards):
 for lang in ("ja","en"):
  group=[x for x in cards if x["language"]==lang]
  if len(group)!=3000:raise RuntimeError(f"Need 3000 {lang} cards, got {len(group)}")
  if len({x["term"].casefold() for x in group})!=3000:raise RuntimeError(f"Duplicate {lang} headwords")
 if len({x["id"] for x in cards})!=6000:raise RuntimeError("Duplicate card IDs")
 cols=["id","language","category","term","reading","meaning_zh","explanation","example","example_meaning_zh","source_type"]
 lines=["-- Generated from pinned, attributed open datasets; do not hand-edit.","-- OpenJLPT + Tomoshi dictionary/JMdict: CC BY-SA 4.0; ECDICT: MIT.","-- See docs/language-learning-data-sources.md for attribution and modifications."]
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
