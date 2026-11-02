import pytest
import asyncio
from app.services.resilience.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException, CircuitState
from app.services.resilience.retry import retry_with_backoff
from app.services.ocr.fake import FakeOCRProvider
from app.services.translation.fake import FakeTranslationProvider
from app.services.translation.base import TranslationInputLine
from app.services.entities.extractor import EntityExtractionProvider, string_similarity

@pytest.mark.asyncio
async def test_circuit_breaker_state_transitions():
    cb = CircuitBreaker("test_service", failure_threshold=2, recovery_time=0.1, half_open_max_trials=1)
    assert cb.state == CircuitState.CLOSED

    async def fail_call():
        raise RuntimeError("Service failure")

    async def success_call():
        return "OK"

    # 1st failure
    with pytest.raises(RuntimeError):
        await cb.call(fail_call)
    assert cb.state == CircuitState.CLOSED

    # 2nd failure -> threshold reached -> OPEN
    with pytest.raises(RuntimeError):
        await cb.call(fail_call)
    assert cb.state == CircuitState.OPEN

    # While OPEN -> fast reject
    with pytest.raises(CircuitBreakerOpenException):
        await cb.call(success_call)

    # Wait for recovery timeout
    await asyncio.sleep(0.15)

    # Next call transitions to HALF_OPEN and succeeds -> CLOSED
    res = await cb.call(success_call)
    assert res == "OK"
    assert cb.state == CircuitState.CLOSED

@pytest.mark.asyncio
async def test_retry_with_backoff():
    attempts = 0

    async def flaky():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ValueError("Transient glitch")
        return "Recovered"

    res = await retry_with_backoff(flaky, max_retries=4, base_delay=0.01, operation_name="flaky_test")
    assert res == "Recovered"
    assert attempts == 3

@pytest.mark.asyncio
async def test_fake_ocr_provider_multilingual():
    ocr = FakeOCRProvider()

    # Devanagari
    res_hi = await ocr.recognise(b"sample", lang_hints=["hi"])
    assert res_hi.detected_script == "Devanagari"
    assert len(res_hi.pages[0].lines) >= 4
    assert "चालुक्य" in res_hi.pages[0].lines[0].text

    # Gujarati
    res_gu = await ocr.recognise(b"sample", lang_hints=["gu"])
    assert res_gu.detected_script == "Gujarati"
    assert "અડાલજ" in res_gu.pages[0].lines[1].text

    # English
    res_en = await ocr.recognise(b"sample", lang_hints=["en"])
    assert res_en.detected_script == "Latin"
    assert "ARCHAEOLOGICAL" in res_en.pages[0].lines[0].text

@pytest.mark.asyncio
async def test_translation_line_alignment():
    trans = FakeTranslationProvider()
    input_lines = [
        TranslationInputLine(line_no=1, text="ॐ स्वस्ति श्री चालुक्य राज्ञी उदयमती पाटन वापी निर्माणाय"),
        TranslationInputLine(line_no=2, text="સંવત ૧૫૫૫ વર્ષે મહા વદિ ૫ બુધે વાવ પ્રતિષ્ઠા સંપૂર્ણા")
    ]
    res = await trans.translate_batch(input_lines, source_lang="hi", target_lang="en")

    # Strictly 1:1 line alignment
    assert len(res.lines) == len(input_lines)
    assert res.lines[0].line_no == 1
    assert "Queen Udayamati" in res.lines[0].translated_text
    assert "vapi" in res.lines[0].translated_text or "stepwell" in res.lines[0].translated_text
    assert res.lines[1].line_no == 2
    assert "Samvat year 1555" in res.lines[1].translated_text

def test_string_similarity_and_matching():
    sim_exact = string_similarity("Rani ki Vav", "Rani ki Vav")
    assert sim_exact == 1.0

    sim_sub = string_similarity("Rani ki Vav", "Rani ki Vav (The Queen's Stepwell)")
    assert sim_sub >= 0.80

    sim_diff = string_similarity("Modhera Sun Temple", "Dholavira Citadel")
    assert sim_diff == 0.0

@pytest.mark.asyncio
async def test_entity_extraction_spans():
    extractor = EntityExtractionProvider(db=None)
    lines = [
        {"id": "l_1", "line_no": 1, "text": "Queen Udayamati commissioned the subterranean stepwell at Rani ki Vav in Patan."},
        {"id": "l_2", "line_no": 2, "text": "Consecrated during the Solanki reign on the banks of the Saraswati River."}
    ]

    res = await extractor.extract_and_link(lines)
    entity_names = [e.name for e in res.entities]

    assert "Rani ki Vav" in entity_names
    assert "Queen Udayamati" in entity_names
    assert "Chaulukya Dynasty" in entity_names or "Saraswati River" in entity_names

    # Verify character spans
    for m in res.mentions:
        assert m.char_start >= 0
        assert m.char_end > m.char_start
        assert m.line_id in ("l_1", "l_2")
