#!/usr/bin/env bash
# Generate all unit JSONs using Gemini CLI (no API key needed — uses your Google account).
# Usage: bash scripts/generate_all.sh
#        bash scripts/generate_all.sh 1 5      # generate units 1 to 5
#        bash scripts/generate_all.sh 3        # generate unit 3 only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RAW_DIR="$ROOT_DIR/data/raw"
UNITS_DIR="$ROOT_DIR/data/units"
mkdir -p "$UNITS_DIR"

# --- Grammar prompt ---
GRAMMAR_PROMPT='You are digitizing a grammar unit from the book "Destination C1&C2" (Cambridge CAE/CPE preparation).

The raw text of the unit is provided via stdin.

CRITICAL RULES — READ BEFORE STARTING:
- Each exercise (A, B, C, D...) typically has 8–20 numbered items. You MUST include ALL of them.
- DO NOT truncate, summarize, or use "..." anywhere. If an exercise has 16 items, output all 16.
- DO NOT skip any exercise. If the unit has exercises A through J, output all 10.
- Before outputting, mentally count the items in each exercise and verify you have all of them.
- The answer for each item must be the specific correct word/phrase, not a description.

Your tasks:
1. Extract ALL grammar topics with full explanations in BOTH English and Vietnamese (natural Vietnamese, not literal translation)
2. Extract EVERY exercise label (A, B, C...) with its full instruction text
3. For each exercise, extract EVERY numbered item — the complete sentence and the correct answer
4. Fill-in-blank: use ___ for each blank in the "sentence" field; replace dotted lines (....) with ___
5. Multiple choice: ALL options in "options" array, correct one in "answer"
6. Error correction: bold/marked wrong word in *asterisks* in sentence, correct word in "answer"
7. Provide a clear explanation for every item answer

Output ONLY valid JSON — no markdown, no ```json, no extra text. Schema:
{
  "unit_id": <number>,
  "unit_type": "Grammar",
  "title": "<topic>",
  "grammar_topics": [
    {
      "topic": "<name>",
      "explanation_en": "<full explanation in English>",
      "explanation_vi": "<full explanation in Vietnamese>",
      "rules": ["<rule>"],
      "examples": [{"sentence": "<en>", "translation": "<vi>"}],
      "watch_out": ["<warning>"]
    }
  ],
  "exercises": [
    {
      "id": "u<N>_<label>",
      "label": "<A/B/C...>",
      "type": "<fill_blank|multiple_choice|error_correction|word_form|transformation>",
      "instruction": "<instruction text>",
      "items": [
        {
          "number": <int>,
          "sentence": "<sentence with ___ for blank>",
          "options": ["<opt1>", "<opt2>"],
          "answer": "<correct answer>",
          "explanation": "<why this is correct>"
        }
      ]
    }
  ]
}'

# --- Vocabulary prompt ---
VOCAB_PROMPT='You are digitizing a vocabulary unit from the book "Destination C1&C2" (Cambridge CAE/CPE preparation).

The raw text of the unit is provided via stdin.

CRITICAL RULES — READ BEFORE STARTING:
- Each exercise (A, B, C, D...) typically has 8–20 numbered items. You MUST include ALL of them.
- DO NOT truncate, summarize, or use "..." anywhere. Output every single numbered item.
- DO NOT skip any exercise. If the unit has exercises A through O, output all 15.
- Before outputting, mentally count the items in each exercise and verify you have all of them.
- The answer for each item must be the specific correct word/phrase, not a description.

Your tasks:
1. Extract ALL vocabulary sections: topic vocabulary, phrasal verbs, phrases/patterns/collocations, idioms, word formation
2. For each word/phrase: English definition, Vietnamese definition (natural, not literal), example sentence, synonyms, collocations
3. Extract EVERY exercise label (A, B, C...) with its full instruction text
4. For each exercise, extract EVERY numbered item with correct answer and explanation
5. Fill-in-blank: use ___ for each blank; replace dotted lines (....) with ___

Output ONLY valid JSON — no markdown, no ```json, no extra text. Schema:
{
  "unit_id": <number>,
  "unit_type": "Vocabulary",
  "title": "<topic>",
  "vocabulary_sections": [
    {
      "section_name": "<Topic vocabulary / Phrasal verbs / etc>",
      "words": [
        {
          "word": "<word>",
          "pos": "<noun/verb/adj/etc>",
          "definition_en": "<definition>",
          "definition_vi": "<Vietnamese definition>",
          "example": "<example sentence>",
          "synonyms": ["<syn>"],
          "collocations": ["<collocation>"]
        }
      ]
    }
  ],
  "exercises": [
    {
      "id": "u<N>_<label>",
      "label": "<A/B/C...>",
      "type": "<fill_blank|multiple_choice|word_form|matching|gap_fill>",
      "instruction": "<instruction text>",
      "items": [
        {
          "number": <int>,
          "sentence": "<sentence with ___ for blank>",
          "options": ["<opt1>", "<opt2>"],
          "answer": "<correct answer>",
          "explanation": "<why>"
        }
      ]
    }
  ]
}'

# ── Main loop ──────────────────────────────────────────────────────────────
if [ $# -eq 0 ]; then
    START=1; END=26
elif [ $# -eq 1 ]; then
    START=$1; END=$1
else
    START=$1; END=$2
fi

SUCCESS=0; SKIP=0; FAIL=0

for i in $(seq $START $END); do
    N=$(printf "%02d" $i)
    RAW="$RAW_DIR/unit_${N}.txt"
    OUT="$UNITS_DIR/unit_${N}.json"

    if [ -f "$OUT" ]; then
        echo "  [skip] Unit $i already exists"
        SKIP=$((SKIP+1))
        continue
    fi

    if [ ! -f "$RAW" ]; then
        echo "  [miss] Unit $i raw file not found — run extract_pdf.py first"
        FAIL=$((FAIL+1))
        continue
    fi

    # Grammar units = odd, Vocabulary units = even
    if [ $((i % 2)) -eq 1 ]; then
        PROMPT="$GRAMMAR_PROMPT"
    else
        PROMPT="$VOCAB_PROMPT"
    fi

    echo -n "  [gen]  Unit $i ... "

    # Run Gemini CLI: pipe unit text, append prompt
    RAW_OUTPUT=$(cat "$RAW" | gemini -p "$PROMPT" 2>/dev/null)

    # Extract JSON robustly: strip markdown fences + any preamble text, keep only {…}
    CLEAN=$(echo "$RAW_OUTPUT" | python3 -c "
import sys, re
text = sys.stdin.read()
# Remove markdown fences
text = re.sub(r'\`\`\`(?:json)?\s*', '', text)
# Extract from first { to last }
m = re.search(r'(\{.*\})', text, re.DOTALL)
print(m.group(1) if m else text)
")

    # Validate JSON
    if echo "$CLEAN" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
        echo "$CLEAN" > "$OUT"
        echo "OK → unit_${N}.json"
        SUCCESS=$((SUCCESS+1))
        # Rebuild bundle so app can load this unit immediately
        python3 "$SCRIPT_DIR/bundle.py"
    else
        echo "FAIL (invalid JSON)"
        echo "$RAW_OUTPUT" > "/tmp/gemini_unit_${N}_raw.txt"
        echo "         Raw output saved to /tmp/gemini_unit_${N}_raw.txt"
        FAIL=$((FAIL+1))
    fi
done

echo ""
echo "Done: $SUCCESS generated, $SKIP skipped, $FAIL failed"
echo "Open app/index.html in your browser to study."
