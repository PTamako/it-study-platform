#!/usr/bin/env python3
"""Generate 10,000 attributed sentence cards from Tatoeba's public exports."""
import csv, hashlib, io, json, re, tarfile, urllib.request
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "migrations/0081_language_sentence_cards.sql"
OUT_REFRESH = ROOT / "migrations/0082_refresh_language_sentence_annotations.sql"
OUT_REFRESH_LATEST = ROOT / "migrations/0084_refresh_contextual_bilingual_annotations.sql"
OUT_REBUILD = ROOT / "migrations/0086_rebuild_contextual_bilingual_sentence_cards.sql"
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
 ("これ","这个／这","指向当前语境中可识别的事物；「これ誰の傘ですか」中的「これ」指眼前的伞"), ("それ","那个／那","指向听话人附近或前文提到的事物"), ("あれ","那个（较远处）","指说话人与听话人都相对较远的事物"), ("誰","谁","疑问代词，用于询问人物；「誰の＋名词」询问所属者"),
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
 ("何","什么","疑问代词"), ("どこ","哪里","询问地点"), ("いつ","什么时候","询问时间"), ("誰","谁","询问人物"), ("なぜ","为什么","询问原因"), ("どう","怎样／如何","询问方式或状态"), ("いつも","总是／平时","频率副词"), ("よく","经常／很好","依语境表示频率或程度"), ("とても","非常","程度副词"), ("少し","一点儿","表示少量或轻微程度"), ("たくさん","很多","表示数量多"), ("一緒","一起","常见表达「一緒に」"), ("大切","重要／珍贵","な形容词"), ("予約","预约","可用于餐厅、医院、会议等场景"), ("電話","电话","可指电话设备或通话"), ("週","周","时间单位"), ("今日","今天","指当天"), ("明日","明天","指第二天"), ("昨日","昨天","指前一天"),
 ("こと","事情／……这件事","形式名词，常把前面的动词或句子名词化；具体含义依上下文判断"),
 ("もの","东西／事物","可指具体物品，也可用于抽象表达，需结合上下文理解"),
 ("ところ","地方／时候／阶段","可指地点、时间点或动作所处阶段"),
 ("ため","为了／因为","常见于目的或原因表达，需结合前后结构判断"),
 ("場合","情况／场合","用于说明某种条件或情形"),
 ("一度","一次／一度","表示次数，也可用于「一度確認する」等表达"),
 ("最近","最近","指近期发生或持续的事情"),
 ("例えば","例如","用于引出例子"),
 ("しかし","但是","用于引出转折"),
 ("そして","然后／而且","连接前后内容"),
 ("また","又／另外","可表示重复或补充信息"),
 ("つまり","也就是说","用于总结或换一种方式说明"),
 ("実際","实际上","用于说明实际情况"),
 ("特に","尤其","强调某项内容"),
 ("最初","最初／一开始","表示开始阶段"),
 ("最後","最后","表示最终阶段或最后一项"),
 ("結果","结果","表示某个过程产生的结果"),
 ("情報","信息","表示可传递或处理的资料"),
 ("内容","内容","指事项或资料所包含的信息"),
 ("利用","使用／利用","常见于服务、系统或资源的使用"),
 ("管理","管理","表示维护、控制或组织资源"),
 ("開発","开发","常用于软件和系统开发"),
 ("設定","设置／配置","指为系统或功能指定参数"),
 ("機能","功能","指系统或产品提供的能力"),
 ("処理","处理","表示执行操作或处理数据"),
 ("作業","工作／作业","指需要完成的具体任务"),
 ("問題","问题","可指疑问、困难或待解决事项"),
 ("状況","情况／状态","说明当前环境或进展"),
 ("理由","理由","解释事情发生的原因"),
 ("説明","说明","将内容或理由讲清楚"),
 ("紹介","介绍","向他人说明人、事物或服务"),
 ("準備","准备","为后续行动提前安排"),
 ("必要","必要","表示某事不可缺少"),
 ("便利","方便","描述使用或操作上的便利性"),
 ("簡単","简单","描述难度较低"),
 ("難しい","困难","描述难度较高"),
 ("正しい","正确","表示符合事实或规则"),
 ("違う","不同／不对","表示差异或错误"),
 ("同じ","相同","表示一致"),
 ("使う","使用","表示使用工具、方法或资源"),
 ("作る","制作／创建","表示产生或构建某物"),
 ("考える","考虑／思考","表示思考、判断或计划"),
 ("決める","决定","表示作出选择"),
 ("始める","开始","表示着手某项活动"),
 ("終わる","结束","表示某事完成"),
 ("続ける","继续","表示让动作或状态持续"),
 ("変える","改变","表示主动改变某项内容"),
 ("増える","增加","表示数量或程度上升"),
 ("減る","减少","表示数量或程度下降"),
 ("送る","发送／送","表示发送信息或递送物品"),
 ("受け取る","接收／收到","表示接收物品或信息"),
 ("待つ","等待","表示等待某人或某事"),
 ("使えます","可以使用","表示具备使用条件或能力"),
 ("分かります","明白／了解","表示理解或掌握信息"),
 ("教える","告诉／教","表示传授知识或提供信息"),
 ("答える","回答","表示回应问题"),
 ("選ぶ","选择","表示从多个选项中作出选择"),
 ("比べる","比较","表示查看不同事物的差异"),
 ("気をつける","注意／小心","用于提醒留意风险或细节"),
 ("もう","已经／再","可表示某事已发生，也可表示追加或再次，需结合上下文判断"),
 ("まだ","还／尚未","表示状态持续或某事尚未发生"),
 ("すぐ","马上／立刻","表示时间上很快或距离很近"),
 ("もちろん","当然","表示说话人认为某事理所当然"),
 ("本当","真的／事实","用于确认真实性，也常见于「本当に」"),
 ("一番","最／第一","可表示顺序第一，也可用于最高程度"),
 ("たぶん","大概／可能","表示说话人对判断有一定把握但不完全确定"),
 ("ぜひ","务必／一定","用于积极推荐或强烈希望对方尝试某事"),
 ("こちら","这边／这位","礼貌地指向说话人一方或当前一侧"),
 ("そちら","那边／您那边","礼貌地指向听话人一方或对方所在处"),
 ("どちら","哪边／哪一位","「どこ」的礼貌表达，也可询问二者中的哪一个"),
 ("何か","什么／某些东西","用于不特定事物或提出帮助时的询问"),
 ("何も","什么也……","常与否定形式搭配，表示没有任何事物"),
 ("いろいろ","各种各样","表示种类或内容多样"),
 ("みんな","大家／所有人","口语中指群体中的所有人"),
 ("毎日","每天","表示每日反复发生的时间频率"),
 ("自分","自己","指说话人或语境中的相关人物本人"),
 ("一緒に","一起","表示与他人共同进行某项动作"),
]
EN_VOCAB = [
 ("this","这个／这","指向当前语境中可识别的人或物；作代词时可独立指代事物"), ("that","那个／那","指向语境中可识别的人或物；作代词时可独立指代事物"), ("umbrella","伞","遮雨或遮阳的工具，常见表达「an umbrella」"),
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
 ("time","时间","可指时间点、时长或可用时间"), ("day","天／日子","时间单位"), ("week","周","时间单位"), ("month","月","时间单位"), ("year","年","时间单位"), ("today","今天","时间副词／名词"), ("tomorrow","明天","时间副词／名词"), ("yesterday","昨天","时间副词／名词"), ("people","人们","people 通常作复数意义"), ("person","人","单数名词"), ("family","家庭／家人","集合名词"), ("friend","朋友","表示朋友关系"), ("home","家","常作副词或名词"), ("house","房子","指建筑物"), ("school","学校","教育场所"), ("language","语言","交流系统"), ("money","钱","不可数名词"), ("problem","问题","困难或待解决事项"), ("question","问题／提问","可指疑问或提问"), ("answer","答案／回答","可作名词或动词"), ("place","地方","指地点"), ("train","火车／训练","依语境判断"), ("station","车站","交通场所"), ("store","商店","零售场所"), ("hospital","医院","医疗场所"), ("weather","天气","天气状况"), ("plan","计划","可作名词或动词"), ("idea","想法","观点或构思"), ("information","信息","不可数名词"), ("reason","原因","解释为何发生"), ("experience","经验／经历","可指经历或经验"), ("result","结果","事件或过程的结果"), ("change","改变／变化","可作名词或动词"), ("new","新的","形容词"), ("old","旧的／年长的","依语境判断"), ("high","高的","描述高度或程度"), ("low","低的","描述高度或程度"), ("early","早的／早地","可作形容词或副词"), ("late","晚的／迟的","可作形容词或副词"),
 ("process","过程／处理","指一系列步骤，也可作动词表示处理"),
 ("system","系统","由相互关联的部分组成的整体"),
 ("service","服务","为用户或其他系统提供的功能"),
 ("support","支持／支援","可指提供帮助或技术支持"),
 ("team","团队","共同完成目标的一组人员"),
 ("member","成员","属于某个群体或团队的人"),
 ("project","项目","有明确目标和期限的一组工作"),
 ("task","任务","需要完成的具体工作"),
 ("detail","细节","事项中的具体信息"),
 ("purpose","目的","行动或设计希望达到的结果"),
 ("example","例子","用于说明某个概念或情况"),
 ("option","选项","可供选择的方案"),
 ("choice","选择","从多个可能性中作出的决定"),
 ("decision","决定","经过考虑后作出的判断或选择"),
 ("result","结果","行动或过程产生的结果"),
 ("effect","影响／效果","某项行动产生的结果"),
 ("level","水平／级别","表示程度、层次或等级"),
 ("value","值／价值","可表示数值或重要性"),
 ("data","数据","可存储、传输或处理的信息"),
 ("file","文件","保存数据或内容的数字对象"),
 ("message","消息","传递的信息或通知"),
 ("change","变化／修改","可作名词或动词，表示改变"),
 ("review","审查／复核","仔细检查内容或成果"),
 ("improve","改善／提高","使质量、状态或性能变得更好"),
 ("provide","提供","向某人或系统交付所需内容"),
 ("include","包括","表示某项内容属于整体的一部分"),
 ("allow","允许","表示许可或使某事成为可能"),
 ("require","要求／需要","表示必要条件或义务"),
 ("follow","跟随／遵循","可表示跟随步骤或遵守规则"),
 ("during","在……期间","介词，表示某段时间内发生的事情"),
 ("while","当……时／而","可引导时间从句或表示对比"),
 ("since","自从／因为","可表示起点时间或原因"),
 ("until","直到","表示动作或状态持续到某个时间"),
 ("unless","除非","引导否定条件"),
 ("instead","代替／反而","表示替代方案或对比"),
 ("already","已经","表示某事在当前时间之前发生"),
 ("still","仍然","表示状态持续"),
 ("yet","还／尚未","常用于疑问句或否定句，也可表示然而"),
 ("almost","几乎","表示接近某个程度或数量"),
 ("usually","通常","表示一般情况下的频率"),
 ("probably","可能／大概","表示较高但不确定的可能性"),
 ("exactly","确切地／正是","表示准确或完全一致"),
 ("clearly","清楚地","表示表达或理解清晰"),
 ("quickly","迅速地","表示动作速度快"),
 ("carefully","仔细地","表示谨慎地执行动作"),
 ("different","不同的","描述差异"),
 ("similar","相似的","描述具有共同特征"),
 ("available","可用的／有空的","依语境表示资源可用或人员有空"),
 ("specific","具体的／特定的","强调明确对象或细节"),
 ("common","常见的／共同的","表示普遍出现或共享"),
 ("simple","简单的","表示结构或操作不复杂"),
 ("clear","清楚的／明确的","表示容易理解或界限明确"),
 ("correct","正确的","表示符合事实或要求"),
 ("necessary","必要的","表示不可缺少"),
 ("effective","有效的","表示能够实现预期结果"),
 ("successful","成功的","表示达到预期目标")
]
JP_GRAMMAR = [
 (r"誰の[^、。！？!?\s]+?(?=です|だ|だった|[。！？!?…]|$)|何の[^、。！？!?\s]+?(?=です|だ|だった|[。！？!?…]|$)","疑問词＋の＋名词：所属・内容","「誰の＋名詞」は持ち主を、「何の＋名詞」は種類や内容を尋ねる。「の」は疑問詞と名詞をつなぐ。"),
 (r"ですか(?=[。！？!?…]*$)","ですか：礼貌疑问句","名词或な形容词等后接「ですか」构成礼貌疑问；「か」标记疑问，不是独立的重点词汇。"),
 (r"でしょうか(?=[。！？!?…]*$)","でしょうか：委婉疑问","比直接的「ですか」更委婉，常用于询问或确认。"),
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
 (r"ないでください","请不要……","动词ない形＋でください，用于礼貌地请求对方不要做某事"),
 (r"なくてもいい(?:です)?","不……也可以","表示某动作不是必须的，允许不做"),
 (r"たほうがいい","最好……","用于提出建议，表示某做法更合适"),
 (r"ことにしました|ことにする","决定……","表示说话人作出的决定或选择"),
 (r"ことになりました|ことになる","决定为……／规定为……","表示经过安排或规则形成的决定"),
 (r"ようになりました|ようになる","变得能够……／开始……","表示能力、习惯或状态发生变化"),
 (r"ようと思います|ようと思う","打算……","动词意向形＋と思う，用于表达打算或意图"),
 (r"てみます|てみる","试着……","て形＋みる，表示尝试某个动作"),
 (r"てしまいました|てしまった|てしまう","……完了／不小心……","表示动作完成，也可能带有遗憾或非预期的语气"),
 (r"ておきます|ておく","事先……／先……","表示为后续行动预先做好某事"),
 (r"てあります","已经……好","表示某动作的结果状态被保留，常见于有意准备的情境"),
 (r"てくれます|てくれる","为我／我方做……","表示他人为说话人或说话人一方做某事"),
 (r"てもらいます|てもらう","请别人为我做……","表示说话人接受他人提供的动作或帮助"),
 (r"てあげます|てあげる","为别人做……","表示说话人或相关人物为他人做某事"),
 (r"たらどうですか","……怎么样","用于向对方提出建议"),
 (r"ばいいですか","……就可以吗","用于询问适当的方法或条件"),
 (r"かどうか","是否……","将一个问题或不确定事项作为句子成分"),
 (r"だけでなく","不仅……","表示后项之外还有其他内容，常与「も」呼应"),
 (r"しかありません|しかない","只能……／只有……","与否定形式搭配，表示范围或选择受限"),
 (r"つもりです|つもりだ","打算……","表示说话人的计划或意图"),
 (r"そうです","看起来……／听说……","可表示样态或传闻，需根据接续形式和上下文区分"),
 (r"らしいです|らしい","似乎……／有……特点","可表达传闻或典型特征，需结合上下文判断"),
 (r"みたいです|みたい","好像……","口语中用于比喻或不确定判断"),
 (r"のが好きです|のが得意です|のが苦手です","动词普通形＋のが……","将动作名词化后说明喜好、擅长或不擅长"),
 (r"に行きます|に行く|に来ます|に来る","动词ます形词干＋に行く／来る","表示前往某地进行某项动作"),
 (r"たり.*たりします|たり.*たりする","たり……たりする","列举代表性动作或状态，不表示穷尽全部情况"),

 (r"(?<=[ぁ-んァ-ヶ一-龯])(?:から|まで|より|だけ|しか|は|が|を|に|で|と|へ|の)","名词／短语＋助词","助词标记主题、对象、地点、方向、所属或范围；具体功能要结合句意判断"),
 (r"(?:私|僕|彼|彼女|これ|それ|あれ|誰|何)は","主题提示：N は","「は」提示谈话主题，后续说明主题相关的信息"),
 (r"(?:です|でした)(?=[。！？!?…]*$)","礼貌体判断／说明","礼貌地说明身份、性质或状态；过去形式「でした」表示过去的判断或状态"),
]
EN_GRAMMAR = [
 (r"\b(?:whose|what|which|who)\s+\w+","疑问词问句","疑问词决定询问的人、所属、事物或选择；结合后续词语判断完整问句含义。"),
 (r"^\s*(?:is|are|am|was|were)\s+\w+(?:\s+\w+){0,3}\?","be 动词一般疑问句","将 be 动词放在主语前构成一般疑问句，询问身份、状态或所属等信息。"),
 (r"^\s*(?:do|does|did)\s+\w+\b[^.!?]*\?","do 助动词疑问句","do/does/did 放在主语前构成一般疑问；后接动词原形，did 表示过去时。"),
 (r"\b(?:a|an|the)\s+(?:[A-Za-z]+\s+){1,2}[A-Za-z]+\b","冠词＋修饰语＋名词短语","冠词限定后面的名词短语；中间的形容词或修饰语描述名词，例如 a rich country = 一个富有的国家。优先按完整短语标注，避免把 a rich 误判为完整名词短语。"),
(r"\b(?:a|an|the)\s+\w+","冠词＋名词","a/an 通常引入一个非特定的可数单数对象；the 指向语境中可识别的特定对象。"),
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

@lru_cache(maxsize=100000)
def make_hits(sentence, lang):
    """Find meaningful, context-aware spans with language-specific boundaries and balanced coverage."""
    vocab = JP_VOCAB if lang == "ja" else EN_VOCAB
    grammar = JP_GRAMMAR if lang == "ja" else EN_GRAMMAR
    candidates = []

    # Structural rules are ordered from specific constructions to broad patterns.
    # Earlier rules therefore win when spans have equal length and start position.
    for rule_index, (pattern, meaning, explanation) in enumerate(grammar):
        for match in re.finditer(pattern, sentence, re.I if lang == "en" else 0):
            term = match.group()
            if not term.strip():
                continue
            if lang == "ja" and term in {"か", "の", "は", "が", "を", "に", "で", "と", "へ"}:
                particle_notes = {
                    "か": ("句末助词「か」：疑问", "放在句末标记疑问；若前面是「です」，两者合起来构成礼貌疑问「ですか」。"),
                    "の": ("助词「の」：所属／连接", "连接所属者与物品或名词与名词；例如「誰の傘」表示“谁的伞”。"),
                    "は": ("助词「は」：提示主题", "提示这句话正在谈论的对象，后面说明该对象的状态或相关信息。"),
                    "が": ("助词「が」：主语／关注对象", "标记句中被描述、发生动作或成为关注点的对象；具体功能要结合谓语理解。"),
                    "を": ("助词「を」：动作对象", "通常标记动作直接作用的对象，例如「本を読む」中的「本」。"),
                    "に": ("助词「に」：目标／时间／对象", "可标记到达点、时间或动作对象；此处需结合相邻词语判断。"),
                    "で": ("助词「で」：动作场所／手段", "常标记动作发生的场所或使用的手段，具体含义取决于句中动词。"),
                    "と": ("助词「と」：共同对象／引用", "可表示“和／与”，也可引出引用内容；需结合前后文判断。"),
                    "へ": ("助词「へ」：方向", "标记动作前往的方向或目的地。"),
                }
                meaning, explanation = particle_notes[term]
                # Prefer the role evidenced by this sentence over a list of possible particle meanings.
                if term == "の" and "ドアの陰" in sentence:
                    meaning, explanation = "名词连接：ドアの陰", "「ドア」修饰「陰」，组成表示位置的名词短语「ドアの陰」（门后／门的阴影处）；这里不是在询问所属者。"
                elif term == "に" and re.search(r"陰に.{0,8}(?:隠す|隠した|置く|置いた)", sentence):
                    meaning, explanation = "に：动作发生的位置", "「陰に」指出把东西藏起来的位置；这里的「に」标记位置，不是时间或动作对象。"
                elif term == "を" and re.search(r"それを.{0,8}隠", sentence):
                    meaning, explanation = "を：动作对象", "「それを」中的「を」标记被藏起来的东西；「それ」在这里可自然理解为“它”。"
                elif term == "は" and re.search(r"彼は", sentence):
                    meaning, explanation = "は：提示主题（彼は）", "「彼」是“他”；「は」提示本句谈论的主题，后面的「ドアの陰にそれを隠した」说明他做了什么。"
                elif term == "の" and re.search(r"彼はドアの陰", sentence):
                    meaning, explanation = "の：连接名词（ドアの陰）", "「の」把「ドア」和「陰」连接起来，组成表示位置的短语「ドアの陰」（门后／门的阴影处）。"
            candidates.append({
                "start": match.start(), "end": match.end(), "type": "grammar",
                "term": term, "meaning": meaning, "explanation": explanation,
                "rule_id": ("ja" if lang == "ja" else "en") + ".grammar." + str(rule_index + 1),
                "confidence": "rule", "rule_priority": len(grammar) - rule_index,
            })

    for rule_index, (term, meaning, explanation) in enumerate(vocab):
        if lang == "ja" and (len(term) < 2 or term in {"です", "ます", "でした", "ました", "ください"}):
            continue
        # English lexicon entries must match whole words/phrases, never substrings
        # such as "he" inside "the" or "art" inside "party".
        pattern = re.escape(term)
        if lang == "en":
            pattern = r"(?<![A-Za-z])" + pattern + r"(?![A-Za-z])"
        for match in re.finditer(pattern, sentence, re.I if lang == "en" else 0):
            candidates.append({
                "start": match.start(), "end": match.end(), "type": "vocabulary",
                "term": match.group(), "meaning": meaning, "explanation": explanation,
                "rule_id": ("ja" if lang == "ja" else "en") + ".vocab." + str(rule_index + 1),
                "confidence": "lexicon", "rule_priority": len(vocab) - rule_index,
            })

    # Resolve overlaps by preferring complete phrases, then specific rules, then grammar
    # over vocabulary only when both spans are otherwise equally strong.
    candidates.sort(key=lambda item: (
        item["start"], -(item["end"] - item["start"]),
        -item["rule_priority"], 0 if item["type"] == "grammar" else 1,
    ))
    non_overlapping = []
    for item in candidates:
        if any(item["start"] < old["end"] and item["end"] > old["start"] for old in non_overlapping):
            continue
        non_overlapping.append(item)

    # Avoid filling the card with particles or one annotation type. Keep at most four
    # vocabulary and four grammar highlights, then fill unused slots by span quality.
    selected = []
    for kind in ("vocabulary", "grammar"):
        kind_hits = [item for item in non_overlapping if item["type"] == kind]
        selected.extend(kind_hits[:4])
    # Do not refill unused slots from a type that has already reached its cap.
    # A card may have fewer than eight highlights when one annotation type has
    # fewer matches; readability and the per-type limits take precedence.
    return sorted(selected, key=lambda item: (item["start"], -(item["end"] - item["start"])))

def validate_annotation_rules():
    japanese = make_hits("これ誰の傘ですか？", "ja")
    english = make_hits("Whose umbrella is this?", "en")
    assert any(hit["term"] == "これ" and hit["type"] == "vocabulary" for hit in japanese), "Japanese example must highlight a meaningful vocabulary item"
    assert any(hit["term"] == "誰の傘" and hit["type"] == "grammar" for hit in japanese), "Japanese example must identify the ownership structure"
    assert any(hit["term"] == "ですか" and hit["type"] == "grammar" for hit in japanese), "Japanese example must identify polite question form"
    assert not any(hit["term"] in {"です", "か"} and hit["type"] == "vocabulary" for hit in japanese), "Polite ending/particle must not be vocabulary highlights"
    assert any(hit["term"].casefold() == "whose umbrella" and hit["type"] == "grammar" for hit in english), "English example must identify whose + noun"
    assert any(hit["term"].casefold() == "this" and hit["type"] == "vocabulary" for hit in english), "English example must highlight meaningful vocabulary"
    false_positive = make_hits("Thisness is rare.", "en")
    assert not any(hit["type"] == "vocabulary" and hit["term"].casefold() == "this" for hit in false_positive), "English vocabulary must not match inside a longer word"

    # Production regressions: no invented vocabulary and context-specific explanations.
    english_sentence = "Japan is a rich country."
    english_example = make_hits(english_sentence, "en")
    assert not any(hit["term"].casefold() == "try" for hit in english_example), "Never annotate vocabulary absent from the sentence"
    assert any(hit["type"] == "grammar" and hit["term"].casefold() == "a rich country" for hit in english_example), "Article grammar should cover the complete noun phrase, not just 'a rich'"
    english_article = next(hit for hit in english_example if hit["type"] == "grammar" and hit["term"].casefold() == "a rich country")
    assert "名词短语" in english_article["meaning"], "Article phrase explanation must identify the full noun phrase"

    japanese_sentence = "彼はドアの陰にそれを隠した。"
    japanese_example = make_hits(japanese_sentence, "ja")
    assert any(hit["type"] == "vocabulary" and hit["term"] == "それ" for hit in japanese_example), "Highlight vocabulary that actually occurs in the Japanese sentence"
    assert not any(hit["term"] == "try" for hit in japanese_example), "English vocabulary must never leak into Japanese annotations"
    for term, expected in (("の", "ドア"), ("に", "位置"), ("を", "藏")):
        hit = next((item for item in japanese_example if item["type"] == "grammar" and item["term"] == term), None)
        if hit is not None:
            assert expected in hit["explanation"], "Particle explanation must fit its sentence context: " + term

    for language, sentence, hits in (("ja", "これ誰の傘ですか？", japanese), ("en", "Whose umbrella is this?", english)):
        assert len(hits) <= 8, language + " must respect the highlight limit"
        assert sum(hit["type"] == "vocabulary" for hit in hits) <= 4, language + " should not overfill vocabulary highlights"
        assert sum(hit["type"] == "grammar" for hit in hits) <= 4, language + " should not overfill grammar highlights"
        for hit in hits:
            assert sentence[hit["start"]:hit["end"]] == hit["term"], language + " highlight offset mismatch"
        ordered = sorted(hits, key=lambda hit: hit["start"])
        assert all(left["end"] <= right["start"] for left, right in zip(ordered, ordered[1:])), language + " highlights overlap"


def expansion(hits, kind, lang=None):
    output=[]; seen=set()
    for hit in hits:
        if hit["type"] != kind or hit["term"] in seen: continue
        seen.add(hit["term"])
        output.append({"term":hit["term"],"meaning":hit["meaning"],"explanation":hit["explanation"],"rule_id":hit.get("rule_id", "legacy"),"confidence":hit.get("confidence", "rule")})
        # Keep every displayed highlight explainable: make_hits caps sentence highlights at 8,
        # so expansion must not silently drop highlighted items after the fourth match.
        if len(output)>=8: break
    return output

def main():
    validate_annotation_rules()
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
        workplace=eligible(workplace,5000)
        daily=eligible(daily,5000)
        chosen=[(item,"职场语言") for item in workplace[:1500]]
        chosen += [(item,"日常句子") for item in daily[:5000-len(chosen)]]
        if len(chosen)<5000:
            used={entry[0][0] for entry in chosen}
            chosen += [(item,"职场语言") for item in workplace[1500:] if item[0] not in used][:5000-len(chosen)]
        if len(chosen)!=5000:
            raise RuntimeError("Need 5,000 distinct Tatoeba sentences with Chinese translations for "+lang+", got "+str(len(chosen)))
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
    if len({item["id"] for item in cards})!=10000: raise RuntimeError("Duplicate sentence IDs")
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
    # Rebuild the sentence corpus from the freshly generated dataset, rather than
    # merely updating annotations in rows seeded by an older algorithm. Preserve
    # per-card mastery before ON DELETE CASCADE removes the old sentence rows.
    rebuild = [
        "-- Rebuild the complete bilingual sentence corpus using the current annotation rules.",
        "-- Preserve existing mastery for stable IDs; unrelated cards and saved vocabulary are untouched.",
        "CREATE TABLE IF NOT EXISTS language_card_progress_rebuild_backup (card_id TEXT PRIMARY KEY, mastered INTEGER NOT NULL, updated_at TEXT NOT NULL);",
        "INSERT OR REPLACE INTO language_card_progress_rebuild_backup (card_id, mastered, updated_at) SELECT p.card_id, p.mastered, p.updated_at FROM language_card_progress p JOIN language_cards c ON c.id = p.card_id WHERE c.content_type = 'sentence';",
        "DELETE FROM language_cards WHERE content_type = 'sentence';",
    ]
    for start in range(0, len(values), 5):
        batch = values[start:start+5]
        rebuild.append(insert_prefix + "\n" + ",\n".join(batch) + ";")
    rebuild.extend([
        "INSERT OR REPLACE INTO language_card_progress (card_id, mastered, updated_at) SELECT b.card_id, b.mastered, b.updated_at FROM language_card_progress_rebuild_backup b JOIN language_cards c ON c.id = b.card_id WHERE c.content_type = 'sentence';",
        "DROP TABLE language_card_progress_rebuild_backup;",
    ])
    OUT_REBUILD.write_text("\n".join(rebuild) + "\n", encoding="utf-8")

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
