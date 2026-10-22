-- 常用英文安全缩写与技术别名，使英文查询也能精确命中 D1 专业词库。
INSERT OR IGNORE INTO vocabulary
(id, term, language, reading, meaning_zh, meaning_ja, meaning_en, example, source_module, mastery)
VALUES
('vocab-it-mfa-abbreviation','MFA','en','エムエフエー','多因素认证：使用两种或以上不同类别的验证要素。','多要素認証：異なる種類の認証要素を組み合わせて本人確認を行うこと。','MFA (multi-factor authentication): verifying identity with multiple different factor types.','Enable MFA for accounts that support it.','Information security acronym',0),
('vocab-it-2fa-abbreviation','2FA','en','ツーエフエー','双因素认证：使用两个不同类别的验证要素。','二要素認証：異なる二つの認証要素を用いて本人確認を行うこと。','2FA (two-factor authentication): verifying identity with two different factor types.','Use an authenticator app as one factor in 2FA.','Information security acronym',0),
('vocab-it-sql-injection-en','SQL injection','en','','SQL 注入：将恶意 SQL 片段注入到应用查询中的攻击。','SQLインジェクション：入力値を悪用してSQL文を不正に実行させる攻撃。','SQL injection: an attack that manipulates SQL statements through crafted input.','Parameterized queries help prevent SQL injection.','Application security term',0);
