PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS language_cards (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('ja', 'en')),
  category TEXT NOT NULL,
  term TEXT NOT NULL,
  reading TEXT NOT NULL DEFAULT '',
  meaning_zh TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL,
  example_meaning_zh TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'authored',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_language_cards_lang_category ON language_cards(language, category);

CREATE TABLE IF NOT EXISTS practical_scenarios (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'standard',
  situation TEXT NOT NULL,
  task TEXT NOT NULL,
  options_json TEXT NOT NULL,
  best_option TEXT NOT NULL,
  scoring_json TEXT NOT NULL,
  explanation TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'authored',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES study_tracks(id)
);
CREATE INDEX IF NOT EXISTS idx_scenarios_track ON practical_scenarios(track_id, category);

CREATE TABLE IF NOT EXISTS scenario_attempts (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  selected_option TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  feedback TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scenario_id) REFERENCES practical_scenarios(id),
  FOREIGN KEY (track_id) REFERENCES study_tracks(id)
);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_date ON scenario_attempts(answered_at);

-- 课程卡片为平台编写的学习材料，不冒充教材原文或官方题目。
INSERT OR IGNORE INTO language_cards
(id, language, category, term, reading, meaning_zh, explanation, example, example_meaning_zh, source_type)
VALUES
('ja-work-001','ja','职场与商务语言','確認いたします','かくにんいたします','我会确认。','比「確認します」更郑重，适合工作沟通中回应对方。','内容を確認いたします。','我会确认一下内容。','authored'),
('ja-work-002','ja','职场与商务语言','お手数をおかけします','おてすうをおかけします','给您添麻烦了。','请求对方协助或花费时间时使用的礼貌表达。','お手数をおかけしますが、ご確認をお願いいたします。','麻烦您确认一下。','authored'),
('ja-daily-001','ja','日常与情景会话','少々お待ちください','しょうしょうおまちください','请稍等。','店铺、电话或工作场景都常见；比「ちょっと待って」礼貌。','担当者に確認しますので、少々お待ちください。','我向负责人确认一下，请稍等。','authored'),
('ja-grammar-001','ja','词汇与语法','〜ことになりました','〜ことになりました','决定了……；安排为……','常用于说明经过协商、组织安排或外部因素而确定的事项。','来月から新しいプロジェクトを担当することになりました。','我从下个月开始负责一个新项目。','authored'),
('ja-work-003','ja','职场与商务语言','認識を合わせる','にんしきをあわせる','统一认识、对齐理解。','项目会议中用于确认大家对需求、范围或进度的理解一致。','実装前に仕様について認識を合わせましょう。','实现前先统一一下对规格的理解吧。','authored'),
('en-work-001','en','职场与商务语言','Let me double-check.','','我再确认一下。','自然且礼貌的职场表达，可用于需要核实信息时。','Let me double-check the requirements before I reply.','回复前我先核对一下需求。','authored'),
('en-work-002','en','职场与商务语言','Could you clarify that?','','你能再说明清楚一点吗？','比直接说“What?”更适合会议和工作沟通。','Could you clarify what you mean by “scope”?','你能解释一下你说的“范围”是什么意思吗？','authored'),
('en-daily-001','en','日常与情景会话','That works for me.','','我觉得可以；这个安排适合我。','用于接受提议的时间、计划或方案。','Tuesday afternoon works for me.','周二下午我可以。','authored'),
('en-grammar-001','en','词汇与语法','I’m used to + noun / -ing','','我已经习惯……','be used to 后面接名词或动名词；不要与 used to do（过去常做）混淆。','I’m used to working with SQL Server.','我已经习惯使用 SQL Server 工作了。','authored'),
('en-work-003','en','职场与商务语言','I’ll keep you posted.','','有进展我会及时告诉你。','适合向同事或客户承诺后续同步进度。','I’ll keep you posted on the deployment status.','我会及时同步部署状态。','authored');

