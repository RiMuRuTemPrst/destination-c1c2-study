#!/usr/bin/env python3
"""
Generate structured JSON for each unit using Gemini API.
Usage:
  python3 generate_content.py --unit 1          # single unit
  python3 generate_content.py --all             # all units
  python3 generate_content.py --unit 1 2 3      # multiple units

Requires: GEMINI_API_KEY env var
"""
import google.generativeai as genai
import json
import os
import argparse
import time
import sys
from bundle import build as rebuild_bundle

RAW_DIR   = os.path.join(os.path.dirname(__file__), "../data/raw")
UNITS_DIR = os.path.join(os.path.dirname(__file__), "../data/units")

GRAMMAR_SCHEMA = {
    "type": "object",
    "properties": {
        "unit_id":    {"type": "integer"},
        "unit_type":  {"type": "string"},
        "title":      {"type": "string"},
        "grammar_topics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic":          {"type": "string"},
                    "explanation_en": {"type": "string"},
                    "explanation_vi": {"type": "string"},
                    "rules":          {"type": "array", "items": {"type": "string"}},
                    "examples": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "sentence":    {"type": "string"},
                                "translation": {"type": "string"}
                            }
                        }
                    },
                    "watch_out": {"type": "array", "items": {"type": "string"}}
                }
            }
        },
        "exercises": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id":          {"type": "string"},
                    "label":       {"type": "string"},
                    "type":        {"type": "string"},
                    "instruction": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "number":       {"type": "integer"},
                                "sentence":     {"type": "string"},
                                "options":      {"type": "array", "items": {"type": "string"}},
                                "answer":       {"type": "string"},
                                "explanation":  {"type": "string"}
                            }
                        }
                    }
                }
            }
        }
    }
}

VOCAB_SCHEMA = {
    "type": "object",
    "properties": {
        "unit_id":   {"type": "integer"},
        "unit_type": {"type": "string"},
        "title":     {"type": "string"},
        "vocabulary_sections": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "section_name": {"type": "string"},
                    "words": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "word":          {"type": "string"},
                                "pos":           {"type": "string"},
                                "definition_en": {"type": "string"},
                                "definition_vi": {"type": "string"},
                                "example":       {"type": "string"},
                                "synonyms":      {"type": "array", "items": {"type": "string"}},
                                "collocations":  {"type": "array", "items": {"type": "string"}}
                            }
                        }
                    }
                }
            }
        },
        "exercises": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id":          {"type": "string"},
                    "label":       {"type": "string"},
                    "type":        {"type": "string"},
                    "instruction": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "number":      {"type": "integer"},
                                "sentence":    {"type": "string"},
                                "options":     {"type": "array", "items": {"type": "string"}},
                                "answer":      {"type": "string"},
                                "explanation": {"type": "string"}
                            }
                        }
                    }
                }
            }
        }
    }
}

GRAMMAR_PROMPT = """You are digitizing the grammar unit from Destination C1&C2 (a Cambridge CAE/CPE preparation book).

Below is the raw extracted text of one Grammar unit. Your task:
1. Extract ALL grammar topics with full bilingual explanations (English + Vietnamese)
2. Extract ALL exercises exactly as they appear — preserve every sentence, every item number
3. For each exercise item, provide the correct answer AND a clear explanation
4. For fill-in-blank: the "sentence" field uses ___ to mark the blank
5. For multiple choice (circle correct): list all options in "options", mark correct in "answer"
6. For error correction: "sentence" has the wrong word bolded (use *asterisks*), "answer" is the correction
7. Exercise types: fill_blank, multiple_choice, error_correction, word_form, transformation, matching

Be thorough — do NOT skip any exercise items. Vietnamese explanations should be natural, not robotic.

RAW TEXT:
{text}

Return valid JSON matching the schema exactly."""

VOCAB_PROMPT = """You are digitizing the vocabulary unit from Destination C1&C2 (a Cambridge CAE/CPE preparation book).

Below is the raw extracted text of one Vocabulary unit. Your task:
1. Extract ALL vocabulary sections (topic vocab, phrasal verbs, phrases/collocations, idioms, word formation)
2. For each word/phrase: English definition, Vietnamese definition (natural, not robotic), example sentence
3. Extract ALL exercises exactly as they appear — preserve every item
4. For each exercise item, provide correct answer AND explanation
5. Exercise types: fill_blank, multiple_choice, word_form, matching, gap_fill

Be thorough — do NOT skip any vocabulary items or exercises.

RAW TEXT:
{text}

Return valid JSON matching the schema exactly."""


def load_raw(unit_id: int) -> str:
    path = os.path.join(RAW_DIR, f"unit_{unit_id:02d}.txt")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Raw file not found: {path}. Run extract_pdf.py first.")
    with open(path, encoding="utf-8") as f:
        return f.read()


def is_grammar_unit(unit_id: int) -> bool:
    return unit_id % 2 == 1  # odd = grammar, even = vocab


def generate_unit(model, unit_id: int) -> dict:
    text = load_raw(unit_id)
    is_grammar = is_grammar_unit(unit_id)
    prompt_template = GRAMMAR_PROMPT if is_grammar else VOCAB_PROMPT
    schema = GRAMMAR_SCHEMA if is_grammar else VOCAB_SCHEMA

    prompt = prompt_template.format(text=text)

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.1,
        )
    )
    return json.loads(response.text)


def save_unit(unit_id: int, data: dict):
    os.makedirs(UNITS_DIR, exist_ok=True)
    path = os.path.join(UNITS_DIR, f"unit_{unit_id:02d}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--unit", nargs="+", type=int, help="Unit ID(s) to process")
    group.add_argument("--all", action="store_true", help="Process all 26 units")
    parser.add_argument("--key", default=os.environ.get("GEMINI_API_KEY"), help="Gemini API key")
    parser.add_argument("--model", default="gemini-1.5-pro", help="Gemini model name")
    args = parser.parse_args()

    if not args.key:
        print("Error: GEMINI_API_KEY not set. Use --key or set env var.", file=sys.stderr)
        sys.exit(1)

    genai.configure(api_key=args.key)
    model = genai.GenerativeModel(args.model)

    unit_ids = list(range(1, 27)) if args.all else args.unit

    for i, uid in enumerate(unit_ids):
        out_path = os.path.join(UNITS_DIR, f"unit_{uid:02d}.json")
        if os.path.exists(out_path):
            print(f"  Unit {uid:02d} already exists, skipping.")
            continue

        print(f"[{i+1}/{len(unit_ids)}] Generating Unit {uid:02d}...", end=" ", flush=True)
        try:
            data = generate_unit(model, uid)
            path = save_unit(uid, data)
            print(f"→ {os.path.basename(path)}")
        except FileNotFoundError as e:
            print(f"SKIP: {e}")
        except Exception as e:
            print(f"ERROR: {e}")

        # Rebuild bundle so app can load offline immediately
        rebuild_bundle()

        # Rate limit: 2 req/min for gemini-1.5-pro free tier
        if i < len(unit_ids) - 1:
            time.sleep(35)

    print("\nDone.")


if __name__ == "__main__":
    main()
