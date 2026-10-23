# SG official past-question expansion: 2016–2017

This batch adds 143 distinct SG morning-exam past questions with stable IDs, four choices, answer keys, short explanations, and the official IPA question-paper URL in `source_reference`.

## Added migrations

- `0055`–`0059`: 2017 spring, questions 1–42 and 44–50. Question 43 is intentionally omitted because it depends on an arrow-network diagram that has not yet been represented faithfully.
- `0060`–`0064`: 2016 autumn, questions 1–50.
- `0065`–`0069`: 2016 spring, questions 1–44.

## Count target

The current historical-question count reported by the platform is 305. This batch contributes 49 + 50 + 44 = 143 unique IDs, so the expected count after applying all pending migrations is 448. The live D1 count must still be checked after the remote migrations run; this document does not claim that production D1 has already been updated.

## Verification checklist

1. Apply pending migrations in order with the existing D1 migration workflow.
2. Confirm that the official-question count increases by 143, from 305 to 448.
3. Check that every added record has `source_type='official'`, a stable ID, four options, an answer, an explanation, and an IPA source URL.
4. Spot-check answer keys against the official IPA answer-key PDFs for each sitting.
5. Test the question list and practice flow on mobile Safari.
6. Keep question 43 out of the count until its diagram can be reproduced accessibly and accurately.

IPA's past-question page states that permission or a usage fee is not required for use of questions published by IPA, subject to its stated conditions: https://www.ipa.go.jp/shiken/mondai-kaiotu/index.html
