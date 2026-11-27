#!/usr/bin/env python3
"""Build an append-only migration from individually authored practice questions."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'scripts/fe-20261127-practice.tsv'

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

lines = source.read_text().splitlines()
if len(lines) != 161:
    raise ValueError(f'expected 161 distinct practice questions, got {len(lines)}')
records = []
seen_topics, seen_prompts = set(), set()
for i, line in enumerate(lines, 1):
    parts = line.split('|')
    if len(parts) != 8:
        raise ValueError(f'line {i}: expected 8 fields, got {len(parts)}')
    topic, prompt, correct, *tail = parts
    distractors, japanese, chinese = tail[:3], tail[3], tail[4]
    if topic in seen_topics or prompt in seen_prompts or len({correct, *distractors}) != 4:
        raise ValueError(f'line {i}: repeated topic, prompt or choice')
    if not all(parts):
        raise ValueError(f'line {i}: empty field')
    seen_topics.add(topic); seen_prompts.add(prompt)
    answers = [correct, *distractors]
    # Rotate the author-identified answer through the four choices.
    pos = (i - 1) % 4
    answers = answers[1:pos+1] + answers[:1] + answers[pos+1:]
    opts = [{'id': chr(97+j), 'text': text} for j, text in enumerate(answers)]
    values = [f'fe-original-20261127-q{i:03}', 'exam-fe', topic, 'standard', 'single_choice',
              '【知学オリジナル・科目A】'+prompt,
              json.dumps(opts,ensure_ascii=False,separators=(',',':')),
              json.dumps(chr(97+pos)), japanese+' 中文：'+chinese,
              'generated', '知学オリジナル練習問題（IPA公式過去問ではありません）',
              'ja', 'A', 'explicit', 'standard', 'general']
    records.append('('+','.join(map(quote, values))+')')

header = ('INSERT OR IGNORE INTO questions (id,track_id,topic,difficulty,question_type,prompt,'
          'options_json,answer_json,explanation,source_type,source_reference,language,exam_section,'
          'exam_section_method,question_kind,exam_origin) VALUES\n')
# D1 limits the size of an individual SQL statement. Keep each reviewed
# batch comfortably below the limit even if individual explanations grow.
chunks = [records[i:i+25] for i in range(0, len(records), 25)]
sql = ('-- Original FE practice questions; not IPA official questions. Append-only.\n' +
       ''.join(header + ',\n'.join(chunk) + ';\n' for chunk in chunks))
target = ROOT / 'migrations/0223_fe_original_practice_20261127.sql'
target.write_text(sql)
print(f'{target}: {len(records)} new original questions')
