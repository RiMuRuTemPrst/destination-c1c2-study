#!/usr/bin/env python3
"""Rebuild app/data_bundle.js from all generated unit JSON files.
Run after adding new unit JSONs so the app can load them offline.
Usage: python3 scripts/bundle.py
"""
import json, os

UNITS_DIR  = os.path.join(os.path.dirname(__file__), "../data/units")
BUNDLE_OUT = os.path.join(os.path.dirname(__file__), "../app/data_bundle.js")


def build():
    bundle = {}
    for f in sorted(os.listdir(UNITS_DIR)):
        if f.endswith(".json"):
            uid = int(f.split("_")[1].split(".")[0])
            with open(os.path.join(UNITS_DIR, f), encoding="utf-8") as fp:
                bundle[uid] = json.load(fp)

    out = f"window.IELTS_DATA = {json.dumps(bundle, ensure_ascii=False)};\n"
    with open(BUNDLE_OUT, "w", encoding="utf-8") as fp:
        fp.write(out)
    size_kb = os.path.getsize(BUNDLE_OUT) // 1024
    print(f"Bundled {len(bundle)}/26 units → app/data_bundle.js ({size_kb} KB)")
    return len(bundle)


if __name__ == "__main__":
    build()
