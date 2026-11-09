#!/usr/bin/env python3
"""Attach attributable Chinese-linked Tatoeba examples to exact learner headwords.

Run inside generate_language_sentence_seed.py *after* the already downloaded
Tatoeba archive and its direct Chinese links are parsed. Never query production
D1, call AI, infer IPA, or invent translations. A linked sentence proves
provenance, not that the headword has been manually sense-disambiguated.
"""
import json
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "scripts" / ".generated" / "lexicon-source-examples.json"
SEED = ROOT / "migrations" / "0079_language_learning_6000_cards.sql"
JAPANESE = re.compile(r"^[\u3040-\u30ff\u30fc]+$")
HIRAGANA = re.compile(r"[\u3040-\u309f]")
KANA = re.compile(r"[\u3040-\u30ff\u30fc]")
KANJI = re.compile(r"[\u3400-\u9fff\u3005]")
# Particle boundaries are intentionally a narrow positive allow-list. A suffix
# inside 格好いい or a katakana loanword inside ログアウト is never a stand-alone
# headword. This is conservative, not a substitute for morphological parsing.
BOUNDARY_PARTICLES = set("はがをにでともへ")


def load_licensed_headwords():
    """Read the pinned, already committed seed locally; 0 remote D1 reads."""
    db = sqlite3.connect(":memory:")
    try:
        db.execute("""CREATE TABLE language_cards (
          id TEXT PRIMARY KEY, language TEXT, category TEXT, term TEXT,
          reading TEXT, meaning_zh TEXT, explanation TEXT, example TEXT,
          example_meaning_zh TEXT, source_type TEXT)""")
        db.executescript(SEED.read_text(encoding="utf-8"))
        words = {"ja": set(), "en": set()}
        for lang, term in db.execute(
            "SELECT language, term FROM language_cards WHERE source_type = 'licensed'"
        ):
            if lang in words and term and term.strip():
                words[lang].add(term.strip())
        if any(len(words[lang]) != 3000 for lang in words):
            raise ValueError("Pinned learner headwords changed: " +
                             str({lang: len(group) for lang, group in words.items()}))
        return words
    finally:
        db.close()


def compile_headword_patterns(words):
    """One compiled alternation per language: avoid 6,000 * N full scans."""
    patterns = {}
    for lang, terms in words.items():
        eligible = [word for word in terms if lang == "en" or len(word) >= 2]
        parts = sorted(eligible, key=lambda word: (-len(word), word))
        if lang == "en":
            patterns[lang] = re.compile(
                r"(?<![A-Za-z])(?:" + "|".join(map(re.escape, parts)) +
                r")(?![A-Za-z])", re.I
            )
        else:
            patterns[lang] = re.compile("(?:" + "|".join(map(re.escape, parts)) + ")")
    return patterns


def is_exact_japanese_form(sentence, start, end, term):
    """Conservative non-morphological boundaries; avoid いつ in そいつ."""
    before = sentence[start - 1] if start else ""
    after = sentence[end] if end < len(sentence) else ""
    if term == "いつ" and before in ("そ", "こ", "あ", "ど"):
        return False
    # Kana spans crossing word boundaries are false evidence of a word sense.
    # 「いくつもり」 here is 「行くつもり」, not いくつ (how many).
    if term == "いくつ" and sentence[end:].startswith("もり"):
        return False
    if term == "うん" and sentence[end:].startswith("と"):
        return False  # うんと = 'very/a lot', not assent 'yes'
    if term == "ある" and sentence[:start].endswith("で"):
        return False  # である is a copula, not existential ある
    if term == "あと" and re.match(r"(?:何|なん|[0-9０-９一二三四五六七八九十百千]+)(?:時間|分|秒|日|週間|ヶ月|か月|年|回|人|個|枚)", sentence[end:]):
        return False  # 'how much time remains' vs. 跡 ('trace')
    if JAPANESE.fullmatch(term):
        # A literal substring in a larger kana/kanji word is not evidence of
        # an independent lexeme: ログアウト contains アウト, 格好いい contains いい.
        if before and ((KANA.fullmatch(before) and before not in BOUNDARY_PARTICLES)
                       or KANJI.fullmatch(before)):
            return False
        if after and KANA.fullmatch(after) and after not in BOUNDARY_PARTICLES:
            return False
        # Quoted metalinguistic statements describe a *word itself*; the
        # quoted text cannot safely attest a dictionary sense in normal usage.
        if start and sentence[start - 1] in "「『" and re.match(r"[!！?？]*[」』]", sentence[end:]):
            rest = re.sub(r"^[!！?？]*[」』]", "", sentence[end:])[:20]
            if re.match(r"(?:は|とは|というのは|と呼ばれる)(?:感嘆詞|名詞|代名詞|動詞|形容詞|副詞|助詞|単語|言葉|表現|の一種)", rest):
                return False
        # 'あと10分' means 'another/remaining ten minutes', not 跡 (trace),
        # the gloss in the pinned OpenJLPT learner entry for 'あと'.
        if term == "あと" and re.match(r"[0-9０-９一二三四五六七八九十百千]+(?:分|秒|時間|日|週間|ヶ月|か月|年|回|人|個|枚)", sentence[end:]):
            return False
    if KANJI.fullmatch(term[0]) and KANJI.fullmatch(before):
        return False
    if KANJI.fullmatch(term[-1]) and KANJI.fullmatch(after):
        return False
    return True


