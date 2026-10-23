-- Add one original SG practice question to complete the current prediction-question target.
-- This is platform-authored content, not an official past question.
INSERT OR IGNORE INTO questions
  (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
('sg-pred-bulk-452','exam-sg','認証・パスワード管理','standard','single_choice',
 '社内システムでパスワードの保存方式を見直している。漏えい時に元のパスワードを復元されにくくする保存方法として，最も適切なものはどれか。',
 '[{"id":"a","text":"パスワードを可逆暗号化し，復号鍵を同じデータベースに保存する"},{"id":"b","text":"ソルトを付与し，計算コストの高いパスワードハッシュ関数で検証用値を保存する"},{"id":"c","text":"パスワードをBase64でエンコードして保存する"},{"id":"d","text":"パスワードを平文で保存し，データベースへのアクセスを制限する"}]',
 '"b',
 'パスワードはソルト付きの専用ハッシュ（例：Argon2id、scrypt、bcrypt、PBKDF2）で保存する。Base64は暗号化ではなく，単純なエンコードである。可逆暗号化や平文保存は，データベース侵害時のリスクを高める。',
 'generated',NULL,'ja');
