from app.services.ocr.base import (
    BoundingBox,
    OCRDocumentData,
    OCRLineData,
    OCRPageData,
    OCRProvider,
)
from app.services.ocr.fake import FakeOCRProvider
from app.services.ocr.gemini_vision import GeminiVisionOCR
from app.services.ocr.registry import get_ocr_provider
from app.services.ocr.tesseract import TesseractOCR

__all__ = [
    "BoundingBox",
    "FakeOCRProvider",
    "GeminiVisionOCR",
    "OCRDocumentData",
    "OCRLineData",
    "OCRPageData",
    "OCRProvider",
    "TesseractOCR",
    "get_ocr_provider"
]
