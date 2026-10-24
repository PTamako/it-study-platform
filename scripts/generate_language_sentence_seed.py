#!/usr/bin/env python3
"""Generate 6,000 attributed sentence cards from Tatoeba's public exports."""
import csv, hashlib, io, json, re, tarfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "migrations/0081_language_sentence_cards.sql"
OUT_REFRESH = ROOT / "migrations/0082_refresh_language_sentence_annotations.sql"
OUT_REFRESH_LATEST = ROOT / "migrations/0083_refresh_japanese_meaningful_annotations.sql"
CACHE = Path("/tmp/language-sentence-sources")
CACHE.mkdir(exist_ok=True)
SENTENCES_URL = "https://downloads.tatoeba.org/exports/sentences.tar.bz2"
LINKS_URL = "https://downloads.tatoeba.org/exports/links.tar.bz2"

def download(url, path):
    if path.exists() and path.stat().st_size:
        return path
    req = urllib.request.Request(url, headers={"User-Agent": "it-study-platform-language-seed/1.0"})
    with urllib.request.urlopen(req, timeout=300) as response, path.open("wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk: break
            out.write(chunk)
    return path

def norm(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()

def sql(value):
    return "'" + str(value or "").replace("\x00", "").replace("'", "''") + "'"

def rows_in_tar(path, suffix):
    archive = tarfile.open(path, "r:bz2")
    member = next((item for item in archive.getmembers() if item.name.endswith(suffix)), None)
    if member is None:
        archive.close()
        raise RuntimeError("Tatoeba export is missing " + suffix)
    raw = archive.extractfile(member)
    if raw is None:
        archive.close()
        raise RuntimeError("Could not read Tatoeba export " + suffix)
    return archive, csv.reader(io.TextIOWrapper(raw, encoding="utf-8", newline=""), delimiter="\t")

JP_WORK = re.compile(r"会社|仕事|職場|会議|打ち合わせ|報告|資料|確認|連絡|お客様|メール|電話|納期|依頼|申請|提出|対応|営業|面接|プロジェクト|システム|契約|請求|休暇|残業|出勤|退勤|上司|同僚|担当|共有|相談|予定|予約|変更|説明|承認|見積|部署|勤務")
EN_WORK = re.compile(r"\b(company|work|office|meeting|report|document|confirm|contact|client|customer|email|phone|deadline|request|application|submit|support|sales|interview|project|system|contract|invoice|leave|overtime|manager|colleague|team|share|discuss|schedule|appointment|change|explain|approve|estimate|department|presentation|coworker)\b", re.I)
JP_VOCAB = [
 ("旅行","旅行、旅游","表示外出旅行；在「旅行が楽しみです」中，是令人期待的事情"),
 ("よろしくお願いします","麻烦你了／请多关照","用于请求、协作或初次见面后的礼貌表达"),
 ("ありがとうございます","非常感谢","礼貌感谢"), ("すみません","不好意思／对不起","可用于道歉、搭话或轻度致谢"),
 ("お願いします","拜托了／请","礼貌提出请求"), ("確認","确认","职场常见词，可说「確認します」"),
 ("連絡","联系","常见表达「ご連絡します」"), ("相談","商量／咨询","「相談する」表示与他人商量"),
 ("資料","资料","工作中常指文件或会议材料"), ("会議","会议","常见搭配「会議に参加する」"),
 ("予定","安排／计划","常见搭配「予定があります」"), ("大丈夫","没关系／没问题","根据语境表达许可或状态良好"),
 ("必要","必要","常见句型「〜が必要です」"), ("可能","可能","常见句型「〜が可能です」"),
 ("変更","变更","常见搭配「予定を変更する」"), ("対応","处理／应对","职场常用「対応します」"),
 ("明日","明天","时间表达"), ("今日","今天","时间表达"), ("時間","时间","常见搭配「時間があります」"),
 ("仕事","工作","可指工作内容或职业"), ("会社","公司","职场与商务常用词"), ("ください","请","接在动词て形后构成礼貌请求"),
 ("思います","我认为","表达个人判断或意见"), ("できます","能／可以","表示能力或可行性"),
 ("行きます","去","礼貌体动词"), ("します","做","する的礼貌体"), 
]
EN_VOCAB = [
 ("could you","能否请你","礼貌请求，比 can you 更委婉"), ("would you","你愿意／能否","常用于礼貌请求"),
 ("thank you","谢谢","常见感谢表达"), ("please","请","礼貌请求标记"), ("confirm","确认","常见搭配 confirm the details"),
 ("schedule","日程／安排","名词或动词，常用于工作安排"), ("meeting","会议","常见搭配 attend a meeting"),
 ("report","报告／汇报","可作名词或动词"), ("document","文件／资料","职场常见名词"),
 ("available","有空的／可用的","询问时间时常用"), ("deadline","截止期限","职场项目管理常用词"),
 ("request","请求／申请","可作名词或动词"), ("update","更新／最新情况","常见搭配 send an update"),
 ("discuss","讨论","常见搭配 discuss the plan"), ("prepare","准备","常见搭配 prepare a report"),
 ("follow up","跟进","职场常用短语动词"), ("let me know","请告诉我","礼貌请求对方提供信息"),
 ("I think","我认为","表达观点"), ("I would like to","我想／我希望","较礼貌的意愿表达"),
 ("have to","必须","表示义务或必要性"), ("need to","需要","表示需要做某事"), ("should","应该","表示建议或义务"),
 ("can","能／可以","表示能力、许可或可能性"), ("will","将会","常用于未来安排或承诺"),
 ("because","因为","引导原因"), ("although","虽然","引导让步关系"), ("if","如果","引导条件"),
 ("when","当……时","引导时间从句"), ("before","在……之前","表示时间先后"), ("after","在……之后","表示时间先后"),
]
JP_GRAMMAR = [
 (r"が楽しみです","N が楽しみです","「が」标记期待的事情；「楽しみです」表示对未来事情的期待，如「旅行が楽しみです」"),
    (r"なければなりません|なければならない","必须……","表达义务或必要性"),
 (r"てもいいですか|てもいいです","可以……吗／可以……","表示许可；疑问形式用于征求许可"),
 (r"てください","请……","动词て形＋ください，用于礼貌请求"),
 (r"ていただけますか","能否请您……","更礼貌的请求表达"), (r"と思います","我认为……","用于表达个人意见或判断"),
 (r"ので","因为……","较柔和地说明原因"), (r"けれども|けれど|けど","但是／虽然","用于转折，也可缓和语气"),
 (r"ながら","一边……一边……","连接同一主体同时进行的动作"),
 (r"たことがあります","曾经……过","表示过去的经历"), (r"たいです","想要……","表达愿望"),
 (r"ています","正在……／持续……","表示动作进行或状态持续"), (r"ことができます","能够……","表示能力或可能性"),
 (r"かもしれません","也许……","表达不确定的推测"), (r"ようにします","尽量做到……","表示有意识地努力形成习惯"),
 (r"てから","……之后","表示先完成前项再进行后项"), (r"までに","在……之前","表示截止时间"),
 (r"について","关于……","表示谈论的主题"), (r"ために","为了……","表示目的或原因，依上下文判断"),
 (r"んです|のです","说明／强调语气","用于解释背景或强调说明"),
]
EN_GRAMMAR = [
 (r"\bwould you\b","Would you…? 礼貌请求","用 would you + 动词原形提出礼貌请求"),
 (r"\bcould you\b","Could you…? 礼貌请求","用 could you + 动词原形提出礼貌请求"),
 (r"\bwould like to\b","would like to + 动词","较礼貌地表达意愿"), (r"\bhave to\b","have to + 动词","表示外部要求或必要性"),
 (r"\bneed to\b","need to + 动词","表示需要做某事"), (r"\bused to\b","used to + 动词","表示过去常有、现在不再持续的习惯或状态"),
 (r"\bhave been\b|\bhas been\b","现在完成相关结构","have/has been 后可接形容词、名词、现在分词或过去分词"),
 (r"\bwill\b","will + 动词原形","常用于预测、承诺或临时决定"), (r"\bshould\b","should + 动词原形","表达建议或合理预期"),
 (r"\bif\b","if 条件从句","引出条件，主句说明条件成立时的结果"),
 (r"\balthough\b|\beven though\b","让步从句","表示“虽然……但是……”"), (r"\bbecause\b","because 原因从句","说明原因"),
 (r"\bwhen\b","when 时间从句","说明某事发生的时间"), (r"\bbefore\b","before 时间从句","表示某事发生在另一件事之前"),
 (r"\bafter\b","after 时间从句","表示某事发生在另一件事之后"), (r"\bthere is\b|\bthere are\b","There is/are 存在句","说明某处存在某人或某物"),
 (r"\bnot only\b","not only… 递进结构","强调不止一种情况"), (r"\btoo\b","too 的常见用法","可表示“太……”或“也”，需看语境"),
]

def make_hits(sentence, lang):
    vocab = JP_VOCAB if lang == "ja" else EN_VOCAB
    grammar = JP_GRAMMAR if lang == "ja" else EN_GRAMMAR
    candidates = []
    for term, meaning, explanation in vocab:
        for match in re.finditer(re.escape(term), sentence, re.I if lang == "en" else 0):
            candidates.append({"start":match.start(),"end":match.end(),"type":"vocabulary","term":match.group(),"meaning":meaning,"explanation":explanation})
    for pattern, term, explanation in grammar:
        for match in re.finditer(pattern, sentence, re.I if lang == "en" else 0):
            candidates.append({"start":match.start(),"end":match.end(),"type":"grammar","term":match.group(),"meaning":term,"explanation":explanation})
    candidates.sort(key=lambda item:(item["start"],-(item["end"]-item["start"]),0 if item["type"]=="grammar" else 1))
    hits=[]
    for item in candidates:
        if any(item["start"] < old["end"] and item["end"] > old["start"] for old in hits): continue
        hits.append(item)
    if not any(item["type"]=="vocabulary" for item in hits):
        if lang == "ja":
            match = re.search(r"[\u3040-\u30ff\u3400-\u9fff]{2,5}", sentence)
        else:
            match = next((m for m in re.finditer(r"\b[A-Za-z]{3,}\b", sentence)
                          if m.group().lower() not in {"the","and","you","are","was","for","with","that","this","have","has","not"}), None)
        # Every card needs a real, exact source substring to highlight. Very short
        # or punctuation-heavy sentences may not contain a token matching the
        # language-specific heuristic, so fall back to the first non-whitespace
        # span rather than leaving the card without a vocabulary highlight.
        if match is None:
            match = re.search(r"\S+", sentence)
        if match:
            hits.append({"start":match.start(),"end":match.end(),"type":"vocabulary","term":match.group(),"meaning":"句中重点表达","explanation":"结合整句语境理解词义和用法。"})
            hits.sort(key=lambda item:item["start"])
    # Guarantee a visible grammar/structure highlight on every sentence card. Prefer
    # a recognizable sentence ending or predicate; if no pattern is recognized, use
    # an exact source substring and clearly label it as a study prompt, not a parse.
    if not any(item["type"] == "grammar" for item in hits):
        clean = re.sub(r"[。！？!?…]+$", "", sentence).rstrip()
        match = None
        if lang == "ja":
            match = re.search(r"(?:ていただけますか|てください|てから|なければなりません|なければならない|てもいいですか|てもいいです|と思います|かもしれません|ませんでした|ません|ました|でしょう|でした|ます|です|だった|ない|たいです|ています|ている|までに|について|ので|けど|かな|か|ね|よ)$", clean)
            if match is None:
                match = re.search(r"[ぁ-ゖァ-ヶ一-龯]{1,4}$", clean)
            meaning = "句尾活用／表达观察点"
            explanation = "自动规则未识别到明确语法模式；请结合整句观察句尾活用、助词与语气。这是学习提示，不是完整语法解析。"
        else:
            words = list(re.finditer(r"\b[A-Za-z][A-Za-z'-]*\b", clean))
            match = next((item for item in reversed(words)
                          if item.group().lower() not in {"a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "at", "for", "with"}), None)
            if match is None and words:
                match = words[-1]
            meaning = "句子结构观察点"
            explanation = "自动规则未识别到明确句型；请观察该词在句中的作用及其前后搭配。这是学习提示，不是完整语法解析。"
        if match is None:
            match = re.search(r"\S+", clean)
        if match:
            start, end = match.start(), match.end()
            if any(start < item["end"] and end > item["start"] for item in hits):
                alternatives = (list(re.finditer(r"[ぁ-ゖァ-ヶ一-龯]{1,4}", clean)) if lang == "ja"
                                else list(re.finditer(r"\b[A-Za-z][A-Za-z'-]*\b", clean)))
                match = next((item for item in reversed(alternatives)
                              if not any(item.start() < hit["end"] and item.end() > hit["start"] for hit in hits)), None)
            if match:
                hits.append({"start":match.start(),"end":match.end(),"type":"grammar","term":match.group(),
                             "meaning":meaning,"explanation":explanation})
                hits.sort(key=lambda item:(item["start"], -(item["end"]-item["start"]), 0 if item["type"]=="grammar" else 1))
    limited = hits[:8]
    # The UI must always be able to show at least one vocabulary and one grammar
    # highlight, even when a sentence matches many candidate expressions.
    for kind in ("vocabulary", "grammar"):
        if not any(item["type"] == kind for item in limited):
            candidate = next((item for item in hits if item["type"] == kind), None)
            if candidate:
                if len(limited) >= 8:
                    limited[-1] = candidate
                else:
                    limited.append(candidate)
    return sorted(limited, key=lambda item:(item["start"], -(item["end"]-item["start"]), 0 if item["type"]=="grammar" else 1))

def expansion(hits, kind, lang=None):
    output=[]; seen=set()
    for hit in hits:
        if hit["type"] != kind or hit["term"] in seen: continue
        seen.add(hit["term"])
        output.append({"term":hit["term"],"meaning":hit["meaning"],"explanation":hit["explanation"]})
        # Keep every displayed highlight explainable: make_hits caps sentence highlights at 8,
        # so expansion must not silently drop highlighted items after the fourth match.
        if len(output)>=8: break
    # Every card gets a useful structural prompt even when the heuristic matcher
    # cannot confidently identify a named grammar pattern in the sentence.
    if kind == "grammar" and not output:
        output.append({
            "term": "句型结构" if lang == "ja" else "Sentence structure",
            "meaning": "观察助词、活用和句尾表达" if lang == "ja" else "Observe word order, verb form, and sentence ending",
            "explanation": "结合整句找出主语、谓语、修饰关系及语气；这是学习提示，不是自动判定的唯一语法分析。" if lang == "ja" else "Identify the subject, verb, modifiers, and tone in context; this is a study prompt, not a definitive automatic parse."
        })
    return output

def main():
    sentence_archive=download(SENTENCES_URL,CACHE/"sentences.tar.bz2")
    links_archive=download(LINKS_URL,CACHE/"links.tar.bz2")
    sentences,chinese={},{}
    archive,rows=rows_in_tar(sentence_archive,"sentences.csv")
    try:
        for row in rows:
            if len(row)<3: continue
            sid,lang,sentence=row[0],row[1],norm(row[2])
            if lang == "jpn" and 6 <= len(sentence) <= 180: sentences[sid] = ("ja", sentence)
            elif lang == "eng" and 4 <= len(sentence) <= 180 and len(re.findall(r"\b[A-Za-z][A-Za-z'-]*\b", sentence)) >= 2: sentences[sid] = ("en", sentence)
            elif lang == "cmn" and 4 <= len(sentence) <= 180: chinese[sid] = sentence
    finally: archive.close()
    print("Loaded Tatoeba Japanese/English and Chinese sentences:",len(sentences),len(chinese))
    translations={}
    archive,rows=rows_in_tar(links_archive,"links.csv")
    try:
        for row in rows:
            if len(row)<2: continue
            left,right=row[0],row[1]
            if left in chinese and right in sentences: translations.setdefault(right,chinese[left])
            elif right in chinese and left in sentences: translations.setdefault(left,chinese[right])
    finally: archive.close()
    print("Source sentences with direct Chinese translations:",len(translations))
    cards=[]
    for lang in ("ja","en"):
        candidates=[]; seen=set()
        for sid,(sentence_lang,sentence) in sentences.items():
            if sentence_lang!=lang or sid not in translations: continue
            key=sentence.casefold() if lang=="en" else sentence
            if key in seen: continue
            seen.add(key); candidates.append((sid,sentence,translations[sid]))
        pattern=JP_WORK if lang=="ja" else EN_WORK
        workplace=sorted((item for item in candidates if pattern.search(item[1])),key=lambda item:(len(item[1]),item[0]))
        daily=sorted((item for item in candidates if not pattern.search(item[1])),key=lambda item:(len(item[1]),item[0]))
        def eligible(items, limit):
            result=[]
            for item in items:
                kinds={hit["type"] for hit in make_hits(item[1],lang)}
                if {"vocabulary","grammar"}.issubset(kinds):
                    result.append(item)
                    if len(result)>=limit: break
            return result
        workplace=eligible(workplace,3000)
        daily=eligible(daily,3000)
        chosen=[(item,"职场语言") for item in workplace[:1200]]
        chosen += [(item,"日常句子") for item in daily[:3000-len(chosen)]]
        if len(chosen)<3000:
            used={entry[0][0] for entry in chosen}
            chosen += [(item,"职场语言") for item in workplace[1200:] if item[0] not in used][:3000-len(chosen)]
        if len(chosen)!=3000:
            raise RuntimeError("Need 3,000 distinct Tatoeba sentences with Chinese translations for "+lang+", got "+str(len(chosen)))
        for (sid,sentence,translation),category in chosen:
            hits=make_hits(sentence,lang)
            card_id=lang+"-sentence-"+hashlib.sha1((lang+":"+sid).encode()).hexdigest()[:16]
            cards.append({"id":card_id,"language":lang,"category":category,"term":sentence,"reading":"",
              "meaning_zh":translation,"explanation":"句子与中文示意来自 Tatoeba 社区贡献内容；高亮为辅助学习标注，请结合上下文理解。",
              "example":"","example_meaning_zh":"","example_source_url":"",
              "source_url":"https://tatoeba.org/en/sentences/show/"+sid,"source_type":"licensed","content_type":"sentence",
              "highlight_json":json.dumps(hits,ensure_ascii=False,separators=(",",":")),
              "vocabulary_expansion_json":json.dumps(expansion(hits,"vocabulary",lang),ensure_ascii=False,separators=(",",":")),
              "grammar_expansion_json":json.dumps(expansion(hits,"grammar",lang),ensure_ascii=False,separators=(",",":"))})
    if len({item["id"] for item in cards})!=6000: raise RuntimeError("Duplicate sentence IDs")
    columns=["id","language","category","term","reading","meaning_zh","explanation","example","example_meaning_zh","example_source_url","source_type","content_type","source_url","highlight_json","vocabulary_expansion_json","grammar_expansion_json"]
    lines=["-- Generated from Tatoeba community sentences and Chinese translations. Sentence URLs provide attribution.","-- Tatoeba data: CC BY 2.0 FR; see https://tatoeba.org/en/terms_of_use."]
    insert_prefix = "INSERT OR IGNORE INTO language_cards ("+", ".join(columns)+") VALUES"
    values=["("+", ".join(sql(item[column]) for column in columns)+")" for item in cards]
    for start in range(0,len(values),5):
        # Each batch is a separate SQL statement to stay below D1's statement-size limit.
        batch = values[start:start+5]
        lines.append(insert_prefix+"\n"+",\n".join(batch)+";")
    OUT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    # 0081 may already have been applied in production before annotation fixes were made.
    # A new versioned migration is therefore required: INSERT OR IGNORE cannot repair
    # existing rows. 0082 refreshes the three annotation columns for every stable card ID.
    refresh = ["-- Refresh generated vocabulary/grammar annotations for existing sentence cards."]
    for item in cards:
        refresh.append(
            "UPDATE language_cards SET highlight_json = " + sql(item["highlight_json"]) +
            ", vocabulary_expansion_json = " + sql(item["vocabulary_expansion_json"]) +
            ", grammar_expansion_json = " + sql(item["grammar_expansion_json"]) +
            " WHERE id = " + sql(item["id"]) + " AND content_type = 'sentence';"
        )
    OUT_REFRESH.write_text("\n".join(refresh)+"\n",encoding="utf-8")
    OUT_REFRESH_LATEST.write_text("\n".join(refresh)+"\n",encoding="utf-8")
    print("Generated exactly 3,000 Japanese + 3,000 English sentence cards in",OUT)
    print("Generated annotation refresh migration for existing sentence cards in",OUT_REFRESH)
    print("Generated latest Japanese annotation refresh migration in",OUT_REFRESH_LATEST)
if __name__=="__main__": main()
