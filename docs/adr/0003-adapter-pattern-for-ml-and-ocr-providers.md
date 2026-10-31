# ADR 003: Adapter Pattern for ML, OCR, and LLM Providers

## Status
Accepted

## Context
Deploying heritage archiving systems in academic and field environments involves unpredictable compute constraints: air-gapped museums lack external API connectivity; production cloud deployments need state-of-the-art vision-LLMs (Gemini Flash); and continuous integration (CI) test runners require deterministic, instantaneous test mocks without API keys or credit consumption.

## Decision
We implemented abstract base provider interfaces (`BaseOCRProvider`, `BaseTranslationProvider`, `BaseEmbeddingProvider`, `BaseLLMProvider`) following the Adapter Pattern. Concrete implementations include:
1. `GeminiVisionOCRProvider` & `GeminiLLMProvider`: Hosted multi-modal API calls.
2. `TesseractOCRProvider`: On-premise open-source OCR using `hin/guj/san/mar` traineddata.
3. `DeterministicNeuralProvider` / `MockOCRProvider`: Offline deterministic engines for reproducible unit testing, benchmark evaluation, and offline field demos.

Provider selection is governed by environment variables (`OCR_PROVIDER`, `LLM_PROVIDER`, etc.) and injected via FastAPI dependency injection.

## Consequences
- **Positive:** Unit tests run in under 0.4 seconds with zero external network calls.
- **Positive:** Seamless migration path from local testing to commercial cloud deployment.
- **Trade-off:** Minimal overhead of interface maintenance and mock data synchronization.
