import base64
import json
import logging
import re
from typing import List, Optional
import httpx
from pydantic import BaseModel, Field

from app.services.ocr.base import OCRProvider, OCRDocumentData, OCRPageData, OCRLineData, BoundingBox
from app.services.ocr.fake import FakeOCRProvider
from app.services.resilience.circuit_breaker import CircuitBreaker
from app.services.resilience.retry import retry_with_backoff

logger = logging.getLogger(__name__)

class GeminiLineSchema(BaseModel):
    line_no: int
    text: str
    bbox_ymin: float = Field(..., ge=0.0, le=1.0)
    bbox_xmin: float = Field(..., ge=0.0, le=1.0)
    bbox_ymax: float = Field(..., ge=0.0, le=1.0)
    bbox_xmax: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(default=0.92, ge=0.0, le=1.0)
    script_or_lang: str = Field(default="Devanagari")

class GeminiOCRResponseSchema(BaseModel):
    detected_script: str = "Devanagari"
    lines: List[GeminiLineSchema] = Field(default_factory=list)

class GeminiVisionOCR(OCRProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.0-flash"):
        self.api_key = api_key or ""
        self.model_name = model_name
        self._circuit_breaker = CircuitBreaker("gemini_vision_ocr", failure_threshold=3, recovery_time=20.0)
        self._fake_fallback = FakeOCRProvider()

    @property
    def name(self) -> str:
        return "gemini_vision"

    async def recognise(
        self,
        image_bytes: bytes,
        lang_hints: Optional[List[str]] = None,
        mime: str = "image/jpeg"
    ) -> OCRDocumentData:
        if not self.api_key:
            logger.info("GeminiVisionOCR: No GEMINI_API_KEY set, utilizing deterministic fallback provider.")
            return await self._fake_fallback.recognise(image_bytes, lang_hints, mime)

        async def _call_api():
            b64_image = base64.b64encode(image_bytes).decode("utf-8")
            hint_str = ", ".join(lang_hints) if lang_hints else "Devanagari, Gujarati, Sanskrit, English"

            prompt = (
                f"You are a specialized epigraphy and historical document OCR system for Indian manuscripts, inscriptions, and field scans.\n"
                f"Language hints: {hint_str}.\n"
                f"Extract every line of text in reading order with its bounding box coordinates in normalized range [0.0, 1.0].\n"
                f"Return strictly valid JSON matching this schema:\n"
                f"{{\n"
                f'  "detected_script": "Devanagari" | "Gujarati" | "Latin" | "Sharada" | "Grantha" | "Other",\n'
                f'  "lines": [\n'
                f'    {{\n'
                f'      "line_no": 1,\n'
                f'      "text": "Exact text with Unicode NFC and correct matras",\n'
                f'      "bbox_ymin": 0.10,\n'
                f'      "bbox_xmin": 0.08,\n'
                f'      "bbox_ymax": 0.17,\n'
                f'      "bbox_xmax": 0.92,\n'
                f'      "confidence": 0.95,\n'
                f'      "script_or_lang": "hi" | "gu" | "sa" | "en"\n'
                f'    }}\n'
                f'  ]\n'
                f"}}\n"
                f"Do not include markdown code fences or conversational prose. Output strictly the JSON object."
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime,
                                    "data": b64_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "response_mime_type": "application/json"
                }
            }

            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Gemini API returned status {res.status_code}: {res.text[:300]}")
                data = res.json()
                text_part = data["candidates"][0]["content"]["parts"][0]["text"]
                return text_part

        try:
            raw_json = await self._circuit_breaker.call(
                retry_with_backoff,
                _call_api,
                max_retries=2,
                base_delay=1.0,
                operation_name="gemini_ocr_call"
            )

            # Strip possible markdown code blocks if model adds them
            clean_json = re.sub(r"^```(?:json)?\s*", "", raw_json.strip())
            clean_json = re.sub(r"\s*```$", "", clean_json)

            parsed = GeminiOCRResponseSchema.model_validate_json(clean_json)

            lines: List[OCRLineData] = []
            for item in parsed.lines:
                # Convert ymin, xmin, ymax, xmax to x, y, w, h
                x = min(item.bbox_xmin, item.bbox_xmax)
                y = min(item.bbox_ymin, item.bbox_ymax)
                w = max(0.01, abs(item.bbox_xmax - item.bbox_xmin))
                h = max(0.01, abs(item.bbox_ymax - item.bbox_ymin))

                lines.append(
                    OCRLineData(
                        line_no=item.line_no,
                        text=item.text.strip(),
                        bbox=BoundingBox(x=x, y=y, w=w, h=h),
                        confidence=round(item.confidence, 3),
                        lang=item.script_or_lang.lower(),
                        engine=self.name
                    )
                )

            page = OCRPageData.create(page_no=1, width=1200, height=1600, lines=lines)
            return OCRDocumentData.from_pages(pages=[page], detected_script=parsed.detected_script, engine_name=self.name)

        except Exception as exc:
            logger.warning("GeminiVisionOCR failed with %s: %s. Using fallback.", type(exc).__name__, exc)
            return await self._fake_fallback.recognise(image_bytes, lang_hints, mime)
