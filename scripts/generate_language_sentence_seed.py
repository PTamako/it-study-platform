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

 ("私","我","第一人称代词；具体指代依语境判断"), ("人","人","指人或人物"), ("友達","朋友","表示朋友关系"), ("家族","家人／家庭","指家庭成员"), ("家","家","可指住宅或家庭"),
 ("学校","学校","教育场所"), ("日本","日本","国家名称"), ("日本語","日语","语言名称"), ("英語","英语","语言名称"), ("水","水","常见饮品或物质名词"),
 ("食べる","吃","基本动词；ます形为「食べます」"), ("食べます","吃","「食べる」的礼貌体"), ("飲む","喝","基本动词；ます形为「飲みます」"), ("飲みます","喝","「飲む」的礼貌体"),
 ("見る","看","表示观看或查看"), ("見ます","看","「見る」的礼貌体"), ("聞く","听／询问","依语境表示听取或提问"), ("話す","说／交谈","表示说话或交流"), ("読む","读","表示阅读"), ("書く","写","表示书写"),
 ("買う","买","表示购买"), ("来る","来","表示来到说话人所在处或指定地点"), ("帰る","回去／回家","表示返回"), ("寝る","睡觉","表示睡眠"), ("起きる","起床／醒来","表示从睡眠中醒来"),
 ("好き","喜欢","常用「N が好きです」表达喜好"), ("嫌い","不喜欢","常用「N が嫌いです」表达不喜欢"), ("面白い","有趣","い形容词"), ("楽しい","开心／愉快","描述体验或心情"), ("忙しい","忙","い形容词"),
 ("暑い","热","通常描述天气或环境温度"), ("寒い","冷","通常描述天气或环境温度"), ("新しい","新","い形容词"), ("古い","旧","い形容词"), ("高い","高／贵","依语境表示高度或价格"), ("安い","便宜","描述价格低"), ("早い","早","描述时间较早"), ("遅い","晚／慢","依语境表示时间晚或速度慢"),
 ("きれい","漂亮／干净","な形容词；修饰名词时用「きれいな」"), ("静か","安静","な形容词"), ("元気","精神好／有活力","常见表达「元気です」"), ("おいしい","好吃","描述食物味道"), ("問題","问题","可指疑问、困难或待解决事项"), ("方法","方法","表示做事的方式"), ("理由","理由","说明原因"), ("経験","经验／经历","可指过去经历或积累的经验"),
 ("気持ち","心情／感受","表达内心感受"), ("場所","地点／地方","指位置或场所"), ("電車","电车","日本日常交通方式"), ("駅","车站","常见交通场景词"), ("店","店铺","指商店或店家"), ("病院","医院","医疗场所"), ("お金","钱","金钱"), ("名前","名字","姓名或称呼"), ("天気","天气","天气状况"), ("雨","雨","天气相关名词"), ("週末","周末","星期六、日附近的休息时段"),
 ("何","什么","疑问代词"), ("どこ","哪里","询问地点"), ("いつ","什么时候","询问时间"), ("誰","谁","询问人物"), ("なぜ","为什么","询问原因"), ("どう","怎样／如何","询问方式或状态"), ("いつも","总是／平时","频率副词"), ("よく","经常／很好","依语境表示频率或程度"), ("とても","非常","程度副词"), ("少し","一点儿","表示少量或轻微程度"), ("たくさん","很多","表示数量多"), ("一緒","一起","常见表达「一緒に」"), ("大切","重要／珍贵","な形容词"), ("予約","预约","可用于餐厅、医院、会议等场景"), ("電話","电话","可指电话设备或通话"), ("週","周","时间单位"), ("今日","今天","指当天"), ("明日","明天","指第二天"), ("昨日","昨天","指前一天")
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

 ("want","想要","表达愿望；常见结构 want to + 动词"), ("need","需要","表达需要；常见结构 need to + 动词"), ("know","知道","表示掌握信息或认识"), ("think","认为／思考","可用于表达观点"), ("make","制作／使得","含义依宾语和结构变化"), ("take","拿／乘坐／花费","多义动词，需结合搭配"), ("go","去","表示移动或前往"), ("come","来","表示向说话人或指定地点移动"), ("get","得到／变得","多义动词，需结合语境"), ("give","给","表示给予"), ("use","使用","表示使用工具或方法"), ("find","找到／发现","表示发现或寻找结果"), ("tell","告诉","常见结构 tell someone something"), ("ask","询问／请求","表示提问或提出请求"), ("work","工作／起作用","可作名词或动词"), ("live","居住／生活","表示居住或生活状态"), ("like","喜欢","表达喜好"), ("love","爱／非常喜欢","表达强烈喜爱"), ("feel","感觉","描述感受或状态"), ("look","看／看起来","依语境表示动作或外观"), ("see","看见／见面","表示视觉或会面"), ("hear","听见","表示听觉接收"), ("speak","说／讲","常用于语言能力或正式发言"), ("read","阅读","表示读文字"), ("write","写","表示书写"), ("eat","吃","表示进食"), ("drink","喝","表示饮用"), ("buy","买","表示购买"), ("help","帮助","可作名词或动词"), ("start","开始","表示启动或着手"), ("finish","完成","表示结束一项任务"), ("try","尝试","表示试着做某事"), ("learn","学习／学会","表示学习过程或结果"), ("study","学习／研究","常指系统学习"), ("understand","理解","表示理解信息"), ("remember","记得","表示记忆或记住"), ("forget","忘记","表示未能记住"), ("wait","等待","常见搭配 wait for"), ("leave","离开／留下","依语境判断"), ("arrive","到达","表示抵达地点"), ("call","打电话／称呼","依语境判断"), ("send","发送","常用于邮件或文件"), ("receive","收到","表示接收信息或物品"), ("check","检查／确认","常见职场动词"), ("open","打开／开放","依语境作动词或形容词"), ("close","关闭／接近","依语境判断"),
 ("important","重要的","形容词，描述重要性"), ("possible","可能的","形容词，描述可行性"), ("difficult","困难的","形容词，描述难度"), ("easy","容易的","形容词，描述难度低"), ("busy","忙的","描述时间安排紧张"), ("happy","开心的","描述情绪"), ("sorry","抱歉的","用于道歉或表达遗憾"), ("ready","准备好的","常见结构 be ready to + 动词"), ("good","好的","常见形容词，具体含义依语境"), ("better","更好","good 的比较级，也可作副词"), ("best","最好","good 的最高级"),
 ("time","时间","可指时间点、时长或可用时间"), ("day","天／日子","时间单位"), ("week","周","时间单位"), ("month","月","时间单位"), ("year","年","时间单位"), ("today","今天","时间副词／名词"), ("tomorrow","明天","时间副词／名词"), ("yesterday","昨天","时间副词／名词"), ("people","人们","people 通常作复数意义"), ("person","人","单数名词"), ("family","家庭／家人","集合名词"), ("friend","朋友","表示朋友关系"), ("home","家","常作副词或名词"), ("house","房子","指建筑物"), ("school","学校","教育场所"), ("language","语言","交流系统"), ("money","钱","不可数名词"), ("problem","问题","困难或待解决事项"), ("question","问题／提问","可指疑问或提问"), ("answer","答案／回答","可作名词或动词"), ("place","地方","指地点"), ("train","火车／训练","依语境判断"), ("station","车站","交通场所"), ("store","商店","零售场所"), ("hospital","医院","医疗场所"), ("weather","天气","天气状况"), ("plan","计划","可作名词或动词"), ("idea","想法","观点或构思"), ("information","信息","不可数名词"), ("reason","原因","解释为何发生"), ("experience","经验／经历","可指经历或经验"), ("result","结果","事件或过程的结果"), ("change","改变／变化","可作名词或动词"), ("new","新的","形容词"), ("old","旧的／年长的","依语境判断"), ("high","高的","描述高度或程度"), ("low","低的","描述高度或程度"), ("early","早的／早地","可作形容词或副词"), ("late","晚的／迟的","可作形容词或副词")
]
JP_GRAMMAR = [
 (r"が楽しみです","N が楽しみです","「が」标记期待的事情；「楽しみです」表示对未来事情的期待，如「旅行が楽しみです」"),
 (r"です$","です：礼貌体判断／说明","用于礼貌地说明身份、性质或状态；需结合前面的名词或形容词理解"),
 (r"ます$","动词ます形","动词的礼貌体形式；词干及具体时态需结合前文判断"),
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

 (r"(?<=[ぁ-んァ-ヶ一-龯])(?:から|まで|より|だけ|しか|は|が|を|に|で|と|へ|の)","名词／短语＋助词","助词标记主题、对象、地点、方向、所属或范围；具体功能要结合句意判断"),
 (r"(?:私|僕|彼|彼女|これ|それ|あれ|誰|何)は","主题提示：N は","「は」提示谈话主题，后续说明主题相关的信息"),
 (r"(?:です|でした)(?=[。！？!?…]*$)","礼貌体判断／说明","礼貌地说明身份、性质或状态；过去形式「でした」表示过去的判断或状态"),
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

 (r"\b(?:I|you|we|they|he|she|it|this|that|there)\s+(?:am|is|are|was|were|have|has|had|do|does|did|can|could|will|would|should|must|may|might)\b","主语＋助动词／系动词","先识别主语，再看助动词或系动词表达的时态、能力、义务或状态"),
 (r"\b(?:I|you|we|they|he|she|it)\s+[A-Za-z]+(?:ed|ing|s)\b","主语＋谓语","主语后面的动词形式可提示时态或动作状态；需结合完整句子判断"),
 (r"\b(?:a|an|the)\s+[A-Za-z]+\b","冠词＋名词短语","冠词提示名词的泛指或特指；a/an 通常引入单数可数名词，the 指向特定对象"),
]

