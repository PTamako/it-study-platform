# SG official question-bank inventory and verification rules

Last reviewed: 2026-10-23

## Required final structure

- 448 verified official questions
- 652 original generated prediction questions
- 1,100 total
- Official and generated questions must remain separate in the UI and API.
- A question counts toward the official target only after the prompt/options and official answer key have been checked against the cited source. A URL alone is not a question.

## Official source inventory

### Legacy written exams: 8 sessions × 50 = 400

The IPA archive provides the official question booklet and answer examples for these SG sessions:

| Session | IPA archive page | Expected questions |
|---|---|---:|
| 2019 autumn (令和元年度 秋期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2019h31.html | 50 |
| 2019 spring (平成31年度 春期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2019h31.html | 50 |
| 2018 autumn (平成30年度 秋期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2018h30.html | 50 |
| 2018 spring (平成30年度 春期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2018h30.html | 50 |
| 2017 autumn (平成29年度 秋期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2017h29.html | 50 |
| 2017 spring (平成29年度 春期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2017h29.html | 50 |
| 2016 autumn (平成28年度 秋期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2016h28.html | 50 |
| 2016 spring (平成28年度 春期) | https://www.ipa.go.jp/shiken/mondai-kaiotu/2016h28.html | 50 |

These session pages include both spring and autumn exam material for the relevant year. Keep each question's exact session and question number in its stable ID and source metadata.

### CBT public questions: 4 papers × 12 text-reproducible questions = 48

IPA public papers are released from FY2023 onward, but each booklet includes diagrams/tables and some questions cannot be faithfully represented as plain text. The target of 48 counts only the 12 questions per year that can be reproduced accurately in this app's current question schema. Do not count all 15 records if three require missing figures or context.

- 2026 (令和8年度): https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/
- 2025 (令和7年度): https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/
- 2024 (令和6年度): https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/
- 2023 (令和5年度): https://www.ipa.go.jp/shiken/mondai-kaiotu/sg_fe/koukai/

IPA archive note: SG/FE exam questions for FY2020–FY2022 are not published on the official archive page. Do not invent or attribute questions from those years.

## Current work that must be audited

- Current migrations include 30 rows tagged as 2019 autumn morning questions. Verify all 30 against the official booklet and the official answer PDF; do not assume a comment in SQL is sufficient proof.
- Current migrations include 15 rows for each of the 2023–2026 public papers. Audit the official answer mapping and remove or exclude any item that cannot be reproduced accurately without a figure/table.
- The expected arithmetic after the audit is: 30 existing legacy rows + 20 remaining 2019 autumn questions + 7 other legacy sessions × 50 = 400 legacy questions; plus 48 text-reproducible CBT public questions = 448 official questions.
- Existing prediction migrations must also be counted from the actual database/migration inserts and deduplicated by stable question ID before planning the remaining amount toward exactly 652 generated questions.

## Verification checklist for each official row

1. Stable ID includes exam family, session/year, and original question number.
2. Japanese prompt and every option match the official question booklet; preserve necessary tables/figures or exclude the item from the text-only bank.
3. Answer matches the official IPA answer example.
4. source_type is official.
5. source_reference points directly to the official IPA question PDF (and the official answer PDF should be recorded in a comment or source metadata).
6. explanation is written as an original study explanation, not copied from a third-party site.
7. Check for duplicate IDs and duplicate prompts before counting the row toward 448.
8. Validate every migration on a disposable/local D1 before merge. Do not run production migrations or deploy as part of this PR.
