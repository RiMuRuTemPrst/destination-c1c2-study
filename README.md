# Destination C1&C2 — Offline Study App

An interactive offline study app for **Destination C1&C2** (Cambridge CAE/CPE preparation book).  
Bilingual EN-VI theory, auto-graded exercises, and vocabulary flashcards — all in a single HTML file.

---

## Features

- **26 units** — Grammar (odd) and Vocabulary (even) units
- **Theory** — Grammar explanations in English + Vietnamese, collapsible sections, examples, watch-out tips
- **Exercises** — All exercise types from the book: fill-in-the-blank, multiple choice, error correction, word form, transformation
  - Auto-grading with explanations for each answer
  - Contraction-aware matching (`doesn't` = `does not`)
  - Progress saved — reopen a unit and see your previous answers
- **Vocabulary flashcards**
  - Browse table with EN definition, Vietnamese definition, example
  - **Flashcard mode**: flip card, Know ✓ / Don't know ✗ queue, keyboard shortcuts
  - Section filter: All / Topic Vocabulary / Phrasal Verbs / Idioms / Phrases & Collocations
  - Known cards saved per unit — carries over between sessions
  - MCQ quiz mode
- **Progress tracking** — scores and completion status saved in localStorage
- **Dark / Light mode**
- **Fully offline** — no server, no internet required after setup

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/RiMuRuTemPrst/destination-c1c2-study.git
cd destination-c1c2-study

# 2. Open the app
python3 launcher.py
# → opens http://localhost:8081/app/index.html
```

Or just open `app/index.html` directly in a browser (all data is bundled).

---

## Keyboard Shortcuts (Flashcard mode)

| Key | Action |
|-----|--------|
| `Space` | Flip card |
| `→` or `k` | Mark as known ✓ |
| `←` or `j` | Mark as don't know ✗ |

---

## Project Structure

```
├── app/
│   ├── index.html          # Single-page app
│   ├── app.js              # App logic (theory, exercises, flashcards)
│   ├── style.css           # Dark/light theme
│   └── data_bundle.js      # All 26 units bundled (auto-generated)
├── data/
│   └── units/              # unit_01.json … unit_26.json
├── scripts/
│   ├── extract_pdf.py      # PyMuPDF: PDF → per-unit text
│   ├── generate_all.sh     # Gemini CLI: text → structured JSON
│   ├── generate_content.py # Gemini API alternative (requires API key)
│   └── bundle.py           # Merge all JSONs → app/data_bundle.js
└── launcher.py             # HTTP server on port 8081
```

---

## Regenerating Content

Content is pre-generated and bundled. To regenerate from a source PDF:

```bash
# 1. Extract text from PDF (requires pymupdf)
pip install pymupdf
python3 scripts/extract_pdf.py --units $(seq 1 26)

# 2. Generate JSON using Gemini CLI (free, uses Google account OAuth)
#    Install: https://github.com/google-gemini/gemini-cli
bash scripts/generate_all.sh          # all units
bash scripts/generate_all.sh 3        # single unit
bash scripts/generate_all.sh 1 5      # range

# 3. Rebuild bundle
python3 scripts/bundle.py
```

---

## Tech Stack

- Vanilla HTML / CSS / JavaScript — zero dependencies, zero build step
- [PyMuPDF](https://pymupdf.readthedocs.io/) for PDF text extraction
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) for AI content generation
- localStorage for all persistence

---

## Note

This app is a personal study tool. The book content (*Destination C1&C2*, Macmillan Education) is copyright of its respective authors and publisher. The PDF is not included in this repository.
