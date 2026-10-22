-- 可查询的 IT 专业词汇库与日语/英语学习卡。
-- 内容是平台自编学习资料，不冒充官方考试真题或第三方词典条目。

CREATE TABLE IF NOT EXISTS language_cards (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('ja', 'en')),
  category TEXT NOT NULL,
  term TEXT NOT NULL,
  reading TEXT,
  meaning_zh TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  example_meaning_zh TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'generated' CHECK (source_type IN ('official', 'licensed', 'generated', 'personal')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_language_cards_language_category
  ON language_cards(language, category);

INSERT OR IGNORE INTO language_cards
(id, language, category, term, reading, meaning_zh, explanation, example, example_meaning_zh, source_type)
VALUES
('ja-daily-01','ja','日常与情景会话','もう一度お願いします。','もういちど おねがいします','麻烦再说一遍。','没听清时的礼貌表达；比直接说「何？」更柔和。','すみません、もう一度お願いします。','不好意思，麻烦再说一遍。','generated'),
('ja-daily-02','ja','日常与情景会话','ちょっと聞いてもいいですか。','ちょっと きいても いいですか','我可以问一下吗？','向同事或不太熟悉的人开口提问时很自然。','今、ちょっと聞いてもいいですか。','现在方便问你一件事吗？','generated'),
('ja-daily-03','ja','日常与情景会话','大丈夫です。','だいじょうぶです','没关系／可以／我没事。','含义取决于场景；既可以表示接受，也可以表示状况没问题。','はい、大丈夫です。','好的，没问题。','generated'),
('ja-work-01','ja','职场与商务语言','確認してから、ご連絡します。','かくにんしてから、ごれんらくします','确认之后再联系您。','暂时不能马上答复时使用，语气礼貌且清楚。','内容を確認してから、ご連絡します。','确认内容后再联系您。','generated'),
('ja-work-02','ja','职场与商务语言','承知しました。','しょうちしました','明白了／收到。','职场常用的礼貌回应，表达已理解并接受指示。','承知しました。本日中に対応します。','收到，我今天之内处理。','generated'),
('ja-work-03','ja','职场与商务语言','念のため確認させてください。','ねんのため かくにんさせてください','为了保险起见，请让我确认一下。','适合确认日期、规格或操作步骤，能减少误会。','念のため、日付を確認させてください。','为了保险起见，请让我确认一下日期。','generated'),
('ja-grammar-01','ja','词汇与语法','〜かもしれません','〜かもしれません','也许……／可能……','表示不确定的推测，语气比断言更保留。','少し時間がかかるかもしれません。','可能需要一点时间。','generated'),
('ja-grammar-02','ja','词汇与语法','〜ことになっています','〜ことになっています','规定／安排是……','说明既定规则、流程或安排，不单纯表达说话人的个人意愿。','受付は九時からということになっています。','规定是九点开始受理。','generated'),
('en-daily-01','en','日常与情景会话','Could you say that again?','','你可以再说一遍吗？','礼貌地请对方重复，工作和日常沟通都适用。','Sorry, could you say that again?','不好意思，可以再说一遍吗？','generated'),
('en-daily-02','en','日常与情景会话','That works for me.','','我觉得可以／这个安排对我合适。','确认时间、方案或安排时常用，不是字面上的“它工作”。','Tuesday afternoon? That works for me.','周二下午？我可以。','generated'),
('en-daily-03','en','日常与情景会话','Let me check.','','我确认一下。','需要先查资料或确认信息时的自然表达。','Let me check and get back to you.','我确认后再回复你。','generated'),
('en-work-01','en','职场与商务语言','I’ll keep you posted.','','有进展我会及时告诉你。','适合向同事或合作方承诺后续同步进展。','I’ll keep you posted on the release.','发布有进展我会及时告诉你。','generated'),
('en-work-02','en','职场与商务语言','Could you clarify that point?','','你可以把那一点说清楚一些吗？','会议中礼貌地要求澄清，比直接说“I don’t understand”更聚焦。','Could you clarify that point about the deadline?','你可以再解释一下截止日期那一点吗？','generated'),
('en-grammar-01','en','词汇与语法','be supposed to','','应该……；按约定或规定应当……','表达预期、规定或原本的安排，具体语气取决于上下文。','The report is supposed to be ready today.','报告按计划今天应当准备好。','generated');

-- 核心 IT 与信息安全术语：可按日语词条、假名、中文释义、日语解释或英语释义反查。
INSERT OR IGNORE INTO vocabulary
(id, term, language, reading, meaning_zh, meaning_ja, meaning_en, example, source_module, mastery)
VALUES
('vocab-it-authentication','認証','ja','にんしょう','认证：确认用户是谁。','利用者が本人であることを確認すること。','Authentication: verifying the identity of a user.','ログイン時にパスワードで認証する。','IT 安全基础',0),
('vocab-it-authorization','認可','ja','にんか','授权：确认用户可以做什么。','認証後に利用者へ許可する操作や範囲を決めること。','Authorization: deciding which actions or resources a user may access.','一般利用者には管理画面へのアクセスを認可しない。','IT 安全基础',0),
('vocab-it-mfa','多要素認証','ja','たようそにんしょう','多因素认证：组合不同类别的验证要素。','知識・所持・生体など異なる要素を組み合わせて認証すること。','Multi-factor authentication: using two or more different authentication factors.','パスワードと認証アプリを使って多要素認証を行う。','情報セキュリティ',0),
('vocab-it-confidentiality','機密性','ja','きみつせい','机密性：只有获授权的人才能访问信息。','許可された者だけが情報にアクセスできる性質。','Confidentiality: information is accessible only to authorized parties.','アクセス権を設定して機密性を保つ。','情報セキュリティ',0),
('vocab-it-integrity','完全性','ja','かんぜんせい','完整性：信息准确且未被未授权篡改。','情報が正確で、改ざんされていない状態。','Integrity: maintaining the accuracy and completeness of information.','ハッシュ値を用いてデータの完全性を確認する。','情報セキュリティ',0),
('vocab-it-availability','可用性','ja','かようせい','可用性：需要时能正常使用信息和系统。','必要なときに情報やシステムを利用できる性質。','Availability: information and systems are usable when needed.','冗長化によってシステムの可用性を高める。','情報セキュリティ',0),
('vocab-it-encryption','暗号化','ja','あんごうか','加密：把数据转换为需密钥才能还原的形式。','第三者に読まれないよう、鍵を用いてデータを変換すること。','Encryption: converting data into a form that requires a key to read.','通信内容を暗号化して送信する。','暗号技術',0),
('vocab-it-hash','ハッシュ値','ja','はっしゅち','哈希值：对数据进行哈希运算得到的固定长度摘要。','ハッシュ関数によって計算される固定長の値。','Hash value: a fixed-length digest produced by a hash function.','ファイルのハッシュ値を比較して改ざんを検知する。','暗号技術',0),
('vocab-it-signature','電子署名','ja','でんししょめい','电子签名：用于验证签署者及数据完整性。','署名者の確認やデータの完全性の検証に使う電子的な署名。','Digital signature: a cryptographic value used to verify signer authenticity and data integrity.','公開鍵を使って電子署名を検証する。','暗号技術',0),
('vocab-it-vulnerability','脆弱性','ja','ぜいじゃくせい','漏洞：可能被利用来破坏安全性的弱点。','攻撃者に悪用されるおそれのある情報システム上の弱点。','Vulnerability: a weakness that may be exploited to compromise security.','脆弱性を修正するパッチを適用する。','脅威と脆弱性',0),
('vocab-it-least-privilege','最小権限','ja','さいしょうけんげん','最小权限：只授予完成工作所必需的权限。','業務に必要な最小限の権限だけを付与する考え方。','Least privilege: granting only the permissions needed to perform a task.','サービスアカウントに最小権限を適用する。','アクセス管理',0),
('vocab-it-access-control','アクセス制御','ja','あくせすせいぎょ','访问控制：依据身份与权限限制资源访问。','利用者の権限に基づいて資源へのアクセスを制限すること。','Access control: restricting resource access according to identity and permissions.','役割に応じてアクセス制御を設定する。','アクセス管理',0),
('vocab-it-phishing','フィッシング','ja','ふぃっしんぐ','网络钓鱼：通过伪装诱导用户泄露信息或执行操作。','正規の組織などを装い、認証情報や個人情報を盗み取る詐欺。','Phishing: impersonating a trusted party to steal information or induce unsafe actions.','不審なリンクを含むフィッシングメールに注意する。','サイバー攻撃',0),
('vocab-it-ransomware','ランサムウェア','ja','らんさむうぇあ','勒索软件：锁定或加密数据并要求赎金的恶意软件。','データを暗号化するなどして利用不能にし、身代金を要求するマルウェア。','Ransomware: malware that blocks access to data and demands payment.','バックアップを分離保管してランサムウェアに備える。','サイバー攻撃',0),
('vocab-it-incident','インシデント','ja','いんしでんと','安全事件：可能影响信息安全的事件。','情報セキュリティに影響を及ぼす、または及ぼすおそれのある事象。','Security incident: an event that affects or may affect information security.','インシデント発生時は速やかに報告する。','インシデント対応',0),
('vocab-it-logs','ログ管理','ja','ろぐかんり','日志管理：收集、保护和分析系统活动记录。','システムの活動記録を収集・保護・分析すること。','Log management: collecting, protecting and reviewing system activity records.','ログ管理によって不審な操作を追跡する。','運用管理',0),
('vocab-it-backup','バックアップ','ja','ばっくあっぷ','备份：为故障或数据丢失准备的可恢复副本。','障害や誤削除に備えてデータの複製を保存すること。','Backup: a copy of data kept for recovery after loss or failure.','定期的にバックアップから復元できるか確認する。','運用管理',0),
('vocab-it-risk-assessment','リスクアセスメント','ja','りすくあせすめんと','风险评估：识别风险并分析和评价风险大小。','リスクを特定し、分析・評価する一連のプロセス。','Risk assessment: identifying, analyzing and evaluating risks.','リスクアセスメントの結果に基づいて対策を決める。','リスク管理',0),
('vocab-it-personal-information','個人情報','ja','こじんじょうほう','个人信息：可识别特定个人的信息。','特定の個人を識別できる情報。','Personal information: information that can identify a specific individual.','個人情報を取り扱う際は利用目的を確認する。','個人情報保護',0),
('vocab-it-sql-injection','SQLインジェクション','ja','えすきゅーえるいんじぇくしょん','SQL 注入：将恶意 SQL 片段注入到应用查询中。','入力値を悪用してSQL文を不正に実行させる攻撃。','SQL injection: an attack that manipulates an application’s SQL statements through crafted input.','プレースホルダーを使ってSQLインジェクションを防ぐ。','アプリケーションセキュリティ',0);
