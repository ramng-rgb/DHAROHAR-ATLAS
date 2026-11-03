import asyncio
import logging
import random
from collections.abc import Callable
from typing import Any

logger = logging.getLogger(__name__)

async def retry_with_backoff(
    func: Callable,
    *args,
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 8.0,
    factor: float = 2.0,
    retry_on: tuple[type[Exception], ...] = (Exception,),
    timeout_sec: float = 30.0,
    operation_name: str = "operation",
    **kwargs
) -> Any:
    delay = base_delay
    last_err = None

    for attempt in range(1, max_retries + 1):
        try:
            return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout_sec)
        except retry_on as exc:
            last_err = exc
            if attempt == max_retries:
                logger.error(
                    "Retry exhausted for %s after %d attempts. Final error: %s",
                    operation_name, attempt, exc
                )
                raise
            jitter = random.uniform(0.8, 1.2)
            sleep_time = min(delay * jitter, max_delay)
            logger.warning(
                "Attempt %d/%d for %s failed with %s: %s. Retrying in %.2fs...",
                attempt, max_retries, operation_name, type(exc).__name__, exc, sleep_time
            )
            await asyncio.sleep(sleep_time)
            delay *= factor
        except TimeoutError as exc:
            last_err = exc
            if attempt == max_retries:
                logger.error("Timeout exhausted for %s after %d attempts (%rs)", operation_name, attempt, timeout_sec)
                raise
            sleep_time = min(delay, max_delay)
            logger.warning(
                "Attempt %d/%d for %s timed out after %.1fs. Retrying in %.2fs...",
                attempt, max_retries, operation_name, timeout_sec, sleep_time
            )
            await asyncio.sleep(sleep_time)
            delay *= factor

    if last_err:
        raise last_err
