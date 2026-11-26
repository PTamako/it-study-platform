# 知学生产运维审查 — 2026-11-26

Baseline: main `7276edb7decfc21e0670f60896b9913f6e77fe79`, production release 45101237302 (2026-11-23 JST), D1 read-only snapshot 2026-11-26 JST.

## Production inventory

| Track | A | B | Total | Official label | Licensed label | Generated |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| SG | 1099 | 300 | 1399 | 448 | 0 | 951 |
| FE | 1284 | 1140 | 2424 | 116 | 778 | 1530 |

Labels are database categories, not independent licensing verification. FE total target 3000: gap 576; official-source coverage is tracked separately. FE exemption occurrence mapping: 712/960 slots, 616 distinct canonical IDs; FY2020 226/320, FY2021 319/320, FY2022 167/320. 2021-07-25 has 79/80; 2023-01-22 has no mapped slots. Do not create unverified questions to meet a numeric target. 

Read-only checks: full question-integrity SQL invalid_count=0; mock pool orphan/missing/mismatched rows=0; foreign key check=0; FE identical trimmed prompts=0. SG identical trimmed prompt group: sg-official-h29a-2017-q31 and sg-official-r06-2024-q07, same correct option c and substantively equivalent options. Preserve both official source occurrences and IDs; no destructive dedup or prompt alteration. This is a content review finding, not a data corruption finding. Latest 200 FE B tracing items were recomputed with the existing trace evaluator against actual production rows: 200 checked, 0 failures; no claim of independent validation of the entire FE corpus.

D1: 35,262,464 bytes, 56 reported tables, 217 migration records through 0221. Language cards: JA 8087, EN 8083 (D1 counts, not static corpus counts). One active linked owner. Legacy approval execution intentionally retired; signed direct personal study sync remains the desired architecture. This release fixes concurrent conflicting sentence replay without changing existing rows or migration history.

## Release and acceptance
- Production only; no Preview resource or URLs. Existing manual release workflow, recovery bookmark, full local migration, regression tests, exact SHA check and post-deployment health checks remain mandatory.
- Latest previous deployment succeeded; do not confuse it with verification of a new commit.
- True iPhone/iPad TTS, Pencil, two-device offline sync and signed document assistant E2E remain pending real device/session evidence.
- Cloudflare detected active issue list was empty. Billing usage endpoint returned 403 (Billing Read absent); no claim of zero cost or free-quota headroom. Review actual D1/AI usage separately.
- Repository protection is explicitly outside the requested remediation scope; no settings or approval gates changed.
- No direct production data mutation as part of the review. Preserve study history.
