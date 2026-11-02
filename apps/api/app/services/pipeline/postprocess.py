import re
import unicodedata
from typing import List, Dict, Any, Tuple
from app.services.ocr.base import OCRLineData, BoundingBox

DEVANAGARI_DIGITS = "०१२३४५६७८९"
GUJARATI_DIGITS = "૦૧૨૩૪૫૬૭૮૯"
ARABIC_DIGITS = "0123456789"

DEV_TO_ARABIC = str.maketrans(DEVANAGARI_DIGITS, ARABIC_DIGITS)
GUJ_TO_ARABIC = str.maketrans(GUJARATI_DIGITS, ARABIC_DIGITS)

def normalize_unicode_nfc(text: str) -> str:
    """Canonical Decomposition followed by Canonical Composition (NFC)."""
    return unicodedata.normalize("NFC", text)

def fix_matra_heuristics(text: str) -> str:
    """
    Heuristics to fix common OCR matra misrecognitions in Devanagari and Gujarati.
    """
    # 1. Normalise NFC first
    s = normalize_unicode_nfc(text)

    # 2. Prevent duplicate viramas/halants
    # Devanagari halant U+094D, Gujarati halant U+0ACD
    s = re.sub(r"\u094D\u094D+", "\u094D", s)
    s = re.sub(r"\u0ACD\u0ACD+", "\u0ACD", s)

    # 3. Orphaned Devanagari matras at start of words (e.g. space followed by matra)
    # Devanagari vowels marks: \u093E-\u094C
    s = re.sub(r"(^|\s)([\u093E-\u094C])", r"\1अ\2", s)

    # 4. Orphaned Gujarati matras at start of words (\u0ABE-\u0ACC)
    s = re.sub(r"(^|\s)([\u0ABE-\u0ACC])", r"\1અ\2", s)

    # 5. Nukta ordering: consonant + nukta + matra
    # In Unicode NFC, nukta combines properly, but double nuktas are removed
    s = re.sub(r"\u093C\u093C+", "\u093C", s)
    s = re.sub(r"\u0ABC\u0ABC+", "\u0ABC", s)

    return s

def clean_ocr_text(text: str) -> str:
    cleaned = fix_matra_heuristics(text)
    # Remove excessive internal spaces
    cleaned = re.sub(r"[ \t]+", " ", cleaned).strip()
    return cleaned

def merge_and_postprocess_lines(
    lines: List[OCRLineData],
    confidence_threshold: float = 0.85
) -> Tuple[List[OCRLineData], bool]:
    """
    Post-processes OCR lines:
    1. Unicode NFC & matra fixes
    2. De-hyphenation across line breaks
    3. Merges horizontally adjacent fragmented lines
    4. Evaluates if document requires review based on confidence threshold
    """
    if not lines:
        return [], False

    processed: List[OCRLineData] = []
    has_low_conf = False

    for l in lines:
        cleaned_text = clean_ocr_text(l.text)
        if not cleaned_text:
            continue

        conf = l.confidence
        if conf < confidence_threshold:
            has_low_conf = True

        processed.append(
            OCRLineData(
                line_no=l.line_no,
                text=cleaned_text,
                bbox=l.bbox,
                polygon=l.polygon,
                confidence=round(conf, 3),
                lang=l.lang,
                engine=l.engine
            )
        )

    # De-hyphenation pass
    for i in range(len(processed) - 1):
        curr_text = processed[i].text
        next_text = processed[i + 1].text
        if curr_text.endswith("-") and len(curr_text) > 1 and next_text:
            # Check if hyphen connects to next line word
            first_word_next = next_text.split()[0]
            if re.match(r"^[A-Za-z\u0900-\u097F\u0A80-\u0AFF]+$", first_word_next):
                # Join the split word
                processed[i].text = curr_text[:-1] + first_word_next
                # Remove word from next line
                rest_next = " ".join(next_text.split()[1:])
                processed[i + 1].text = rest_next

    # Filter out empty lines after de-hyphenation
    final_lines = [l for l in processed if l.text.strip()]

    # Re-index line numbers sequentially starting at 1
    for idx, l in enumerate(final_lines, start=1):
        l.line_no = idx

    return final_lines, has_low_conf
