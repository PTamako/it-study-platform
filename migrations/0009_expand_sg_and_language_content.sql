-- 继续扩充 SG 题库、IT 术语和语言卡片。
-- 全部为知学自编内容，不冒充 IPA 官方真题；可在手机无法操作 D1 时先提交 SQL，之后统一导入。
-- INSERT OR IGNORE 保证重复导入不会重复插入相同 ID。

INSERT OR IGNORE INTO questions
(id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
('sg-practice-0041','exam-sg','リスク管理','intermediate','single_choice','リスク対応のうち、保険への加入によって損失の影響を第三者に移す方法はどれか。','[{"id":"a","text":"リスク回避"},{"id":"b","text":"リスク低減"},{"id":"c","text":"リスク移転"},{"id":"d","text":"リスク保有"}]','"c"','正解は C。保険や契約などでリスクの経済的影響を他者へ移す方法はリスク移転。発生可能性や影響を下げるのはリスク低減、対策せず受容するのはリスク保有。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0042','exam-sg','アクセス制御','standard','single_choice','退職した従業員のアカウントに対する対応として最も適切なものはどれか。','[{"id":"a","text":"監査のため永久に有効にする"},{"id":"b","text":"退職手続に合わせて速やかに無効化し、関連する認証情報も確認する"},{"id":"c","text":"パスワードだけを変更してアカウントを共有する"},{"id":"d","text":"本人から依頼があるまで放置する"}]','"b"','正解は B。退職・異動に伴いアカウントや権限を速やかに見直す。共有アカウントを避け、APIキーやトークンなど関連する認証情報も必要に応じて失効させる。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0043','exam-sg','暗号技術','intermediate','single_choice','公開鍵暗号方式の説明として最も適切なものはどれか。','[{"id":"a","text":"暗号化と復号に必ず同じ秘密鍵だけを使う"},{"id":"b","text":"公開鍵と秘密鍵の鍵ペアを利用する"},{"id":"c","text":"鍵を使わず平文を変換する"},{"id":"d","text":"ハッシュ値から必ず元のデータを復元できる"}]','"b"','正解は B。公開鍵暗号は数学的に関連する公開鍵と秘密鍵を使う。共通鍵暗号は同じ秘密鍵を共有して使う。ハッシュは通常、復号して元データへ戻す方式ではない。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0044','exam-sg','ネットワークセキュリティ','standard','single_choice','HTTPS が主に提供する保護として最も適切なものはどれか。','[{"id":"a","text":"すべての端末からマルウェアを削除する"},{"id":"b","text":"通信経路上の盗聴や改ざんのリスクを低減し、サーバー認証を行う"},{"id":"c","text":"利用者に必ず最小権限を付与する"},{"id":"d","text":"サーバーのバックアップを自動的に保証する"}]','"b"','正解は B。HTTPS は TLS を利用して通信の機密性・完全性を保護し、証明書により接続先サーバーを認証する。端末感染やアプリの脆弱性など、すべての脅威を防ぐものではない。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0045','exam-sg','データベース','intermediate','single_choice','データベースの主キー（PRIMARY KEY）の役割として最も適切なものはどれか。','[{"id":"a","text":"各行を一意に識別する"},{"id":"b","text":"すべての列を暗号化する"},{"id":"c","text":"検索結果を必ず降順に並べる"},{"id":"d","text":"データのバックアップを作成する"}]','"a"','正解は A。主キーはテーブル内の各行を一意に識別し、NULL を許さない。暗号化、並び順、バックアップとは別の機能。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0046','exam-sg','システム開発管理','standard','single_choice','受入テストの主な目的はどれか。','[{"id":"a","text":"開発者のコーディング規約だけを確認する"},{"id":"b","text":"利用者や発注者の要求を満たしているか確認する"},{"id":"c","text":"本番ログをすべて削除する"},{"id":"d","text":"ネットワーク機器の製造番号を変更する"}]','"b"','正解は B。受入テストは利用者・発注者の要求や業務要件を満たしているか確認し、受け入れ可否を判断する。単体テストや結合テストとは目的が異なる。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0047','exam-sg','インシデント対応','intermediate','single_choice','セキュリティインシデントの初動対応で、証拠保全が重要な理由はどれか。','[{"id":"a","text":"調査や原因分析、再発防止の根拠を残すため"},{"id":"b","text":"システムを必ず停止したままにするため"},{"id":"c","text":"すべてのログを自由に編集できるようにするため"},{"id":"d","text":"報告手順を省略するため"}]','"a"','正解は A。ログや関連データを適切に保全すると、影響範囲・原因・対応経緯の調査や再発防止に役立つ。保全方法は組織の手順と法的要件に従う。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0048','exam-sg','個人情報保護','standard','single_choice','テスト環境で実在の顧客データを使う必要がある場合、最も適切な考え方はどれか。','[{"id":"a","text":"開発者全員へ無制限に共有する"},{"id":"b","text":"必要性を評価し、可能なら匿名化・マスキングし、アクセスを制限する"},{"id":"c","text":"公開リポジトリに保存する"},{"id":"d","text":"本番と同じ権限をすべてのテスト担当者に付与する"}]','"b"','正解は B。テストデータは可能な限り合成データや匿名化・マスキングしたデータを使い、必要性、利用目的、アクセス権、保管期間を管理する。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0049','exam-sg','クラウドサービス管理','intermediate','single_choice','クラウドサービス利用時の責任共有モデルについて正しい説明はどれか。','[{"id":"a","text":"クラウド事業者が利用者側の設定ミスもすべて責任を負う"},{"id":"b","text":"事業者と利用者の責任範囲はサービス形態や契約によって異なる"},{"id":"c","text":"クラウドを使えばアクセス管理は不要になる"},{"id":"d","text":"利用者はデータ保護について何も確認しなくてよい"}]','"b"','正解は B。責任範囲は IaaS、PaaS、SaaS などのサービス形態や契約により異なる。利用者側のID管理、データ分類、設定、利用ルールなどの責任が残る場合が多い。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0050','exam-sg','事業継続管理','intermediate','single_choice','BCP（事業継続計画）の主な目的はどれか。','[{"id":"a","text":"障害や災害時にも重要業務を継続または早期復旧できるようにする"},{"id":"b","text":"すべての業務を永久に停止する"},{"id":"c","text":"通常時の監査を不要にする"},{"id":"d","text":"すべてのリスクをゼロにする"}]','"a"','正解は A。BCP は災害や重大障害などの際に重要業務を継続し、許容される時間内に復旧するための計画。すべてのリスクをゼロにするものではない。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0051','exam-sg','ソフトウェア更新管理','standard','single_choice','セキュリティパッチを適用する際の進め方として最も適切なものはどれか。','[{"id":"a","text":"影響評価や検証を一切行わず全環境へ適用する"},{"id":"b","text":"優先度と影響を評価し、検証・承認・適用後確認を行う"},{"id":"c","text":"更新履歴を削除する"},{"id":"d","text":"パッチの出所を確認せず実行する"}]','"b"','正解は B。脆弱性の深刻度や公開状況、システム影響を踏まえ、検証・承認・適用・結果確認・記録を行う。緊急時も定められた緊急変更手順を利用する。','generated','知学 SG 自编练习 v4','ja'),
('sg-practice-0052','exam-sg','委託先管理','intermediate','single_choice','外部委託先で情報漏えいが発生したと連絡を受けた場合、委託元の対応として最も適切なものはどれか。','[{"id":"a","text":"契約があるので対応を委託先だけに任せる"},{"id":"b","text":"定められた報告・連携手順に従い、影響と事実を確認して必要な対応を進める"},{"id":"c","text":"事実確認前に顧客データを公開する"},{"id":"d","text":"委託先との記録をすべて削除する"}]','"b"','正解は B。委託元は契約・法令・組織手順に従い、委託先と連携して影響、対象情報、封じ込め、報告義務、再発防止を確認する。委託しても管理責任が自動的に消えるわけではない。','generated','知学 SG 自编练习 v4','ja');

INSERT OR IGNORE INTO vocabulary
(id, term, language, reading, meaning_zh, meaning_ja, meaning_en, example, source_module, mastery)
VALUES
('vocab-it-risk-transfer','リスク移転','ja','りすくいてん','风险转移：通过保险或合同转移部分损失影响。','保険や契約などによってリスクの経済的影響を他者へ移すこと。','Risk transfer: shifting some financial impact of a risk to another party.','保険への加入はリスク移転の一例である。','リスク管理',0),
('vocab-it-risk-avoidance','リスク回避','ja','りすくかいひ','风险规避：不开展会产生该风险的活动。','リスクの原因となる活動を開始しない、または中止すること。','Risk avoidance: choosing not to start or continue an activity that creates a risk.','危険性が高すぎる機能の提供を見送る。','リスク管理',0),
('vocab-it-risk-mitigation','リスク低減','ja','りすくていげん','风险降低：降低风险发生概率或影响。','対策によってリスクの発生可能性や影響を小さくすること。','Risk mitigation: reducing the likelihood or impact of a risk.','多要素認証で不正ログインのリスクを低減する。','リスク管理',0),
('vocab-it-risk-acceptance','リスク保有','ja','りすくほゆう','风险接受：在评估后接受剩余风险。','リスクを評価したうえで、追加対策を行わず受け入れること。','Risk acceptance: knowingly retaining a risk after evaluation.','残留リスクを承認者が確認して受容する。','リスク管理',0),
('vocab-it-public-key','公開鍵','ja','こうかいかぎ','公钥：可公开分发的非对称密码密钥。','公開鍵暗号方式で公開して利用する鍵。','Public key: the shareable key in an asymmetric cryptographic key pair.','公開鍵で署名を検証する。','暗号技術',0),
('vocab-it-private-key','秘密鍵','ja','ひみつかぎ','私钥：必须由持有人妥善保管的非对称密钥。','公開鍵と対になる、秘密に管理する鍵。','Private key: the confidential key paired with a public key.','秘密鍵を安全な場所で管理する。','暗号技術',0),
('vocab-it-tls','TLS','en','','传输层安全协议：保护网络通信的加密协议。','通信経路上の機密性と完全性などを保護するプロトコル。','Transport Layer Security protects communications in transit.','HTTPS は TLS を利用して通信を保護する。','ネットワークセキュリティ',0),
('vocab-it-certificate','デジタル証明書','ja','でじたるしょうめいしょ','数字证书：将公钥与主体身份等信息关联起来的电子凭证。','公開鍵と主体の情報を結び付け、認証局などが発行する電子的な証明書。','Digital certificate: an electronic credential binding a public key to an identity.','証明書の有効期限と発行者を確認する。','暗号技術',0),
('vocab-it-primary-key','主キー','ja','しゅきー','主键：唯一标识数据库表中每一行的字段或字段组合。','テーブルの各行を一意に識別するための列または列の組合せ。','Primary key: a column or set of columns that uniquely identifies each row.','顧客IDを主キーとして設定する。','データベース',0),
('vocab-it-foreign-key','外部キー','ja','がいぶきー','外键：用于关联表并维护引用完整性的字段。','別のテーブルのキーを参照し、表間の関係を表すキー。','Foreign key: a key that references another table and helps enforce referential integrity.','注文テーブルに顧客IDの外部キーを設定する。','データベース',0),
('vocab-it-transaction','トランザクション','ja','とらんざくしょん','事务：作为一个整体提交或回滚的一组数据库操作。','一連の処理をひとまとまりとして実行する単位。','Transaction: a group of operations treated as one unit of work.','更新処理を一つのトランザクションで実行する。','データベース',0),
('vocab-it-atomicity','原子性','ja','げんしせい','原子性：事务要么全部成功，要么整体撤销。','トランザクションの処理がすべて実行されるか、全体が取り消される性質。','Atomicity: a transaction completes entirely or has no effect.','途中で失敗した場合はトランザクションをロールバックする。','データベース',0),
('vocab-it-xss','クロスサイトスクリプティング','ja','くろすさいとすくりぷてぃんぐ','跨站脚本攻击：利用网页输出执行攻击者控制的脚本。','Webページに不正なスクリプトを実行させる攻撃。','Cross-site scripting (XSS): injecting script that executes in a victim’s browser.','出力エンコードでXSSのリスクを低減する。','アプリケーションセキュリティ',0),
('vocab-it-sql-injection','SQLインジェクション','ja','えすきゅーえるいんじぇくしょん','SQL 注入：通过恶意输入改变 SQL 查询的结构或逻辑。','入力値を悪用してSQL文の構造や動作を変える攻撃。','SQL injection manipulates SQL statements through crafted input.','プレースホルダーを使ってSQLインジェクションを防ぐ。','アプリケーションセキュリティ',0),
('vocab-it-acceptance-test','受入テスト','ja','うけいれてすと','验收测试：确认系统是否满足用户或委托方的要求。','利用者や発注者の要求を満たしているか確認するテスト。','Acceptance testing checks whether a system meets user or customer requirements.','受入テストで業務要件を確認する。','システム開発',0),
('vocab-it-bcp','事業継続計画','ja','じぎょうけいぞくけいかく','业务连续性计划：重大中断时维持或尽快恢复重要业务的计划。','災害や重大障害時に重要業務を継続・復旧するための計画。','Business continuity plan: a plan to sustain or restore critical operations after disruption.','BCPに基づいて復旧訓練を行う。','事業継続',0),
('vocab-it-shared-responsibility','責任共有モデル','ja','せきにんきょうゆうもでる','责任共担模型：云服务商与客户按服务形态分担安全责任。','クラウド事業者と利用者がサービス形態に応じて責任を分担する考え方。','Shared responsibility model: cloud provider and customer responsibilities vary by service.','SaaSでも利用者側のID管理責任は残る。','クラウド',0),
('vocab-it-data-masking','データマスキング','ja','でーたますきんぐ','数据脱敏/掩码：隐藏或替换敏感数据的部分内容。','機密情報の一部を置換・隠蔽し、実値が分からないようにすること。','Data masking obscures sensitive values for safer use.','テスト用データにマスキングを適用する。','個人情報保護',0),
('vocab-it-patch-management','パッチ管理','ja','ぱっちかんり','补丁管理：评估、测试、部署并记录软件更新的流程。','更新プログラムの評価・検証・適用・記録を管理すること。','Patch management is the process of evaluating, testing, deploying and tracking updates.','パッチ管理台帳に適用状況を記録する。','脆弱性管理',0),
('vocab-it-rto','目標復旧時間','ja','もくひょうふっきゅうじかん','RTO：业务中断后目标恢复服务的时间。','障害発生後、目標とする時間内に業務やシステムを復旧させる指標。','Recovery time objective: the target time to restore a service after disruption.','重要システムのRTOを定める。','事業継続',0),
('vocab-it-rpo','目標復旧時点','ja','もくひょうふっきゅうじてん','RPO：恢复时允许丢失数据的时间范围。','復旧時にどの時点までのデータを戻す必要があるかを示す指標。','Recovery point objective: the acceptable data-loss window measured in time.','RPOを短くするにはバックアップや複製の頻度を検討する。','事業継続',0);

INSERT OR IGNORE INTO language_cards
(id,language,category,term,reading,meaning_zh,explanation,example,example_meaning_zh,source_type)
VALUES
('ja-work-008','ja','职场与商务语言','影響範囲を確認します','えいきょうはんいをかくにんします','我会确认影响范围。','排查故障、需求变更或发布风险时很常用。','まず影響範囲を確認してから対応します。','我会先确认影响范围再处理。','generated'),
('ja-work-009','ja','职场与商务语言','切り戻し手順を用意します','きりもどしてじゅんをよういします','我会准备回滚步骤。','技术会议中说明变更风险控制，切り戻し指回退到变更前状态。','リリース前に切り戻し手順を用意します。','发布前我会准备回滚步骤。','generated'),
('ja-work-010','ja','职场与商务语言','再現手順を教えていただけますか','さいげんてじゅんをおしえていただけますか','可以告诉我复现步骤吗？','用于排查 Bug 时向报告问题的人礼貌地询问。','不具合の再現手順を教えていただけますか。','可以告诉我这个故障的复现步骤吗？','generated'),
('ja-work-011','ja','职场与商务语言','暫定対応を行います','ざんていたいおうをおこないます','我会先采取临时措施。','表示先缓解影响，后续仍需进行根本原因分析和永久修复。','原因調査と並行して暫定対応を行います。','我会在调查原因的同时先采取临时措施。','generated'),
('ja-work-012','ja','职场与商务语言','認識合わせをお願いします','にんしきあわせをおねがいします','请大家对齐一下理解。','项目沟通中用于确认需求、范围、负责人和截止日期是否一致。','作業範囲について認識合わせをお願いします。','请大家对齐一下工作范围的理解。','generated'),
('ja-grammar-004','ja','词汇与语法','〜ておきます','〜ておきます','事先做好……；先……以备后用。','表示为了之后的事情预先采取行动，也可表示暂时保持某状态。','会議の前に資料を確認しておきます。','我会在会议前先确认资料。','generated'),
('ja-grammar-005','ja','词汇与语法','〜わけではありません','〜わけではありません','并不是说……；并非完全……。','用于部分否定或纠正误解，语气比直接否定更委婉。','すべての問題が解決したわけではありません。','并不是所有问题都解决了。','generated'),
('en-work-007','en','职场与商务语言','Let me confirm the scope.','','我确认一下范围。','适合开始任务前核对需求边界，避免默认假设。','Let me confirm the scope before I start coding.','我开始编码前先确认一下范围。','generated'),
('en-work-008','en','职场与商务语言','We need a rollback plan.','','我们需要一个回滚方案。','用于发布、数据库迁移或配置变更前讨论风险控制。','We need a rollback plan before deploying this change.','部署这项变更前，我们需要一个回滚方案。','generated'),
('en-work-009','en','职场与商务语言','Could you share the reproduction steps?','','可以分享一下复现步骤吗？','Bug 排查时常用，reproduction steps 指能稳定复现问题的操作步骤。','Could you share the reproduction steps and the error message?','可以分享一下复现步骤和错误信息吗？','generated'),
('en-work-010','en','职场与商务语言','I will follow up on this.','','我会继续跟进这件事。','表示后续会追踪状态或补充信息，不一定表示马上解决。','I will follow up on this after the meeting.','会议结束后我会继续跟进这件事。','generated'),
('en-grammar-003','en','词汇与语法','It depends on ...','','这取决于……','用于说明答案受条件影响，适合技术讨论中补充上下文。','It depends on the deployment environment.','这取决于部署环境。','generated');
