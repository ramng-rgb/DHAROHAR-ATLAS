# Stage 1: Build virtual environment
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev git curl && \
    rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt /build/
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt greenlet

# Stage 2: Runtime image
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime dependencies + Tesseract OCR Indic language packs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    tesseract-ocr \
    tesseract-ocr-hin \
    tesseract-ocr-guj \
    tesseract-ocr-san \
    tesseract-ocr-mar \
    tesseract-ocr-eng && \
    rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Create non-root user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

# Copy application code and seed data
COPY --chown=appuser:appgroup apps/api /app/
COPY --chown=appuser:appgroup data /data/
COPY --chown=appuser:appgroup db /db/

# Prepare writable storage directory
RUN mkdir -p /data/documents && chown -R appuser:appgroup /data

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "-b", "0.0.0.0:8000", "--access-logfile", "-", "app.main:app"]
