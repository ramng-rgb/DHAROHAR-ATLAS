import json
import logging
import re
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

# Context variables for request tracing
request_id_var: ContextVar[str | None] = ContextVar("request_id_var", default=None)
user_id_var: ContextVar[str | None] = ContextVar("user_id_var", default=None)

# Redaction patterns for secrets/tokens/credentials
REDACT_PATTERNS = [
    re.compile(r'(?i)(password|secret|token|api_key|authorization)\s*[:=]\s*["\']?([^"\'\s]+)["\']?'),
    re.compile(r'(?i)bearer\s+([a-zA-Z0-9_\-\.]+)', re.IGNORECASE),
]

def redact_sensitive_data(text: str) -> str:
    """Mask sensitive credentials from log text."""
    redacted = text
    for pattern in REDACT_PATTERNS:
        redacted = pattern.sub(r'\1: [REDACTED]', redacted)
    return redacted

class JSONLogFormatter(logging.Formatter):
    """
    Structured JSON formatter ensuring machine-parseable log lines with
    per-request correlation and automatic credential redaction.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_sensitive_data(record.getMessage()),
            "request_id": request_id_var.get() or getattr(record, "request_id", None) or "system",
            "user_id": user_id_var.get() or getattr(record, "user_id", None),
            "module": record.module,
            "line": record.lineno,
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, ensure_ascii=False)

def setup_logging(level: str = "INFO") -> None:
    """Configure root logging to output structured JSON."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONLogFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())
    # Replace existing handlers
    root_logger.handlers = [handler]

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
