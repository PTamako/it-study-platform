# FY2019 春期 FE 旧制度午前・追加13問（問28～40）

2026-11-03 に IPA の正式公開PDFの設問ページと解答PDFを突き合わせ、**学習用に独自に書き直した**13問を増分取り込みする。2020～22 の非公開 CBT 問題ではなく、現行 CBT 科目Aの実際の本試験問題とも表示しない。

- [原題 PDF（IPA）](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_qs.pdf)、原題 PDF 表示上のページ14～18（PDF 0-based pages 13～17）
- [解答 PDF（IPA）](https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt8000000ddiw-att/2019h31h_fe_am_ans.pdf)
- 対応：28 イ、29 ウ、30 エ、31 ア、32 エ、33 エ、34 ア、35 ウ、36 ア、37 ウ、38 ア、39 ア、40 ア
- `source_type=licensed` / `exam_section=A` / `exam_section_method=explicit`
- 安定ID：`fe-ipa-2019-spring-am-adapt-28` ～ `-40`
- 原表や図の設問28/29は列集合・結合条件と学生/学部の対応を**解答が変わらないように全文字化**した。問32 の CIDR /23 は 510 ホスト、問34 の TCP port は戻り時 80→50001 を独立に検算した
- 出題数を増やすために IPA 以外の未検証の設問を作らない。公式に記載された題号のみ保存する

`scripts/data/fe-ipa-2019-spring-28-40-reviewed.json` から CI 内で `0129_fe_ipa_2019_spring_am_28_40.sql` を生成する。旧問題IDへの `UPDATE`、`DELETE` は一切実行しない。`INSERT OR IGNORE` の再実行、学習履歴の保持、正解・出典・図表を文字化した条件の妥当性はテスト済みでなければ合併しない。

**範囲外**：2019春期問41～80、秋期未収録問題、SG旧午後。これらは引き続き #84 で原典確認し、実際に復習可能な設問だけを数える。