INSERT OR IGNORE INTO vocabulary
(id, term, language, reading, meaning_zh, meaning_ja, meaning_en, example, source_module)
VALUES
('it-auth-001','認証','ja','にんしょう','认证：确认用户身份。','利用者本人であることを確認すること。','Authentication: verifying an identity.','ログイン時にパスワードで認証する。','security'),
('it-auth-002','認可','ja','にんか','授权：决定用户可以访问什么。','利用者に許可する操作や範囲を決めること。','Authorization: deciding permitted actions and resources.','一般ユーザーには管理画面へのアクセスを認可しない。','security'),
('it-auth-003','多要素認証','ja','たようそにんしょう','多因素认证：组合不同类别的验证因素。','異なる種類の認証要素を組み合わせる方式。','Multi-factor authentication (MFA).','管理者アカウントには多要素認証を必須にする。','security'),
('it-hash-001','パスワードハッシュ','ja','ぱすわーどはっしゅ','密码哈希：使用专用哈希算法保存密码校验值。','パスワードを専用のハッシュ関数で一方向に変換した値。','Password hash: a one-way password verifier.','パスワードはソルトと適切なハッシュ関数を使って保存する。','security'),
('it-sql-001','インデックス','ja','いんでっくす','索引：帮助数据库更快定位记录的数据结构。','検索対象の行を効率よく見つけるためのデータ構造。','Index: a data structure that speeds up data retrieval.','検索条件に合うインデックスがあるか実行計画で確認する。','database'),
('it-sql-002','実行計画','ja','じっこうけいかく','执行计划：数据库执行 SQL 的操作步骤与顺序。','SQLを実行する際の処理手順を示す計画。','Execution plan: the database operations chosen for a query.','実行計画を確認して全表走査の原因を調べる。','database'),
('it-net-001','ファイアウォール','ja','ふぁいあうぉーる','防火墙：根据规则控制网络流量。','ルールに基づいてネットワーク通信を制御する仕組み。','Firewall: filters network traffic according to rules.','必要なポートだけをファイアウォールで許可する。','network'),
('it-dev-001','デプロイ','ja','でぷろい','部署：将应用或版本发布到目标环境。','アプリケーションを実行環境へ配置・公開すること。','Deploy: release an application to an environment.','変更をテスト環境へデプロイして動作を確認する。','development'),
('it-dev-002','ロールバック','ja','ろーるばっく','回滚：出现问题时恢复到先前版本或状态。','問題発生時に以前のバージョンや状態へ戻すこと。','Rollback: revert to a previous version or state.','障害が発生したため直前のリリースにロールバックした。','development');

-- 实战任务为自编情境练习，评分规则明确且保存在数据库。
INSERT OR IGNORE INTO practical_scenarios
(id, track_id, title, category, difficulty, situation, task, options_json, best_option, scoring_json, explanation, source_type)
VALUES
('sg-scenario-phishing-001','exam-sg','识别可疑邮件并上报','事件响应','standard',
 '你收到一封看似来自公司 IT 部门的邮件，要求在 30 分钟内点击链接并输入公司密码，否则账号会被冻结。发件人地址与公司域名只有一个字母不同。',
 '你应该优先采取哪项行动？',
 '[{"id":"a","text":"点击链接登录，避免账号被冻结"},{"id":"b","text":"不点击链接，通过公司已知的官方渠道核实并按流程报告可疑邮件"},{"id":"c","text":"把邮件转发给所有同事提醒大家"},{"id":"d","text":"直接删除邮件，不向任何人报告"}]',
 'b','{"a":0,"b":100,"c":35,"d":55}',
 '最优做法是不要点击链接或输入凭据，使用已知可信的 IT 联系方式独立核实，并按组织流程报告。转发可能扩大风险；单纯删除可能失去调查所需证据。',
 'authored'),
('sg-scenario-access-001','exam-sg','为新员工配置最小权限','访问控制','standard',
 '新员工需要查看项目工单并更新自己负责的工单，但不需要查看薪资资料，也不需要管理其他员工账号。',
 '哪种权限配置最符合最小权限原则？',
 '[{"id":"a","text":"授予管理员权限，方便以后处理问题"},{"id":"b","text":"授予所有项目的读写权限"},{"id":"c","text":"只授予完成当前职责所需的工单权限，并定期复核"},{"id":"d","text":"让员工共用主管账号"}]',
 'c','{"a":0,"b":30,"c":100,"d":0}',
 '最小权限原则要求只授予完成工作所需的权限，并在职责变化时复核。管理员权限、广泛读写权限和共享账号都会扩大风险并降低可追踪性。',
 'authored'),
('sg-scenario-incident-001','exam-sg','疑似数据泄露的第一步','事件响应','intermediate',
 '监控告警显示某账号在异常时间下载了大量客户资料。你是值班工程师，但尚未确认是否为真实攻击。',
 '以下哪项最适合作为初始处置？',
 '[{"id":"a","text":"删除相关日志，避免误报影响考核"},{"id":"b","text":"在社交媒体公布客户资料可能泄露"},{"id":"c","text":"依照事件响应流程上报，保全日志和相关证据，并由授权人员评估遏制措施"},{"id":"d","text":"完全不处理，等待用户投诉"}]',
 'c','{"a":0,"b":0,"c":100,"d":0}',
 '应遵循既定事件响应流程，及时上报并保全日志与证据；遏制措施应由授权人员依据风险实施。既不能破坏证据，也不能未经授权公开敏感信息。',
 'authored'),
('sg-scenario-change-001','exam-sg','生产环境发布前检查','变更管理','standard',
 '一个修复已在开发环境通过，但没有经过测试环境验证。产品负责人希望你马上发布到生产环境。',
 '最合适的处理方式是什么？',
 '[{"id":"a","text":"直接发布，因为开发环境已通过"},{"id":"b","text":"按变更流程完成必要测试、审批、备份与回滚准备后再发布"},{"id":"c","text":"请同事共用你的生产账号快速发布"},{"id":"d","text":"跳过记录，避免流程拖慢速度"}]',
 'b','{"a":25,"b":100,"c":0,"d":0}',
 '生产发布应遵循组织的变更管理要求，完成适当测试、审批、备份和回滚准备。紧急变更也应使用正式的紧急变更流程并补齐记录。',
 'authored');

-- 保留一组中日英 IT 术语，内容为平台编写的解释，不宣称是外部官方词典原文。
