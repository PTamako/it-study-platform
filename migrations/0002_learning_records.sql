-- 学习计划、每日进度与考试练习记录。
-- 题目来源标记为 generated 的内容是练习题，不是官方真题。

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  track_id TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL DEFAULT 15 CHECK (planned_minutes BETWEEN 1 AND 1440),
  plan_date TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES study_tracks(id)
);

CREATE INDEX IF NOT EXISTS idx_study_plans_date ON study_plans(plan_date, completed_at);

CREATE TABLE IF NOT EXISTS daily_study_logs (
  id TEXT PRIMARY KEY,
  study_date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('exam', 'language', 'vocabulary', 'reading', 'other')),
  track_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES study_tracks(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_study_logs_date ON daily_study_logs(study_date);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  session_type TEXT NOT NULL DEFAULT 'practice' CHECK (session_type IN ('practice', 'mock', 'review')),
  FOREIGN KEY (track_id) REFERENCES study_tracks(id),
  CHECK (correct_count <= question_count)
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_track_date ON exam_sessions(track_id, started_at);

-- 第一批示范练习题：自编内容，仅用于验证答题流程，不是官方题库。
INSERT OR IGNORE INTO questions
  (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
  ('sg-gen-0001', 'exam-sg', '情報セキュリティの基本', 'standard', 'single_choice',
   '情報セキュリティの「機密性」を最も適切に説明しているものはどれか。',
   '[{"id":"a","text":"情報が正確で、改ざんされていないこと"},{"id":"b","text":"許可された者だけが情報にアクセスできること"},{"id":"c","text":"必要なときに情報を利用できること"},{"id":"d","text":"操作の記録を後から確認できること"}]',
   '"b"',
   '正解は B です。機密性（Confidentiality）は、許可された者だけが情報へアクセスできる性質です。A は完全性（Integrity）、C は可用性（Availability）を説明しています。D はログ管理・追跡可能性に関する説明です。',
   'generated', '平台自编练习题 v1', 'ja'),
  ('sg-gen-0002', 'exam-sg', '認証と認可', 'standard', 'single_choice',
   '「認可（Authorization）」の説明として、最も適切なものはどれか。',
   '[{"id":"a","text":"利用者が本人であることを確認すること"},{"id":"b","text":"通信内容を暗号化すること"},{"id":"c","text":"利用者が実行できる操作やアクセス範囲を決めること"},{"id":"d","text":"データのバックアップを作成すること"}]',
   '"c"',
   '正解は C です。認可（Authorization）は、利用者にどの操作・資源へのアクセスを許可するかを決めることです。A は認証（Authentication）です。暗号化とバックアップは別のセキュリティ対策です。',
   'generated', '平台自编练习题 v1', 'ja'),
  ('sg-gen-0003', 'exam-sg', '多要素認証', 'standard', 'single_choice',
   '多要素認証（MFA）として、最も適切な組合せはどれか。',
   '[{"id":"a","text":"パスワードと秘密の質問"},{"id":"b","text":"パスワードと、登録済み端末に届くワンタイムコード"},{"id":"c","text":"異なる二つのパスワード"},{"id":"d","text":"ユーザー ID とメールアドレス"}]',
   '"b"',
   '正解は B です。MFA は「知識情報」「所持情報」「生体情報」など、異なる要素の組合せを使います。パスワードと秘密の質問はいずれも知識情報に分類されることが多く、二つ使っても必ずしも多要素認証にはなりません。',
   'generated', '平台自编练习题 v1', 'ja'),
  ('sg-gen-0004', 'exam-sg', 'パスワード管理', 'standard', 'single_choice',
   'パスワードをデータベースに保存する方法として、最も適切なものはどれか。',
   '[{"id":"a","text":"平文のまま保存する"},{"id":"b","text":"復号可能な暗号化だけを行う"},{"id":"c","text":"ソルトを付け、適切なパスワードハッシュ関数で処理する"},{"id":"d","text":"すべての利用者に同じ固定ハッシュ値を設定する"}]',
   '"c"',
   '正解は C です。パスワードは平文保存せず、利用者ごとのソルトと Argon2id、scrypt、bcrypt などのパスワード向けハッシュ方式で保存します。ハッシュは通常、暗号化のように元へ戻すことを目的としていません。',
   'generated', '平台自编练习题 v1', 'ja'),
  ('sg-gen-0005', 'exam-sg', 'インシデント対応', 'standard', 'single_choice',
   '組織内で情報漏えいの疑いを発見した場合、最初の対応として最も適切なものはどれか。',
   '[{"id":"a","text":"証拠を消して通常業務を続ける"},{"id":"b","text":"定められた報告手順に従って速やかに報告し、証拠を保全する"},{"id":"c","text":"確認せずに SNS で詳細を公開する"},{"id":"d","text":"関係するシステムのログをすべて削除する"}]',
   '"b"',
   '正解は B です。組織のインシデント対応手順に従って報告し、ログなどの証拠を保全します。独断で情報を公開したり、証拠を削除したりしてはいけません。',
   'generated', '平台自编练习题 v1', 'ja');
