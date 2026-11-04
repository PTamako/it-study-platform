#!/usr/bin/env python3
"""Build a public first-party lookup index from pinned, already committed word seeds.

Uses only stdlib sqlite3 + migrations/0079; never contacts Cloudflare D1, the
internet or any live personal database. Fails closed on bad counts/duplicates.
"""
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "migrations/0079_language_learning_6000_cards.sql"
CURATED = ROOT / "scripts/curated-learner-words.json"
OUTPUT = ROOT / "public/learner-lexicon"
FIELDS = (
    "id language category term reading meaning_zh explanation example "
    "example_meaning_zh example_source_url source_type"
).split()
SOURCE_EXAMPLES = ROOT / "scripts/.generated/lexicon-source-examples.json"

def read_attested_examples():
    # The source generator writes this in CI from the same Tatoeba export.
    # Standalone local builds can use the original pinned data without it.
    if not SOURCE_EXAMPLES.exists():
        print("No locally generated Tatoeba headword index; keeping original examples")
        return {"ja": {}, "en": {}}
    payload = json.loads(SOURCE_EXAMPLES.read_text(encoding="utf-8"))
    if payload.get("version") != 1 or not isinstance(payload.get("languages"), dict):
        raise ValueError("Invalid Tatoeba example index version")
    from lexicon_example_matching import find_exact_headword_matches, compile_headword_patterns
    indexed = {}
    for lang in ("ja", "en"):
        entries = payload["languages"].get(lang, {})
        if not isinstance(entries, dict) or len(entries) > 3000:
            raise ValueError("Invalid source-backed example count: " + lang)
        indexed[lang] = {}
        pattern = compile_headword_patterns({lang: set(entries)})
        for term, example in entries.items():
            source = example.get("example_source_url", "")
            sentence = example.get("example", "")
            translation = example.get("example_meaning_zh", "")
            if not source.startswith("https://tatoeba.org/en/sentences/show/") or not source.rsplit("/",1)[-1].isdigit():
                raise ValueError("Non-attributable learner example: " + term)
            if not sentence.strip() or not translation.strip() or len(sentence) > 110:
                raise ValueError("Invalid bilingual example: " + term)
            normalized = term.casefold() if lang == "en" else term
            if normalized not in find_exact_headword_matches(sentence, lang, pattern[lang]):
                raise ValueError("Headword not independently present in source sentence: " + term)
            if example.get("example_review_status") != "source-linked-unreviewed-sense":
                raise ValueError("Unreviewed example incorrectly marked as verified: " + term)
            indexed[lang][normalized] = example
    return indexed

def main():
    database = sqlite3.connect(":memory:")
    try:
        # This minimal definition matches the schema immediately before 0079.
        database.execute("""CREATE TABLE language_cards (
          id TEXT PRIMARY KEY, language TEXT, category TEXT, term TEXT,
          reading TEXT, meaning_zh TEXT, explanation TEXT, example TEXT,
          example_meaning_zh TEXT, source_type TEXT)""")
        database.executescript(SOURCE.read_text(encoding="utf-8"))
        results = database.execute(
            "SELECT " + ", ".join(FIELDS) +
            " FROM language_cards WHERE source_type='licensed' ORDER BY language, term"
        ).fetchall()
    finally:
        database.close()
    grouped = {"ja": [], "en": []}
    for values in results:
        row = dict(zip(FIELDS, values))
        language = row["language"]
        if language not in grouped:
            raise ValueError("Unexpected dictionary language: " + str(language))
        if not row["term"] or not row["meaning_zh"]:
            raise ValueError("Missing attested word or meaning: " + row["id"])
        grouped[language].append(row)
    for language in grouped:
        if len(grouped[language]) != 3000:
            raise ValueError(f"Expected 3000 licensed {language} headwords, got {len(grouped[language])}")
    source_examples = read_attested_examples()
    augmented = {"ja": 0, "en": 0}
    for lang, words in grouped.items():
        for word in words:
            if word["source_type"] != "licensed":
                continue
            if word["example"] and word["example_meaning_zh"]:
                continue  # Preserve already paired source data.
            key = word["term"].strip().casefold() if lang == "en" else word["term"].strip()
            example = source_examples[lang].get(key)
            if example:
                word.update({
                    "example": example["example"],
                    "example_meaning_zh": example["example_meaning_zh"],
                    "example_source_url": example["example_source_url"],
                    # Source proves the text and direct translation pairing,
                    # never an independently reviewed dictionary sense.
                    "example_provenance": example["example_provenance"],
                    "example_review_status": example["example_review_status"],
                })
                augmented[lang] += 1
    print("Linked learner examples added (unreviewed lexical senses):", augmented)
    curated = json.loads(CURATED.read_text(encoding="utf-8"))
    if curated.get("version") != 1 or not isinstance(curated.get("items"), list):
        raise ValueError("Invalid manually reviewed learner additions")
    for row in curated["items"]:
        if row.get("language") not in grouped or row.get("source_type") != "generated":
            raise ValueError("Curated entry has invalid provenance or language")
        if not all(row.get(key) for key in ("id", "term", "meaning_zh", "explanation", "example", "example_meaning_zh")):
            raise ValueError("Curated entry lacks bilingual explanation or example: " + str(row.get("id")))
        grouped[row["language"]].append(row)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "sources": ["ECDICT (MIT)", "OpenJLPT / Tomoshi (CC BY-SA 4.0)", "original reviewed entries"]}
    for language, words in grouped.items():
        terms = set()
        for word in words:
            key = word["term"].strip().casefold()
            if key in terms:
                raise ValueError("Duplicate " + language + " headword: " + word["term"])
            terms.add(key)
        payload = json.dumps({"items": words}, ensure_ascii=False, separators=(",", ":"))
        fingerprint = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
        filename = f"{language}.{fingerprint}.json"
        (OUTPUT / filename).write_text(payload + "\n", encoding="utf-8")
        manifest[language] = "/learner-lexicon/" + filename
        for stale in OUTPUT.glob(language + ".*.json"):
            if stale.name != filename:
                stale.unlink()
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print("Static lexicon built without D1: " + ", ".join(f"{k}={len(v)}" for k,v in grouped.items()))

if __name__ == "__main__":
    main()
