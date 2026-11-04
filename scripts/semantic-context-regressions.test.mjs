import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'

test('contextual Japanese nominalizer, English used to and train-transfer categorization', () => {
  const source = String.raw`
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location("sentence_generator",str(Path("scripts/generate_language_sentence_seed.py").resolve()))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
def annotations(s,lang):
    return module.make_hits(s,lang)
def grammar(s,lang):
    return [x for x in annotations(s,lang) if x["type"]=="grammar"]
for sentence in ["外国語を学ぶのは難しい。","私は野菜を食べるのが好きです。","時のたつのは早いものだ。"]:
    hits=grammar(sentence,"ja")
    nominal=[x for x in hits if "の" in x["term"] and "名词化" in (x["meaning"]+x["explanation"])]
    assert nominal,(sentence,hits)
for sentence in ["I am not used to hard work.","This tool is used to clean the keyboard.","He got used to working from home."]:
    hits=grammar(sentence,"en")
    assert not any(x["term"].casefold()=="used to" for x in hits),(sentence,hits)
assert any(x["term"].casefold()=="used to" for x in grammar("Tom used to work here.","en"))
assert not module.EN_WORK.search("Where do I have to change trains?")
assert not module.EN_WORK.search("You have to change trains at Shibuya.")
assert module.EN_WORK.search("Please change the meeting schedule.")
`
  const result = spawnSync('python3',['-c',source],{encoding:'utf8',timeout:45000})
  assert.equal(result.status,0,[result.stdout,result.stderr].filter(Boolean).join('\n'))
})
