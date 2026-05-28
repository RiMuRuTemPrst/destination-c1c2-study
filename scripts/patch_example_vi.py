#!/usr/bin/env python3
"""
Add example_vi (Vietnamese translation of example sentences) to existing vocab unit JSONs.

Usage:
  python3 patch_example_vi.py --unit 2
  python3 patch_example_vi.py --all
  python3 patch_example_vi.py --unit 2 4 6

Requires: GEMINI_API_KEY env var
"""
import google.generativeai as genai
import json, os, argparse, time, sys
from bundle import build as rebuild_bundle

UNITS_DIR = os.path.join(os.path.dirname(__file__), "../data/units")

PATCH_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "word":       {"type": "string"},
            "example_vi": {"type": "string"}
        }
    }
}

PATCH_PROMPT = """Translate the following English example sentences into natural Vietnamese.
These are example sentences from a vocabulary list in an IELTS/CAE preparation book.
Return a JSON array with one object per word: {{word, example_vi}}

Words and their example sentences:
{words_json}
"""


def patch_unit(model, unit_id: int) -> int:
    path = os.path.join(UNITS_DIR, f"unit_{unit_id:02d}.json")
    if not os.path.exists(path):
        print(f"  Unit {unit_id:02d}: not found, skip.")
        return 0

    data = json.load(open(path, encoding="utf-8"))
    if not data.get("vocabulary_sections"):
        return 0  # grammar unit, skip

    # Collect words missing example_vi
    to_patch = []
    for s in data["vocabulary_sections"]:
        for w in s.get("words", []):
            if w.get("example") and not w.get("example_vi"):
                to_patch.append({"word": w["word"], "example": w["example"]})

    if not to_patch:
        print(f"  Unit {unit_id:02d}: already complete.")
        return 0

    # Batch in chunks of 40 to stay within limits
    total_patched = 0
    chunks = [to_patch[i:i+40] for i in range(0, len(to_patch), 40)]

    for chunk in chunks:
        prompt = PATCH_PROMPT.format(words_json=json.dumps(chunk, ensure_ascii=False, indent=2))
        for attempt in range(4):
            try:
                resp = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=PATCH_SCHEMA,
                        temperature=0.1,
                    )
                )
                results = {r["word"]: r["example_vi"] for r in json.loads(resp.text) if r.get("example_vi")}
                for s in data["vocabulary_sections"]:
                    for w in s.get("words", []):
                        if w["word"] in results and not w.get("example_vi"):
                            w["example_vi"] = results[w["word"]]
                            total_patched += 1
                break
            except Exception as e:
                msg = str(e)
                if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
                    wait = 60 * (attempt + 1)
                    print(f"\n  Rate limit, waiting {wait}s...", end=" ", flush=True)
                    time.sleep(wait)
                else:
                    print(f"  Unit {unit_id:02d}: API error — {e}")
                    break
        time.sleep(5)  # small gap between chunks

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Unit {unit_id:02d}: patched {total_patched}/{len(to_patch)} words")
    return total_patched


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--unit", nargs="+", type=int)
    group.add_argument("--all", action="store_true")
    parser.add_argument("--key",   default=os.environ.get("GEMINI_API_KEY"))
    parser.add_argument("--model", default="gemini-2.0-flash")
    args = parser.parse_args()

    if not args.key:
        print("Error: GEMINI_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    genai.configure(api_key=args.key)
    model = genai.GenerativeModel(args.model)

    # Only even units are vocabulary units
    if args.all:
        unit_ids = list(range(2, 27, 2))
    else:
        unit_ids = args.unit

    total = 0
    for i, uid in enumerate(unit_ids):
        print(f"[{i+1}/{len(unit_ids)}] Unit {uid:02d}...", end=" ", flush=True)
        n = patch_unit(model, uid)
        total += n
        if i < len(unit_ids) - 1:
            time.sleep(10)

    rebuild_bundle()
    print(f"\nDone. Total: {total} example_vi added. Bundle rebuilt.")


if __name__ == "__main__":
    main()
