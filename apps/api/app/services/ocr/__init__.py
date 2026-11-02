from app.services.ocr.base import (
    OCRProvider,
    BoundingBox,
    OCRLineData,
    OCRPageData,
    OCRDocumentData
)
from app.services.ocr.gemini_vision import GeminiVisionOCR
from app.services.ocr.tesseract import TesseractOCR
from app.services.ocr.fake import FakeOCRProvider
from app.services.ocr.registry import get_ocr_provider

__all__ = [
    "OCRProvider",
    "BoundingBox",
    "OCRLineData",
    "OCRPageData",
    "OCRDocumentData",
    "GeminiVisionOCR",
    "TesseractOCR",
    "FakeOCRProvider",
    "get_ocr_provider"
]
