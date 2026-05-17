import json
import os

def format_sentence(sentence):
    import re
    # Replace dots with ___
    sentence = re.sub(r'\.{3,}', '___', sentence)
    # Replace [word] with ___
    sentence = sentence.replace('[word]', '___')
    # Replace [ROOT] with ___ (ROOT)
    # Match [ANYTHING_IN_CAPS]
    sentence = re.sub(r'\[([A-Z\s]+)\]', r'___ (\1)', sentence)
    # Clean up double ___ if they occur
    sentence = sentence.replace('___ ___', '___')
    return sentence

def main():
    vocab_path = '/home/rimurutempest/.gemini/tmp/ielts/unit_26_vocab.json'
    ex_ah_path = '/home/rimurutempest/.gemini/tmp/ielts/unit_26_ex_ah.json'
    ex_ip_path = '/home/rimurutempest/.gemini/tmp/ielts/unit_26_ex_ip.json'
    output_path = '/home/rimurutempest/Code/IELTS/data/units/unit_26.json'

    with open(vocab_path, 'r') as f:
        vocab_list = json.load(f)

    with open(ex_ah_path, 'r') as f:
        ex_ah = json.load(f)

    with open(ex_ip_path, 'r') as f:
        ex_ip = json.load(f)

    # Combine exercises
    all_exercises_raw = {**ex_ah, **ex_ip}

    # Metadata for exercises
    exercise_meta = {
        "A": {"type": "multiple_choice", "instruction": "Choose the correct answer."},
        "B": {"type": "gap_fill", "instruction": "Complete using the correct form of the words in the box."},
        "C": {"type": "multiple_choice", "instruction": "Circle the correct word."},
        "D": {"type": "error_correction", "instruction": "If the word in bold is correct, put a tick. If it is incorrect, replace it with one of the words in bold from the other sentences."},
        "E": {"type": "gap_fill", "instruction": "Complete using the correct form of the words in the box."},
        "F": {"type": "matching", "instruction": "Match to make sentences."},
        "G": {"type": "gap_fill", "instruction": "Complete using a phrasal verb with a word from box A in the right form and a word from box B. You need to use one word from box B more than once."},
        "H": {"type": "true_false", "instruction": "The phrasal verb get into has a meaning connected to the idea of becoming involved in an activity or situation. Tick the sentences where the phrasal verb has a meaning connected to a similar idea."},
        "I": {"type": "error_correction", "instruction": "One word in each sentence is incorrect. Underline the incorrect word and write the correct word."},
        "J": {"type": "multiple_choice", "instruction": "Circle the correct word."},
        "K": {"type": "word_substitution", "instruction": "For each question, write one word which can be used in all three sentences."},
        "L": {"type": "gap_fill", "instruction": "Complete using the words in the box."},
        "M": {"type": "word_formation", "instruction": "Complete the sentences by changing the form of the word in capitals."},
        "N": {"type": "word_formation", "instruction": "Write a word formed from the words in the box in each gap."},
        "O": {"type": "categorization", "instruction": "Some verbs form nouns using -ence, as in preference. Some form nouns using -ance. Put nouns formed from the following words in the correct category."},
        "P": {"type": "word_formation", "instruction": "Complete the sentences using words formed in exercise O."}
    }

    exercises = []
    for label in "ABCDEFGHIJKLMNOP":
        if label in all_exercises_raw:
            meta = exercise_meta.get(label, {"type": "unknown", "instruction": ""})
            items = all_exercises_raw[label]
            for item in items:
                if "sentence" in item:
                    item["sentence"] = format_sentence(item["sentence"])
            
            exercises.append({
                "id": f"u26_{label}",
                "label": label,
                "type": meta["type"],
                "instruction": meta["instruction"],
                "items": items
            })

    # Vocabulary sections
    vocab_sections = [
        {
            "section_name": "Topic vocabulary: Preference",
            "words": vocab_list[0:40]
        },
        {
            "section_name": "Topic vocabulary: Leisure activities",
            "words": vocab_list[40:60]
        },
        {
            "section_name": "Phrasal verbs",
            "words": vocab_list[60:76]
        },
        {
            "section_name": "Phrases, patterns and collocations",
            "words": vocab_list[76:96]
        },
        {
            "section_name": "Idioms",
            "words": vocab_list[96:106]
        },
        {
            "section_name": "Word formation",
            "words": vocab_list[106:126]
        }
    ]

    final_json = {
        "unit_id": 26,
        "unit_type": "Vocabulary",
        "title": "Preference and leisure activities",
        "vocabulary_sections": vocab_sections,
        "exercises": exercises
    }

    with open(output_path, 'w') as f:
        json.dump(final_json, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
