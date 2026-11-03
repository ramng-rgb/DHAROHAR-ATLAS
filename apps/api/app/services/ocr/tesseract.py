import io
import logging
import shutil

from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

from app.services.ocr.base import (
    BoundingBox,
    OCRDocumentData,
    OCRLineData,
    OCRPageData,
    OCRProvider,
)
from app.services.ocr.fake import FakeOCRProvider

logger = logging.getLogger(__name__)

class TesseractOCR(OCRProvider):
    def __init__(self, tesseract_cmd: str | None = None):
        self._cmd = tesseract_cmd or shutil.which("tesseract") or "/opt/homebrew/bin/tesseract" or "/usr/local/bin/tesseract"
        if pytesseract and self._cmd and shutil.which(self._cmd):
            pytesseract.pytesseract.tesseract_cmd = self._cmd
        self._fake_fallback = FakeOCRProvider()

    @property
    def name(self) -> str:
        return "tesseract"

    def is_available(self) -> bool:
        if not pytesseract:
            return False
        return bool(shutil.which(self._cmd))

    async def recognise(
        self,
        image_bytes: bytes,
        lang_hints: list[str] | None = None,
        mime: str = "image/jpeg"
    ) -> OCRDocumentData:
        if not self.is_available():
            logger.warning("Tesseract binary not found at %s. Falling back to FakeOCR.", self._cmd)
            return await self._fake_fallback.recognise(image_bytes, lang_hints, mime)

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_w, img_h = image.size

            # Map language hints to tesseract lang codes
            # hin = Hindi, guj = Gujarati, san = Sanskrit, mar = Marathi, eng = English
            lang_codes = []
            if lang_hints:
                for h in lang_hints:
                    hl = h.lower()
                    if "guj" in hl:
                        lang_codes.append("guj")
                    elif "san" in hl:
                        lang_codes.append("san")
                    elif "mar" in hl:
                        lang_codes.append("mar")
                    elif "hi" in hl or "dev" in hl:
                        lang_codes.append("hin")
                    elif "en" in hl:
                        lang_codes.append("eng")

            # Check available installed langs
            try:
                installed_langs = pytesseract.get_languages()
            except Exception:
                installed_langs = ["eng"]

            valid_langs = [l for l in lang_codes if l in installed_langs]
            if not valid_langs:
                # Default preference
                for pref in ["hin", "guj", "san", "eng"]:
                    if pref in installed_langs:
                        valid_langs.append(pref)
            if not valid_langs:
                valid_langs = ["eng"]

            tess_lang = "+".join(valid_langs)

            data = pytesseract.image_to_data(
                image,
                lang=tess_lang,
                output_type=pytesseract.Output.DICT
            )

            # Group words by (block_num, par_num, line_num)
            grouped: dict[tuple, list[dict]] = {}
            n_boxes = len(data["text"])
            for i in range(n_boxes):
                text = (data["text"][i] or "").strip()
                if not text:
                    continue
                conf = float(data["conf"][i])
                if conf < 0:
                    continue

                key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
                if key not in grouped:
                    grouped[key] = []
                grouped[key].append({
                    "text": text,
                    "left": data["left"][i],
                    "top": data["top"][i],
                    "width": data["width"][i],
                    "height": data["height"][i],
                    "conf": conf
                })

            lines: list[OCRLineData] = []
            line_idx = 1
            for key, words in grouped.items():
                line_text = " ".join([w["text"] for w in words]).strip()
                if not line_text:
                    continue

                min_x = min(w["left"] for w in words)
                min_y = min(w["top"] for w in words)
                max_x = max(w["left"] + w["width"] for w in words)
                max_y = max(w["top"] + w["height"] for w in words)

                norm_x = min_x / img_w
                norm_y = min_y / img_h
                norm_w = (max_x - min_x) / img_w
                norm_h = (max_y - min_y) / img_h

                mean_conf = sum(w["conf"] for w in words) / len(words) / 100.0  # tesseract conf is 0-100

                lines.append(
                    OCRLineData(
                        line_no=line_idx,
                        text=line_text,
                        bbox=BoundingBox(x=norm_x, y=norm_y, w=norm_w, h=norm_h),
                        confidence=round(mean_conf, 3),
                        lang=valid_langs[0],
                        engine=self.name
                    )
                )
                line_idx += 1

            if not lines:
                logger.info("Tesseract produced 0 text lines. Using fallback.")
                return await self._fake_fallback.recognise(image_bytes, lang_hints, mime)

            page = OCRPageData.create(page_no=1, width=img_w, height=img_h, lines=lines)
            return OCRDocumentData.from_pages(pages=[page], detected_script=valid_langs[0], engine_name=self.name)

        except Exception as exc:
            logger.error("TesseractOCR execution error: %s. Using fallback.", exc)
            return await self._fake_fallback.recognise(image_bytes, lang_hints, mime)
