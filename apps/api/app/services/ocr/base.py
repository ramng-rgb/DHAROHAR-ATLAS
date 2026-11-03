from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field, field_validator


class BoundingBox(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0, description="Normalized X coordinate [0.0, 1.0]")
    y: float = Field(..., ge=0.0, le=1.0, description="Normalized Y coordinate [0.0, 1.0]")
    w: float = Field(..., ge=0.0, le=1.0, description="Normalized width [0.0, 1.0]")
    h: float = Field(..., ge=0.0, le=1.0, description="Normalized height [0.0, 1.0]")

    @field_validator("x", "y", "w", "h", mode="before")
    @classmethod
    def clamp_coords(cls, v: Any) -> float:
        try:
            val = float(v)
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return 0.0

    def to_rect(self) -> dict[str, float]:
        return {"x": self.x, "y": self.y, "w": self.w, "h": self.h}

class OCRLineData(BaseModel):
    line_no: int = Field(..., ge=0)
    text: str = Field(..., min_length=1)
    bbox: BoundingBox
    polygon: list[list[float]] | None = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    lang: str = Field(default="hi")
    engine: str = Field(default="ocr_engine")

class OCRPageData(BaseModel):
    page_no: int = Field(default=1, ge=1)
    width: int = Field(default=1200, gt=0)
    height: int = Field(default=1600, gt=0)
    lines: list[OCRLineData] = Field(default_factory=list)
    mean_confidence: float = Field(default=0.9)

    @classmethod
    def create(cls, page_no: int, width: int, height: int, lines: list[OCRLineData]) -> "OCRPageData":
        if lines:
            mean_c = sum(l.confidence for l in lines) / len(lines)
        else:
            mean_c = 1.0
        return cls(page_no=page_no, width=width, height=height, lines=lines, mean_confidence=round(mean_c, 3))

class OCRDocumentData(BaseModel):
    pages: list[OCRPageData] = Field(default_factory=list)
    total_lines: int = Field(default=0)
    mean_confidence: float = Field(default=0.9)
    detected_script: str | None = None
    engine_name: str = Field(default="unknown")

    @classmethod
    def from_pages(cls, pages: list[OCRPageData], detected_script: str | None = None, engine_name: str = "ocr") -> "OCRDocumentData":
        all_lines = [l for p in pages for l in p.lines]
        total_l = len(all_lines)
        if total_l > 0:
            mean_c = sum(l.confidence for l in all_lines) / total_l
        else:
            mean_c = 1.0
        return cls(
            pages=pages,
            total_lines=total_l,
            mean_confidence=round(mean_c, 3),
            detected_script=detected_script,
            engine_name=engine_name
        )

class OCRProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def recognise(
        self,
        image_bytes: bytes,
        lang_hints: list[str] | None = None,
        mime: str = "image/jpeg"
    ) -> OCRDocumentData:
        """
        Recognises text and bounding boxes from image_bytes.
        Returns normalized OCRDocumentData.
        """
