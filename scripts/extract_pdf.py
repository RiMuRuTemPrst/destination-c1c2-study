#!/usr/bin/env python3
"""
Extract Destination C1-C2 PDF into per-unit text files.
Usage: python3 extract_pdf.py [--pdf PATH] [--out DIR]
"""
import fitz  # pymupdf
import argparse
import os

PDF_PATH   = os.path.join(os.path.dirname(__file__), "../Destination-C1.pdf")
OUT_DIR    = os.path.join(os.path.dirname(__file__), "../data/raw")
PDF_OFFSET = 1  # PDF page = printed book page + this offset (2 TOC pages before content)

# (unit_id, unit_type, title, book_start, book_end)  — printed book page numbers
UNITS = [
    (1,  "Grammar",    "Present time",                          6,  11),
    (2,  "Vocabulary", "Thinking and learning",                12,  19),
    (3,  "Grammar",    "Past time",                            22,  27),
    (4,  "Vocabulary", "Change and technology",                28,  35),
    (5,  "Grammar",    "Future time",                          38,  43),
    (6,  "Vocabulary", "Time and work",                        44,  51),
    (7,  "Grammar",    "Passives and causatives",              54,  59),
    (8,  "Vocabulary", "Movement and transport",               60,  67),
    (9,  "Grammar",    "Modals and semi-modals",               70,  75),
    (10, "Vocabulary", "Communication and the media",          76,  83),
    (11, "Grammar",    "Conditionals",                         86,  91),
    (12, "Vocabulary", "Chance and nature",                    92,  99),
    (13, "Grammar",    "Unreal time",                         106, 111),
    (14, "Vocabulary", "Quantity and money",                  112, 119),
    (15, "Grammar",    "Adjectives and adverbs",              122, 127),
    (16, "Vocabulary", "Materials and the built environment", 128, 135),
    (17, "Grammar",    "Clauses",                             138, 143),
    (18, "Vocabulary", "Reactions and health",                144, 151),
    (19, "Grammar",    "Complex sentences",                   154, 159),
    (20, "Vocabulary", "Power and social issues",             160, 167),
    (21, "Grammar",    "Noun phrases",                        170, 175),
    (22, "Vocabulary", "Quality and the arts",                176, 183),
    (23, "Grammar",    "Verbal complements",                  186, 191),
    (24, "Vocabulary", "Relationships and people",            192, 199),
    (25, "Grammar",    "Reporting",                           202, 207),
    (26, "Vocabulary", "Preference and leisure activities",   208, 215),
]


def extract_unit(doc, unit_id, unit_type, title, start_page, end_page, out_dir):
    pages_text = []
    pdf_start = start_page + PDF_OFFSET - 1  # convert book page → 0-indexed PDF page
    pdf_end   = end_page  + PDF_OFFSET
    for page_num in range(pdf_start, pdf_end):  # 0-indexed
        if page_num >= len(doc):
            break
        page = doc[page_num]
        text = page.get_text("text")
        pages_text.append(f"--- Page {page_num + 1} ---\n{text}")

    content = "\n\n".join(pages_text)
    filename = f"unit_{unit_id:02d}.txt"
    path = os.path.join(out_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"UNIT {unit_id}: {unit_type.upper()} — {title}\n")
        f.write("=" * 60 + "\n\n")
        f.write(content)
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", default=PDF_PATH)
    parser.add_argument("--out", default=OUT_DIR)
    parser.add_argument("--units", nargs="*", type=int, help="Unit IDs to extract (default: all)")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    doc = fitz.open(args.pdf)
    print(f"PDF loaded: {len(doc)} pages")

    targets = set(args.units) if args.units else None
    for unit_id, unit_type, title, start, end in UNITS:
        if targets and unit_id not in targets:
            continue
        path = extract_unit(doc, unit_id, unit_type, title, start, end, args.out)
        print(f"  Unit {unit_id:02d} ({unit_type}: {title}) → {os.path.basename(path)}")

    print(f"\nDone. Files saved to {args.out}")


if __name__ == "__main__":
    main()
