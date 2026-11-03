import asyncio
import logging
import time
from collections.abc import Callable
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreakerOpenException(Exception):
    def __init__(self, service_name: str, retry_after: float):
        super().__init__(f"Circuit breaker for '{service_name}' is OPEN. Retry after {retry_after:.1f}s.")
        self.service_name = service_name
        self.retry_after = retry_after

class CircuitBreaker:
    def __init__(
        self,
        service_name: str,
        failure_threshold: int = 5,
        recovery_time: float = 30.0,
        half_open_max_trials: int = 2
    ):
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time
        self.half_open_max_trials = half_open_max_trials

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.successful_trials = 0
        self._lock = asyncio.Lock()

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        async with self._lock:
            now = time.time()
            if self.state == CircuitState.OPEN:
                elapsed = now - self.last_failure_time
                if elapsed > self.recovery_time:
                    logger.info("CircuitBreaker[%s]: transitioning from OPEN to HALF_OPEN", self.service_name)
                    self.state = CircuitState.HALF_OPEN
                    self.successful_trials = 0
                else:
                    raise CircuitBreakerOpenException(self.service_name, self.recovery_time - elapsed)

        start_t = time.time()
        try:
            result = await func(*args, **kwargs)
            latency_ms = (time.time() - start_t) * 1000.0
            logger.info("CircuitBreaker[%s]: call succeeded in %.1fms", self.service_name, latency_ms)

            async with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.successful_trials += 1
                    if self.successful_trials >= self.half_open_max_trials:
                        logger.info("CircuitBreaker[%s]: recovered, state is now CLOSED", self.service_name)
                        self.state = CircuitState.CLOSED
                        self.failure_count = 0
                elif self.state == CircuitState.CLOSED:
                    self.failure_count = 0

            return result
        except Exception as exc:
            latency_ms = (time.time() - start_t) * 1000.0
            logger.error("CircuitBreaker[%s]: call failed after %.1fms: %s", self.service_name, latency_ms, exc)

            async with self._lock:
                self.failure_count += 1
                self.last_failure_time = time.time()
                if self.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN) and self.failure_count >= self.failure_threshold:
                    logger.warning("CircuitBreaker[%s]: failure threshold reached (%d). State is now OPEN", self.service_name, self.failure_count)
                    self.state = CircuitState.OPEN
            raise
