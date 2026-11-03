from abc import ABC, abstractmethod

from pydantic import BaseModel, Field


class TranslationInputLine(BaseModel):
    line_no: int
    text: str

class TranslationOutputLine(BaseModel):
    line_no: int
    source_text: str
    translated_text: str
    target_lang: str = "en"
    engine: str = "translator"

class TranslationResult(BaseModel):
    lines: list[TranslationOutputLine] = Field(default_factory=list)
    engine: str = "translation_engine"
    target_lang: str = "en"

class TranslationProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def translate_batch(
        self,
        lines: list[TranslationInputLine],
        source_lang: str,
        target_lang: str = "en"
    ) -> TranslationResult:
        """
        Translates a batch of lines from source_lang to target_lang,
        strictly preserving 1:1 line alignment.
        """

    @abstractmethod
    async def translate_line(
        self,
        text: str,
        source_lang: str,
        target_lang: str = "en"
    ) -> str:
        pass
