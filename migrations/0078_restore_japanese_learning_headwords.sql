-- Restore Japanese source-language headwords for the seeded Japanese learning cards.
-- Some existing D1 rows may have been created with Chinese text in term; keep Chinese in meaning_zh.
UPDATE language_cards SET term = 'もう一度お願いします。', reading = 'もういちど おねがいします'
WHERE id = 'ja-daily-01' AND language = 'ja';
UPDATE language_cards SET term = 'ちょっと聞いてもいいですか。', reading = 'ちょっと きいても いいですか'
WHERE id = 'ja-daily-02' AND language = 'ja';
UPDATE language_cards SET term = '大丈夫です。', reading = 'だいじょうぶです'
WHERE id = 'ja-daily-03' AND language = 'ja';
UPDATE language_cards SET term = '確認してから、ご連絡します。', reading = 'かくにんしてから、ごれんらくします'
WHERE id = 'ja-work-01' AND language = 'ja';
UPDATE language_cards SET term = '承知しました。', reading = 'しょうちしました'
WHERE id = 'ja-work-02' AND language = 'ja';
UPDATE language_cards SET term = '念のため確認させてください。', reading = 'ねんのため かくにんさせてください'
WHERE id = 'ja-work-03' AND language = 'ja';
UPDATE language_cards SET term = '〜かもしれません', reading = '〜かもしれません'
WHERE id = 'ja-grammar-01' AND language = 'ja';
UPDATE language_cards SET term = '〜ことになっています', reading = '〜ことになっています'
WHERE id = 'ja-grammar-02' AND language = 'ja';
UPDATE language_cards SET term = '影響範囲を確認します', reading = 'えいきょうはんいをかくにんします'
WHERE id = 'ja-work-008' AND language = 'ja';
UPDATE language_cards SET term = '切り戻し手順を用意します', reading = 'きりもどしじゅんをよういします'
WHERE id = 'ja-work-009' AND language = 'ja';
UPDATE language_cards SET term = '再現手順を教えていただけますか', reading = 'さいげんてじゅんをおしえていただけますか'
WHERE id = 'ja-work-010' AND language = 'ja';
UPDATE language_cards SET term = '暫定対応を行います', reading = 'ざんていたいおうをおこないます'
WHERE id = 'ja-work-011' AND language = 'ja';
UPDATE language_cards SET term = '認識合わせをお願いします', reading = 'にんしきあわせをおねがいします'
WHERE id = 'ja-work-012' AND language = 'ja';
UPDATE language_cards SET term = '〜ておきます', reading = '〜ておきます'
WHERE id = 'ja-grammar-004' AND language = 'ja';
UPDATE language_cards SET term = '〜わけではありません', reading = '〜わけではありません'
WHERE id = 'ja-grammar-005' AND language = 'ja';
