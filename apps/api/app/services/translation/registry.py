import logging
import os

from app.core.config import settings
from app.services.translation.base import TranslationProvider
from app.services.translation.fake import FakeTranslationProvider
from app.services.translation.gemini_translation import GeminiTranslationProvider

logger = logging.getLogger(__name__)

def get_translation_provider(engine_name: str | None = None) -> TranslationProvider:
    selected = (engine_name or os.getenv("TRANSLATION_ENGINE") or getattr(settings, "TRANSLATION_PROVIDER", "gemini")).lower()

    if selected in ("fake", "mock", "test"):
        return FakeTranslationProvider()
    elif selected in ("gemini", "neural"):
        if settings.GEMINI_API_KEY:
            return GeminiTranslationProvider(api_key=settings.GEMINI_API_KEY)
        return FakeTranslationProvider()
    else:
        logger.warning("Unknown translation engine '%s'. Falling back to FakeTranslationProvider.", selected)
        return FakeTranslationProvider()
