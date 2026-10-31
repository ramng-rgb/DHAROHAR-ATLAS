import pytest
from app.services.site_service import haversine_distance, SiteService
from app.services.providers import deterministic_vector, MockOCRProvider, NeuralTranslationProvider, GeminiLLMProvider

def test_haversine_distance():
    # Rani ki Vav to Modhera Sun Temple (~34 km)
    dist = haversine_distance(23.8589, 72.1017, 23.5836, 72.1333)
    assert 30.0 < dist < 40.0

    # Distance to self must be 0
    assert haversine_distance(23.8589, 72.1017, 23.8589, 72.1017) == 0.0

def test_deterministic_embedding():
    vec1 = deterministic_vector("stepwell rani ki vav solanki")
    vec2 = deterministic_vector("stepwell rani ki vav solanki")
    assert len(vec1) == 768
    assert vec1 == vec2  # Must be strictly deterministic

    # Vector norm must be approximately 1.0 (unit vector for cosine metric)
    import numpy as np
    norm = np.linalg.norm(vec1)
    assert abs(norm - 1.0) < 1e-4

@pytest.mark.asyncio
async def test_mock_ocr_provider():
    provider = MockOCRProvider()
    result = await provider.extract_text(b"fake_image_bytes", "sample_folio.jpg")
    assert len(result.lines) >= 3
    assert result.lines[0].confidence >= 0.90
    assert "पाटन" in result.lines[0].text or "अડાલજ" in result.lines[1].text

@pytest.mark.asyncio
async def test_neural_translation():
    translator = NeuralTranslationProvider()
    source_text = "सप्तभूमियुता वापी दशावतार विष्णुपूजनार्थं प्रतिष्ठापिता"
    translated = await translator.translate(source_text, "Sanskrit", "English")
    assert "seven subterranean tiers" in translated.lower()
    assert "vishnu" in translated.lower()

@pytest.mark.asyncio
async def test_llm_rag_grounded_answer():
    llm = GeminiLLMProvider(api_key="")
    # When context is empty, it must refuse to hallucinate
    refusal = await llm.generate_response("Where is Atlantis?", [])
    assert "could not find verified records" in refusal["answer"].lower()
    assert refusal["citations"] == []

    # When context is provided, it must cite records
    context = [{
        "id": "site-123",
        "title": "Rani ki Vav",
        "content_type": "site",
        "text_snippet": "Commissioned by Queen Udayamati in Patan, Solanki dynasty."
    }]
    res = await llm.generate_response("Tell me about Rani ki Vav", context)
    assert len(res["citations"]) > 0
    assert "[1]" in res["answer"]
