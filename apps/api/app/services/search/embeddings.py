import hashlib
import logging
import os
from abc import ABC, abstractmethod

import httpx
import numpy as np
from app.core.config import settings
from app.services.resilience.circuit_breaker import CircuitBreaker
from app.services.resilience.retry import retry_with_backoff

logger = logging.getLogger(__name__)

class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        pass

    @abstractmethod
    async def embed_text(self, text: str) -> list[float]:
        pass

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        pass


class FakeEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic pseudo-random embedding provider for testing and offline environments.
    Generates consistent 768-dimensional unit-length vectors with high semantic alignment
    for Indian heritage domains, multi-lingual scripts (Devanagari, Gujarati, English),
    and historical architectural concepts.
    """
    def __init__(self, dimension: int = 768):
        self._dim = dimension
        self._concept_indices = {
            # Stepwells & Water Heritage (English, Hindi, Gujarati)
            "stepwell": 0, "vav": 0, "baoli": 0, "baori": 0, "kund": 0, "kunda": 0,
            "वाव": 0, "बावड़ी": 0, "કૂવો": 0, "જળ": 0, "પાણી": 0, "water": 0, "reservoir": 0,
            # Solanki / Chaulukya / Patan / Queen Udayamati
            "solanki": 1, "chaulukya": 1, "udayamati": 1, "patan": 1, "रानी": 1, "પાટણ": 1,
            "राणी": 1, "ભીમદેવ": 1, "भीमदेव": 1, "सोलंकी": 1, "ચાલુક્ય": 1,
            # Adalaj / Rudabai / Sultanate
            "adalaj": 2, "rudabai": 2, "begada": 2, "અડાલજ": 2, "રૂડાબાઈ": 2, "रुदाबाई": 2,
            "sultanate": 2, "gandhinagar": 2,
            # Forts & Military Architecture
            "fort": 3, "kumbhalgarh": 3, "mehrangarh": 3, "jaisalmer": 3, "chittorgarh": 3,
            "दुर्ग": 3, "किला": 3, "કિલ્લો": 3, "गढ़": 3, "rampart": 3, "bastion": 3,
            # Temples & Sacred Architecture
            "temple": 4, "mandir": 4, "modhera": 4, "sun": 4, "somnath": 4, "dwarka": 4,
            "ranakpur": 4, "dilwara": 4, "मंदिर": 4, "મંદિર": 4, "सूर्य": 4, "સૂર્ય": 4,
            # Harappan / Bronze Age
            "harappan": 5, "indus": 5, "dholavira": 5, "lothal": 5, "dockyard": 5,
            "धोलावीरा": 5, "लोथल": 5, "ધોળાવીરા": 5, "સિંધુ": 5,
            # Inscriptions, Epigraphy, Manuscripts
            "inscription": 6, "epigraph": 6, "tablet": 6, "charter": 6, "copper": 6,
            "अभिलेख": 6, "शिलालेख": 6, "લિપિ": 6, "સંવત": 6, "संस्कृत": 6, "devanagari": 6,
            "gujarati": 6, "sanskrit": 6, "प्रबन्ध": 6, "merutunga": 6,
            # Folklore & Legends
            "legend": 7, "curse": 7, "tunnel": 7, "ghost": 7, "sacrifice": 7, "myth": 7,
            "कथा": 7, "वार्ता": 7, "रहस्य": 7, "શાપ": 7, "દંતકથા": 7, "folklore": 7,
            # Architectural Elements
            "jharokha": 8, "torana": 8, "mandapa": 8, "garbhagriha": 8, "shikhara": 8,
            "chhatri": 8, "bracket": 8, "स्तम्भ": 8, "મંડપ": 8, "ઝરૂખો": 8,
        }

    @property
    def name(self) -> str:
        return "fake_embedding"

    @property
    def dimension(self) -> int:
        return self._dim

    def _generate_vector(self, text: str) -> list[float]:
        clean_text = text.lower().strip()
        # Seed from sha256 of text
        h = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()
        seed_int = int(h[:8], 16)
        rng = np.random.default_rng(seed_int)
        vec = rng.standard_normal(self._dim)

        # Apply semantic domain weight activations
        matched = False
        for term, concept_id in self._concept_indices.items():
            if term in clean_text:
                matched = True
                start = concept_id * 20
                end = start + 20
                if end <= self._dim:
                    vec[start:end] += 4.5

        # Normalise to unit L2 sphere for cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    async def embed_text(self, text: str) -> list[float]:
        return self._generate_vector(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self._generate_vector(t) for t in texts]


class GeminiEmbeddingProvider(EmbeddingProvider):
    """
    Hosted Google Gemini embedding provider (text-embedding-004) with
    automatic circuit breaking, exponential backoff, and fallback to FakeEmbeddingProvider.
    """
    def __init__(self, api_key: str | None = None, model: str = "text-embedding-004"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model
        self._circuit_breaker = CircuitBreaker("gemini_embedding", failure_threshold=3, recovery_time=20.0)
        self._fake_fallback = FakeEmbeddingProvider(dimension=768)

    @property
    def name(self) -> str:
        return f"gemini_{self.model}"

    @property
    def dimension(self) -> int:
        return 768

    async def embed_text(self, text: str) -> list[float]:
        if not self.api_key:
            return await self._fake_fallback.embed_text(text)

        async def _call():
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
            payload = {
                "model": f"models/{self.model}",
                "content": {"parts": [{"text": text[:2000]}]},
                "outputDimensionality": 768
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    raise RuntimeError(f"Gemini embedding failed with HTTP {res.status_code}: {res.text}")
                data = res.json()
                values = data.get("embedding", {}).get("values", [])
                if not values:
                    raise RuntimeError("No embedding values in Gemini response")
                norm = np.linalg.norm(values)
                if norm > 0:
                    values = [v / norm for v in values]
                return values

        try:
            return await self._circuit_breaker.execute(
                lambda: retry_with_backoff(_call, max_retries=2, base_delay=0.5)
            )
        except Exception as e:
            logger.warning("GeminiEmbeddingProvider failed, using fallback: %s", e)
            return await self._fake_fallback.embed_text(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not self.api_key:
            return await self._fake_fallback.embed_batch(texts)

        results = []
        for text in texts:
            vec = await self.embed_text(text)
            results.append(vec)
        return results


def get_embedding_provider() -> EmbeddingProvider:
    provider_name = os.getenv("EMBEDDING_PROVIDER", "fake").lower()
    if provider_name == "gemini":
        return GeminiEmbeddingProvider(api_key=settings.GEMINI_API_KEY)
    return FakeEmbeddingProvider(dimension=768)
