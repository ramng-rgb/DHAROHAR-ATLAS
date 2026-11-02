import os
import logging
from typing import Optional
from app.core.config import settings
from app.services.ocr.base import OCRProvider
from app.services.ocr.gemini_vision import GeminiVisionOCR
from app.services.ocr.tesseract import TesseractOCR
from app.services.ocr.fake import FakeOCRProvider

logger = logging.getLogger(__name__)

_PROVIDER_INSTANCE: Optional[OCRProvider] = None

def get_ocr_provider(engine_name: Optional[str] = None) -> OCRProvider:
    global _PROVIDER_INSTANCE
    selected = (engine_name or os.getenv("OCR_ENGINE") or getattr(settings, "OCR_PROVIDER", "gemini")).lower()

    if selected in ("fake", "mock", "test"):
        return FakeOCRProvider()
    elif selected in ("tesseract", "tess"):
        return TesseractOCR()
    elif selected in ("gemini", "gemini_vision", "gemini_fallback"):
        # If API key is available use Gemini, otherwise Fake
        if settings.GEMINI_API_KEY:
            return GeminiVisionOCR(api_key=settings.GEMINI_API_KEY)
        # If Tesseract is available locally, we can use Tesseract, or Fake
        tess = TesseractOCR()
        if tess.is_available():
            return tess
        return FakeOCRProvider()
    else:
        logger.warning("Unknown OCR engine '%s'. Falling back to FakeOCRProvider.", selected)
        return FakeOCRProvider()