def find_exact_headword_matches(sentence, lang, pattern):
    """Returns headwords *literally* in a sentence, never substring guesses."""
    terms = set()
    for m in pattern.finditer(sentence):
        word = m.group()
        if lang == "ja" and not is_exact_japanese_form(sentence, m.start(), m.end(), word):
            continue
        terms.add(word.casefold() if lang == "en" else word)
    return terms


def choose_source_linked_examples(sentences, translations, licensed_words):
    """Pick a short directly translated original sentence per exact headword.

    A source-linked sentence is not a certified illustration of a particular
    lexical sense: the dictionary/UI must preserve this distinction.
    """
    patterns = compile_headword_patterns(licensed_words)
    normalized = {lang: {word.casefold() if lang == "en" else word
                         for word in licensed_words[lang]} for lang in ("ja", "en")}
    best = {"ja": {}, "en": {}}
    scanned = {"ja": 0, "en": 0}
    for sid, chinese in translations.items():
        row = sentences.get(sid)
        if row is None or not str(sid).isdigit():
            continue
        lang, original = row
        if lang not in best or not original or not chinese:
            continue
        if len(original) > 110 or len(chinese) > 135 or len(chinese) < 3:
            continue
        scanned[lang] += 1
        for key in find_exact_headword_matches(original, lang, patterns[lang]):
            if lang == "en" and key in {"abandoned", "advanced"} and re.search(
                r"\b(?:i|you|he|she|we|they|tom|mary)\s+" + re.escape(key) +
                r"\s+(?:them|him|her|us|me|to|the|an?|their)\b", original, re.I):
                # ECDICT's entry is adjective here, but the example is a finite
                # past-tense *verb*. Do not promote it as an illustrative sense.
                continue
            if key not in normalized[lang]:
                continue
            # Avoid showcasing a long, difficult example when a shorter one
            # with a directly linked translation exists. Ties use source ID.
            score = (0 if 8 <= len(original) <= 64 else 1,
                     len(original), len(chinese), int(sid))
            previous = best[lang].get(key)
            if previous is None or score < previous[0]:
                best[lang][key] = (score, {
                    "example": original, "example_meaning_zh": chinese,
                    "example_source_url": "https://tatoeba.org/en/sentences/show/" + str(sid),
                    "example_provenance": "tatoeba-direct-chinese-link",
                    "example_review_status": "source-linked-unreviewed-sense",
                })
    return {"version": 1, "languages": {
        lang: {term: value[1] for term, value in best[lang].items()}
        for lang in ("ja", "en")
    }, "scanned": scanned, "matched": {lang: len(best[lang]) for lang in best}}


def write_source_linked_examples(sentences, translations):
    payload = choose_source_linked_examples(sentences, translations, load_licensed_headwords())
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8"
    )
    print("Attributable bilingual lexicon candidates (sense NOT manually verified):",
          payload["matched"], "out of 3,000 licensed words per language", flush=True)
    return payload


if __name__ == "__main__":
    raise SystemExit("Called by generate_language_sentence_seed.py after source links are loaded")
