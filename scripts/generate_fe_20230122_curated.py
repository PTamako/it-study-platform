#!/usr/bin/env python3
"""Generate reviewed FE exemption questions; repeat sittings share canonical rows."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT / 'scripts/fe-20230122-curated.json').read_text())
question_url = 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_Mondai_20230122_FE.pdf'
answer_url = 'https://www.ipa.go.jp/shiken/about/ug65p90000001bq0-att/tokurei_ans_20230122_FE.pdf'

# Same wording, circumstances, choice order and official key, already in the bank.
repeats = {
    2:'fe-ipa-official-2019-spring-a-03',
    4:'fe-exempt-2021-20210613-q02',
    10:'fe-ipa-sample-2022-a-009',
    16:'fe-exempt-2021-20210613-q15',
    17:'fe-exempt-2020-20201213-q17',
    20:'fe-exempt-2021-20210725-q20',
    21:'fe-exempt-2021-20210725-q21',
    22:'fe-exempt-2020-20200726-q21',
    23:'fe-exempt-2021-20210725-q23',
    27:'fe-ipa-2019-spring-am-adapt-28',
    28:'fe-exempt-2021-20210613-q27',
    35:'fe-ipa-official-2026-a-09',
    38:'fe-exempt-2021-20210725-q43',
    39:'fe-exempt-2021-20210613-q38',
    40:'fe-exempt-2021-20210613-q40',
    43:'fe-ipa-official-2023-a-10',
    46:'fe-exempt-2021-20210725-q47',
    51:'fe-exempt-2020-20200614-q53',
    55:'fe-ipa-2019-spring-am-adapt-56',
    56:'fe-exempt-2021-20210613-q56',
    57:'fe-exempt-2020-20200726-q57',
    59:'fe-exempt-2021-20210613-q60',
    60:'fe-exempt-2021-20210725-q60',
    63:'fe-ipa-sample-2022-a-049',
    65:'fe-exempt-2021-20210613-q65',
    70:'fe-exempt-2021-20210613-q70',
    71:'fe-exempt-2021-20210725-q71',
    73:'fe-exempt-2021-20210613-q72',
    74:'fe-ipa-2019-spring-am-adapt-73',
    76:'fe-ipa-sample-2022-a-057',
    78:'fe-exempt-2020-20201213-q78',
    79:'fe-exempt-2020-20201213-q79',
}
keys = ('d d b a d a c d b d a c d c a a c c b c '
        'd b c d b c b d d b d c c b c b c a b c '
        'c b c c a b c a b a d c b b a a b c d d '
        'a d a b c c c a c a d c c d c c c d d b').split()

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

if len(items) != len({x['no'] for x in items}) or set(repeats) & {x['no'] for x in items}:
    raise ValueError('duplicate question number')
lines = ['-- IPA FY2022 exemption exam 2023-01-22: reviewed adaptations and exact repeats.',
         'INSERT OR IGNORE INTO questions (id,track_id,topic,difficulty,question_type,prompt,options_json,answer_json,explanation,source_type,source_reference,language,exam_section,exam_section_method,question_kind,exam_origin) VALUES']
rows = []
for item in items:
    n = item['no']
    if len(item['options']) != 4 or item['answer'] != keys[n-1]:
        raise ValueError(f'invalid choices or official key for question {n}')
    ident = f'fe-exempt-2022-20230122-q{n:02}'
    opts = [{'id': chr(97+i), 'text': s} for i,s in enumerate(item['options'])]
    values = [ident, 'exam-fe', item['topic'], 'standard', 'single_choice',
              f'【IPA 2022年度 修了認定試験 2023-01-22 問{n}・改編】{item["prompt"]}',
              json.dumps(opts,ensure_ascii=False,separators=(',',':')),
              json.dumps(item['answer']), item['ja']+' 中文：'+item['zh'],
              'licensed', question_url, 'ja', 'A', 'explicit', 'standard', 'fe_exemption']
    rows.append('('+','.join(map(quote, values))+')')
lines.append(',\n'.join(rows)+';')
lines.append('INSERT OR IGNORE INTO fe_exemption_occurrences (sitting_date,original_question,fiscal_year,canonical_question_id,official_answer,question_url,answer_url) VALUES')
occurrences = {item['no']:f'fe-exempt-2022-20230122-q{item["no"]:02}' for item in items} | repeats
lines.append(',\n'.join('('+','.join(map(quote,['2023-01-22',n,2022,ident,keys[n-1],question_url,answer_url]))+')'
                       for n,ident in sorted(occurrences.items()))+';')
target = ROOT / 'migrations/0222_fe_exemption_20230122_curated.sql'
target.write_text('\n'.join(lines)+'\n')
print(f'{target}: {len(items)} new questions, {len(repeats)} existing questions linked')
