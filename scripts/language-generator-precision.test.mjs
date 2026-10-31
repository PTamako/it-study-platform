import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('generator independently labels repeated grammar matches and rejects false English article spans', () => {
  const code = String.raw`
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location("sentence_generator_test", str(Path("scripts/generate_language_sentence_seed.py").resolve()))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

generator.validate_annotation_rules()
examples = [
    ("学校から駅まで歩きます。", "ja"),
    ("大阪から東京まで電車で行きます。", "ja"),
    ("資料を確認してから連絡します。", "ja"),
    ("僕は会社で働いています。", "ja"),
    ("彼女が分からない理由を説明した。", "ja"),
    ("The meeting starts tomorrow.", "en"),
    ("A very large office opens today.", "en"),
    ("Could you confirm the schedule?", "en"),
]
for sentence, language in examples:
    hits = generator.make_hits(sentence, language)
    for entry in hits:
        assert sentence[entry["start"]:entry["end"]] == entry["term"], (sentence, entry)
        if language == "ja" and entry["type"] == "grammar":
            if entry["term"] in {"から", "まで", "だけ", "より", "しか"}:
                assert entry["term"] in entry["meaning"], (sentence, entry)
        if language == "en" and entry["type"] == "grammar" and entry["term"].lower().startswith(("a ", "an ", "the ")):
            assert not any(word in entry["term"].lower().split() for word in ("starts", "is", "are", "works")), (sentence, entry)
`
  const result = spawnSync('python3', ['-c', code], { encoding: 'utf8', timeout: 60000 })
  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'))
})