def make_hits(sentence, lang):
    vocab = JP_VOCAB if lang == "ja" else EN_VOCAB
    grammar = JP_GRAMMAR if lang == "ja" else EN_GRAMMAR
    candidates = []
    for term, meaning, explanation in vocab:
        if lang == "ja" and len(term) < 2:
            continue
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
    # Never fabricate a vocabulary or grammar annotation from an arbitrary substring.
    # Cards without a recognized lexical item and a recognized grammar pattern are
    # excluded by eligible() rather than being filled with generic placeholder text.
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
                if {"vocabulary","grammar"}.issubset(kinds) and not any(
                hit["meaning"] in {"句中重点表达", "句子结构观察点", "句尾活用／表达观察点"}
                or "未识别到明确" in hit["explanation"]
                for hit in make_hits(item[1], lang)):
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
    # Whole-corpus quality summary: every accepted card must have concrete, non-overlapping
    # source spans and non-placeholder explanations. Fail closed if any generic filler leaks in.
    quality = {"ja": {"vocabulary": 0, "grammar": 0}, "en": {"vocabulary": 0, "grammar": 0}}
    for card in cards:
        sentence = card["term"]
        highlights = json.loads(card["highlight_json"])
        for hit in highlights:
            if sentence[hit["start"]:hit["end"]] != hit["term"]:
                raise RuntimeError("Invalid highlight offsets for " + card["id"])
            if hit["meaning"] in {"句中重点表达", "句子结构观察点", "句尾活用／表达观察点"} or "未识别到明确" in hit["explanation"]:
                raise RuntimeError("Placeholder annotation detected for " + card["id"])
            quality[card["language"]][hit["type"]] += 1
        ordered_hits = sorted(highlights, key=lambda hit: hit["start"])
        for left, right in zip(ordered_hits, ordered_hits[1:]):
            if left["end"] > right["start"]:
                raise RuntimeError("Overlapping highlights for " + card["id"])
        for kind, column in (("vocabulary", "vocabulary_expansion_json"), ("grammar", "grammar_expansion_json")):
            expansions = json.loads(card[column])
            if not expansions:
                raise RuntimeError("Missing " + kind + " explanation for " + card["id"])
            highlighted_terms = {hit["term"] for hit in highlights if hit["type"] == kind}
            if not highlighted_terms.issubset({entry["term"] for entry in expansions}):
                raise RuntimeError("Unexplained " + kind + " highlight for " + card["id"])
    print("Generated annotation refresh migration for existing sentence cards in",OUT_REFRESH)
    print("Generated latest Japanese annotation refresh migration in",OUT_REFRESH_LATEST)
if __name__=="__main__": main()
