import pytest
import unicodedata
from app.services.ocr.base import BoundingBox, OCRLineData
from app.services.pipeline.postprocess import (
    normalize_unicode_nfc,
    fix_matra_heuristics,
    clean_ocr_text,
    merge_and_postprocess_lines
)

def test_bounding_box_clamping():
    b1 = BoundingBox(x=-0.2, y=1.5, w=0.5, h=0.3)
    assert b1.x == 0.0
    assert b1.y == 1.0
    assert b1.w == 0.5
    assert b1.h == 0.3

    b2 = BoundingBox(x=0.1, y=0.2, w=2.0, h=-0.1)
    assert b2.w == 1.0
    assert b2.h == 0.0

def test_unicode_nfc_normalization():
    # In Unicode NFC, Indic nukta letters normalize canonically to base + nukta (\u0915\u093C)
    decomposed = "\u0915\u093C"
    precomposed = "\u0958"
    assert normalize_unicode_nfc(precomposed) == "\u0915\u093C"
    assert normalize_unicode_nfc(decomposed) == "\u0915\u093C"
    assert normalize_unicode_nfc(precomposed) == normalize_unicode_nfc(decomposed)

def test_matra_heuristics_devanagari():
    # Double virama
    doubled = "श्री\u094D\u094D चालुक्य"
    fixed = fix_matra_heuristics(doubled)
    assert "\u094D\u094D" not in fixed
    assert "श्री् चालुक्य" in fixed or "श्री चालुक्य" in fixed

    # Orphaned matra at start of word
    orphaned = "निर्माणाय ो वापी"
    fixed_orph = fix_matra_heuristics(orphaned)
    assert " ओ " in fixed_orph or "अो" in fixed_orph

def test_matra_heuristics_gujarati():
    # Gujarati orphaned matra
    orphaned_guj = "વાવ ો સંપૂર્ણા"
    fixed_guj = fix_matra_heuristics(orphaned_guj)
    assert "અો" in fixed_guj or " ઓ " in fixed_guj

def test_dehyphenation_and_line_merging():
    lines = [
        OCRLineData(
            line_no=1,
            text="ARCHAEOLOGICAL SURVEY OF WEST-",
            bbox=BoundingBox(x=0.1, y=0.1, w=0.8, h=0.08),
            confidence=0.95,
            lang="en"
        ),
        OCRLineData(
            line_no=2,
            text="ERN INDIA AND GUJARAT",
            bbox=BoundingBox(x=0.1, y=0.2, w=0.8, h=0.08),
            confidence=0.96,
            lang="en"
        ),
        OCRLineData(
            line_no=3,
            text="Decayed stone pillar fragment",
            bbox=BoundingBox(x=0.1, y=0.3, w=0.8, h=0.08),
            confidence=0.72,
            lang="en"
        )
    ]

    merged, has_low = merge_and_postprocess_lines(lines, confidence_threshold=0.85)

    assert len(merged) == 3
    # Check that WEST- and ERN were united into WESTERN
    assert "WESTERN" in merged[0].text
    assert "ERN" not in merged[1].text
    assert merged[1].text == "INDIA AND GUJARAT"
    # Low confidence (<0.85) was flagged
    assert has_low is True
    # Re-indexed line numbers
    assert merged[0].line_no == 1
    assert merged[1].line_no == 2
    assert merged[2].line_no == 3
