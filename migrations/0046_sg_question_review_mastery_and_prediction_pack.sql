-- Per-question spaced repetition and mastery state for exam practice.
CREATE TABLE IF NOT EXISTS question_review_state (
  question_id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  correct_streak INTEGER NOT NULL DEFAULT 0 CHECK (correct_streak >= 0),
  last_result TEXT NOT NULL DEFAULT 'again' CHECK (last_result IN ('again', 'remembered')),
  next_review_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mastered INTEGER NOT NULL DEFAULT 0 CHECK (mastered IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES study_tracks(id)
);
CREATE INDEX IF NOT EXISTS idx_question_review_due
  ON question_review_state(track_id, mastered, next_review_at);

-- Preserve the existing wrong-question history. Historical streaks cannot be reconstructed
-- reliably from timestamp ties, so legacy items start unmastered and get a safe review date.
INSERT OR IGNORE INTO question_review_state
  (question_id, track_id, review_count, correct_streak, last_result, next_review_at, mastered)
SELECT q.id, q.track_id, COUNT(a.id),
       CASE WHEN latest.is_correct = 1 THEN 1 ELSE 0 END,
       CASE WHEN latest.is_correct = 1 THEN 'remembered' ELSE 'again' END,
       CASE WHEN latest.is_correct = 1 THEN datetime('now', '+1 day') ELSE datetime('now') END,
       0
FROM questions q
JOIN study_attempts a ON a.question_id = q.id
JOIN study_attempts latest ON latest.id = (
  SELECT a2.id FROM study_attempts a2
  WHERE a2.question_id = q.id
  ORDER BY a2.answered_at DESC, a2.id DESC LIMIT 1
)
GROUP BY q.id;

-- Original SG prediction questions (not official past questions).
INSERT OR IGNORE INTO questions
  (id, track_id, topic, difficulty, question_type, prompt, options_json, answer_json, explanation, source_type, source_reference, language)
VALUES
('sg-pred-bulk-453','exam-sg','リスクマネジメント・残留リスク','standard','single_choice','情報セキュリティ対策を実施した後にも残るリスクの説明として，最も適切なものはどれか。','[{"id":"a","text":"対策によって完全に除去されたリスク"},{"id":"b","text":"対策後も許容または管理する必要があるリスク"},{"id":"c","text":"発生可能性を評価していないリスクだけ"},{"id":"d","text":"保険に加入した時点ですべて消滅するリスク"}]','"b"','残留リスクはリスク対応後にも残るリスクであり，受容する場合でも把握・管理し，必要に応じて経営者などが受容を判断する。','generated',NULL,'ja'),
('sg-pred-bulk-454','exam-sg','インシデント対応・証拠保全','standard','single_choice','マルウェア感染の疑いがある端末を発見した。初動として最も適切なものはどれか。','[{"id":"a","text":"ログを削除してから再起動する"},{"id":"b","text":"組織の手順に従い，影響範囲を考慮して隔離・報告し，証拠を保全する"},{"id":"c","text":"感染した可能性を社外SNSで公表する"},{"id":"d","text":"原因が分かるまで誰にも報告しない"}]','"b"','初動では定められた連絡体制に従って報告し，拡大防止のため適切に隔離しながら，ログなどの証拠を保全する。','generated',NULL,'ja'),
('sg-pred-bulk-455','exam-sg','アクセス制御・最小権限','standard','single_choice','業務アプリケーションの権限設計として，最小権限の原則に最も合致するものはどれか。','[{"id":"a","text":"全社員に管理者権限を付与する"},{"id":"b","text":"一度付与した権限は異動後も維持する"},{"id":"c","text":"業務に必要な範囲だけ権限を付与し，定期的に見直す"},{"id":"d","text":"監査を簡単にするため共有アカウントを使う"}]','"c"','最小権限では業務遂行に必要な範囲に権限を限定し，職務変更や退職時に適切に見直す。','generated',NULL,'ja'),
('sg-pred-bulk-456','exam-sg','暗号化・鍵管理','standard','single_choice','データベースのバックアップを暗号化する場合，特に重要な管理策はどれか。','[{"id":"a","text":"暗号鍵をバックアップと同じ場所に平文で保存する"},{"id":"b","text":"鍵へのアクセスを制限し，安全に保管・更新する"},{"id":"c","text":"鍵を全社員にメールで配布する"},{"id":"d","text":"暗号化済みなので復元試験は不要とする"}]','"b"','暗号化の安全性は鍵管理に大きく依存する。鍵とデータを同じ侵害範囲に置かず，アクセス制御や更新・復旧手順を整える。','generated',NULL,'ja'),
('sg-pred-bulk-457','exam-sg','脆弱性管理・パッチ適用','standard','single_choice','業務システムに重大な脆弱性が公表された。パッチ適用の判断として最も適切なものはどれか。','[{"id":"a","text":"影響評価をせず，すべての本番環境へ直ちに適用する"},{"id":"b","text":"リスクと影響を評価し，検証・変更管理を行って優先的に適用する"},{"id":"c","text":"障害が発生するまで何もしない"},{"id":"d","text":"脆弱性情報を削除すれば対策は不要である"}]','"b"','重大度，悪用状況，資産の重要性を評価し，テストと変更管理を経て優先的に適用する。緊急時も組織の緊急変更手順を用いる。','generated',NULL,'ja'),
('sg-pred-bulk-458','exam-sg','ログ管理・監査証跡','standard','single_choice','不正アクセスの調査に備えたログ管理として，最も適切なものはどれか。','[{"id":"a","text":"管理者が自由にログを書き換えられるようにする"},{"id":"b","text":"必要なログを定め，時刻を同期し，改ざんや不正閲覧を防いで保管する"},{"id":"c","text":"容量節約のため認証ログをすべて無効にする"},{"id":"d","text":"ログは調査時に初めて有効化する"}]','"b"','調査可能性を確保するには，必要なログを継続的に取得し，時刻同期，アクセス制御，改ざん防止，保管期間を設計する。','generated',NULL,'ja'),
('sg-pred-bulk-459','exam-sg','委託先管理・契約','standard','single_choice','個人情報を取り扱う業務を外部委託する場合，委託元の対応として最も適切なものはどれか。','[{"id":"a","text":"委託後は安全管理の確認を一切行わない"},{"id":"b","text":"契約で安全管理措置や事故報告を定め，委託先を適切に監督する"},{"id":"c","text":"委託先なら個人情報保護の責任をすべて負う"},{"id":"d","text":"委託先に全社員のアカウントを共有する"}]','"b"','委託元は委託先の選定，契約上の安全管理措置，取扱状況の把握などを通じて必要かつ適切に監督する。','generated',NULL,'ja'),
('sg-pred-bulk-460','exam-sg','事業継続・RTOとRPO','standard','single_choice','システム障害からの復旧計画において，RPOが表すものはどれか。','[{"id":"a","text":"復旧までに許容される最大停止時間"},{"id":"b","text":"復旧時点で許容されるデータ損失の時間幅"},{"id":"c","text":"年間に許容される障害回数"},{"id":"d","text":"バックアップの暗号鍵の有効期間"}]','"b"','RPO（目標復旧時点）は，障害発生時にどの時点までのデータを復旧できればよいかを示し，許容データ損失量を時間で表す。RTOは目標復旧時間である。','generated',NULL,'ja');
