import json
import logging
import re

import httpx
from app.services.resilience.circuit_breaker import CircuitBreaker
from app.services.resilience.retry import retry_with_backoff
from app.services.translation.base import (
    TranslationInputLine,
    TranslationOutputLine,
    TranslationProvider,
    TranslationResult,
)
from app.services.translation.fake import FakeTranslationProvider
from app.services.translation.glossary import GLOSSARY_PROMPT_INSTRUCTION
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class TranslatedLineSchema(BaseModel):
    line_no: int
    translated_text: str

class BatchTranslationSchema(BaseModel):
    lines: list[TranslatedLineSchema]

class GeminiTranslationProvider(TranslationProvider):
    def __init__(self, api_key: str | None = None, model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key or ""
        self.model_name = model_name
        self._circuit_breaker = CircuitBreaker("gemini_translation", failure_threshold=3, recovery_time=20.0)
        self._fake_fallback = FakeTranslationProvider()

    @property
    def name(self) -> str:
        return "gemini_translation"

    async def translate_line(self, text: str, source_lang: str, target_lang: str = "en") -> str:
        res = await self.translate_batch([TranslationInputLine(line_no=1, text=text)], source_lang, target_lang)
        if res.lines:
            return res.lines[0].translated_text
        return text

    async def translate_batch(
        self,
        lines: list[TranslationInputLine],
        source_lang: str,
        target_lang: str = "en"
    ) -> TranslationResult:
        if not lines:
            return TranslationResult(lines=[], engine=self.name, target_lang=target_lang)

        if not self.api_key:
            logger.info("GeminiTranslationProvider: No GEMINI_API_KEY set, using fallback.")
            return await self._fake_fallback.translate_batch(lines, source_lang, target_lang)

        async def _call_api():
            input_items = [{"line_no": l.line_no, "text": l.text} for l in lines]
            prompt = (
                f"You are a scholar of Indian epigraphy, architectural history, and translation.\n"
                f"{GLOSSARY_PROMPT_INSTRUCTION}\n"
                f"Translate the following lines from {source_lang} to {target_lang}.\n"
                f"CRITICAL REQUIREMENT: You MUST maintain exact 1:1 line alignment. The output MUST contain exactly {len(lines)} lines matching each input line_no.\n"
                f"Input lines:\n{json.dumps(input_items, ensure_ascii=False, indent=2)}\n\n"
                f"Return strictly valid JSON matching this schema:\n"
                f"{{\n"
                f'  "lines": [\n'
                f'    {{"line_no": 1, "translated_text": "..."}}\n'
                f"  ]\n"
                f"}}\n"
                f"Output strictly the JSON object without markdown code blocks."
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "response_mime_type": "application/json"
                }
            }

            async with httpx.AsyncClient(timeout=40.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Gemini Translation API error {res.status_code}: {res.text[:300]}")
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

        try:
            raw_json = await self._circuit_breaker.call(
                retry_with_backoff,
                _call_api,
                max_retries=2,
                base_delay=1.0,
                operation_name="gemini_translation"
            )

            clean_json = re.sub(r"^```(?:json)?\s*", "", raw_json.strip())
            clean_json = re.sub(r"\s*```$", "", clean_json)

            parsed = BatchTranslationSchema.model_validate_json(clean_json)

            # Validate line count alignment
            parsed_dict = {item.line_no: item.translated_text for item in parsed.lines}

            output_lines: list[TranslationOutputLine] = []
            for l in lines:
                translated = parsed_dict.get(l.line_no)
                if not translated:
                    # Line was dropped or misnumbered; translate individual line via fallback
                    logger.warning("Gemini dropped line_no %d in batch; using fallback for line", l.line_no)
                    translated = await self._fake_fallback.translate_line(l.text, source_lang, target_lang)

                output_lines.append(
                    TranslationOutputLine(
                        line_no=l.line_no,
                        source_text=l.text,
                        translated_text=translated,
                        target_lang=target_lang,
                        engine=self.name
                    )
                )

            return TranslationResult(lines=output_lines, engine=self.name, target_lang=target_lang)

        except Exception as exc:
            logger.warning("GeminiTranslationProvider failed with %s: %s. Using fallback.", type(exc).__name__, exc)
            return await self._fake_fallback.translate_batch(lines, source_lang, target_lang)
