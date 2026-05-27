#!/usr/bin/env python3
"""
Add word_bank fields to existing unit JSONs using Gemini.
Only patches exercises whose instruction mentions a word box and have no word_bank yet.

Usage:
  python3 patch_word_banks.py --unit 1
  python3 patch_word_banks.py --all
  python3 patch_word_banks.py --unit 1 2 3

Requires: GEMINI_API_KEY env var
"""
import google.generativeai as genai
import json
import os
import re
import argparse
import time
import sys
from bundle import build as rebuild_bundle

RAW_DIR   = os.path.join(os.path.dirname(__file__), "../data/raw")
UNITS_DIR = os.path.join(os.path.dirname(__file__), "../data/units")

PATCH_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "exercise_id": {"type": "string"},
            "word_bank":   {"type": "array", "items": {"type": "string"}}
        }
    }
}

PATCH_PROMPT = """You are helping digitize exercises from Destination C1&C2 (Cambridge CAE/CPE).

Below is the raw text of one unit and a list of exercises that have a "word box/bank"
(the instruction says something like "Write a verb from the box" or "Complete using the words in the box").
The word bank was NOT captured when these exercises were originally digitized.

Your task: For each exercise listed, find the word bank in the raw text and return the exact
words/phrases as they appear in the box (base forms, as printed in the book).
If you cannot find the exact box, infer the most likely word bank from the answers provided.

Return a JSON array with one object per exercise: {exercise_id, word_bank: [...]}

RAW TEXT:
{raw_text}

EXERCISES NEEDING WORD BANKS:
{exercises_json}
"""


def needs_word_bank(ex: dict) -> bool:
    inst = ex.get("instruction", "").lower()
    has_box_hint = (
        "from the box" in inst or
        "words in the box" in inst or
        "phrases in the box" in inst or
        "verbs in the box" in inst or
        "word in the box" in inst or
        "words in bold" not in inst and "complete using the words" in inst or
        "complete using the correct form of the words" in inst or
        "complete using a phrasal verb" in inst or
        "write a phrasal verb from the box" in inst
    )
    already_has = bool(ex.get("word_bank"))
    return has_box_hint and not already_has


def extract_inline_word_bank(instruction: str) -> list[str] | None:
    """Parse word banks already embedded in instruction text like [word1, word2] or (word1, word2)."""
    m = re.search(r'[\[\(]([^\]\)\n]{10,})[\]\)]', instruction)
    if m and ',' in m.group(1):
        words = [w.strip() for w in m.group(1).split(',') if w.strip()]
        if len(words) >= 2:
            return words
    return None


def patch_unit(model, unit_id: int) -> int:
    unit_path = os.path.join(UNITS_DIR, f"unit_{unit_id:02d}.json")
    raw_path  = os.path.join(RAW_DIR,   f"unit_{unit_id:02d}.txt")

    if not os.path.exists(unit_path):
        print(f"  Unit {unit_id:02d}: JSON not found, skip.")
        return 0
    if not os.path.exists(raw_path):
        print(f"  Unit {unit_id:02d}: raw text not found, skip.")
        return 0

    data = json.load(open(unit_path, encoding="utf-8"))
    raw  = open(raw_path, encoding="utf-8").read()

    to_patch = []
    inline_patched = 0

    for ex in data.get("exercises", []):
        if not needs_word_bank(ex):
            continue
        # Try inline parse first (no API call needed)
        inline = extract_inline_word_bank(ex.get("instruction", ""))
        if inline:
            ex["word_bank"] = inline
            inline_patched += 1
        else:
            to_patch.append({
                "exercise_id": ex["id"],
                "instruction": ex["instruction"],
                "sample_answers": [item.get("answer", "") for item in (ex.get("items") or [])[:6]]
            })

    if not to_patch and inline_patched == 0:
        print(f"  Unit {unit_id:02d}: nothing to patch.")
        return 0

    patched_count = inline_patched

    if to_patch:
        prompt = PATCH_PROMPT.format(
            raw_text=raw[:12000],  # truncate to stay within limits
            exercises_json=json.dumps(to_patch, ensure_ascii=False, indent=2)
        )
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=PATCH_SCHEMA,
                    temperature=0.1,
                )
            )
            results = json.loads(response.text)
            ex_map = {ex["id"]: ex for ex in data.get("exercises", [])}
            for r in results:
                eid = r.get("exercise_id")
                wb  = r.get("word_bank") or []
                if eid and wb and eid in ex_map:
                    ex_map[eid]["word_bank"] = wb
                    patched_count += 1
        except Exception as e:
            print(f"  Unit {unit_id:02d}: Gemini error — {e}")

    with open(unit_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Unit {unit_id:02d}: patched {patched_count} exercises "
          f"({inline_patched} inline, {patched_count - inline_patched} via API)")
    return patched_count


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--unit", nargs="+", type=int)
    group.add_argument("--all", action="store_true")
    parser.add_argument("--key",   default=os.environ.get("GEMINI_API_KEY"))
    parser.add_argument("--model", default="gemini-1.5-pro")
    args = parser.parse_args()

    if not args.key:
        print("Error: GEMINI_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    genai.configure(api_key=args.key)
    model = genai.GenerativeModel(args.model)

    unit_ids = list(range(1, 27)) if args.all else args.unit
    total = 0

    for i, uid in enumerate(unit_ids):
        print(f"[{i+1}/{len(unit_ids)}] Unit {uid:02d}...", end=" ", flush=True)
        n = patch_unit(model, uid)
        total += n
        if i < len(unit_ids) - 1 and n > 0:
            time.sleep(35)  # rate limit: 2 req/min free tier

    rebuild_bundle()
    print(f"\nDone. Total patched: {total} exercises. Bundle rebuilt.")


if __name__ == "__main__":
    main()
