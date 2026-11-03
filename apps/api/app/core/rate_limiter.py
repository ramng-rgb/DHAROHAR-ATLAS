import json
import logging
import math
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any
from fastapi import Request
from app.core.config import settings

logger = logging.getLogger("dharohar.ratelimiter")

class EndpointCategory(str, Enum):
    AUTH = "auth"
    AUTHENTICATED = "authenticated"
    PUBLIC = "public"
    EXEMPT = "exempt"

@dataclass
class RateLimitResult:
    allowed: bool
    category: EndpointCategory
    limit: int
    remaining: int
    reset_seconds: int
    retry_after: int = 0
    backoff_seconds: float = 0.0
    reason: str | None = None

RateLimitDecision = RateLimitResult

class TieredRateLimiter:
    """
    Tiered, production-grade rate limiter:
    1. Authentication Routes: Strictest limits (per-IP + per-account) with exponential backoff.
    2. Public Endpoints: Moderate limits per-IP for anonymous traffic.
    3. Authenticated Actions: Looser limits for verified users/researchers.
    4. Exempt: Health, readiness probes, internal metrics, and static assets.
    """
    def __init__(self):
        # In-memory sliding window history
        # Keys:
        # auth_ip:<ip> -> [t1, t2, ...]
        # auth_account:<account_id> -> [t1, t2, ...]
        # pub_ip:<ip> -> [t1, t2, ...]
        # user:<user_id> -> [t1, t2, ...]
        self._history: dict[str, list[float]] = {}
        
        # Exponential backoff expiration timestamps
        # Keys:
        # backoff_ip:<ip> -> timestamp
        # backoff_account:<account_id> -> timestamp
        self._backoffs: dict[str, float] = {}

    def reset(self) -> None:
        """Clear all rate limit state (useful for test isolation)."""
        self._history.clear()
        self._backoffs.clear()

    def classify_endpoint(self, path: str, request: Request) -> EndpointCategory:
        # 1. Exempt routes
        if path in ("/health", "/ready", "/metrics", "/favicon.ico") or \
           path.startswith("/docs") or path.startswith("/redoc") or \
           path.startswith("/models") or path.startswith("/data") or \
           path.endswith("/openapi.json"):
            return EndpointCategory.EXEMPT

        # 2. Authentication routes
        auth_subpaths = (
            "/api/v1/auth/login",
            "/api/v1/auth/signup",
            "/api/v1/auth/register",
            "/api/v1/auth/password-reset",
            "/api/v1/auth/reset-password",
            "/api/v1/auth/token",
            "/auth/login",
            "/auth/signup",
            "/auth/password-reset",
        )
        if any(path == p or path.startswith(p + "/") for p in auth_subpaths):
            return EndpointCategory.AUTH

        # 3. Authenticated User Action
        auth_header = request.headers.get("Authorization", "").strip()
        user_header = request.headers.get("X-User-ID", "").strip()
        if (auth_header.startswith("Bearer ") and len(auth_header) > 10) or user_header:
            return EndpointCategory.AUTHENTICATED

        # 4. Standard Public Endpoint
        return EndpointCategory.PUBLIC

    def extract_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    def extract_account_identifier(self, request: Request, body_bytes: bytes | None = None) -> str | None:
        # 1. From custom headers
        account_header = request.headers.get("X-Account-ID") or request.headers.get("X-User-Email")
        if account_header:
            return account_header.strip().lower()

        # 2. From query parameters
        account_query = request.query_params.get("email") or request.query_params.get("account")
        if account_query:
            return account_query.strip().lower()

        # 3. From request JSON body if available
        if body_bytes:
            try:
                payload = json.loads(body_bytes.decode("utf-8"))
                if isinstance(payload, dict):
                    val = payload.get("email") or payload.get("username") or payload.get("account_id") or payload.get("account")
                    if val and isinstance(val, str):
                        return val.strip().lower()
            except Exception:
                pass

        return None

    def _check_exponential_backoff(
        self,
        key: str,
        now: float,
        limit: int,
        base_backoff: float,
        max_backoff: float,
        window: int,
        attempts: list[float]
    ) -> tuple[bool, int, float, str | None]:
        """
        Calculates exponential backoff based on excess attempts over threshold.
        Returns: (is_limited, retry_after, backoff_seconds, reason)
        """
        # Check threshold and escalate exponential backoff on excess attempts
        if len(attempts) > limit:
            excess = len(attempts) - limit
            # Exponential backoff formula: base_backoff * (2 ** (excess - 1))
            # e.g. with base=2.0s: 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 300s
            backoff_duration = min(max_backoff, base_backoff * (2.0 ** (excess - 1)))
            self._backoffs[key] = max(self._backoffs.get(key, 0.0), now + backoff_duration)
            rem = backoff_duration
            return (
                True,
                math.ceil(rem),
                rem,
                f"Rate limit exceeded ({limit} attempts allowed). Exponential backoff of {rem:.1f}s applied."
            )

        # Active backoff check if still within backoff period
        backoff_until = self._backoffs.get(key, 0.0)
        if now < backoff_until:
            rem = backoff_until - now
            return True, math.ceil(rem), rem, f"Active exponential backoff in effect ({rem:.1f}s remaining)"

        return False, 0, 0.0, None

    async def evaluate_request(
        self,
        request: Request,
        body_bytes: bytes | None = None
    ) -> RateLimitResult:
        path = request.url.path
        now = time.time()
        category = self.classify_endpoint(path, request)

        # Master switch check
        if not settings.RATE_LIMIT_ENABLED:
            return RateLimitResult(
                allowed=True,
                category=EndpointCategory.EXEMPT,
                limit=-1,
                remaining=-1,
                reset_seconds=0
            )

        # 1. Exempt routes
        if category == EndpointCategory.EXEMPT:
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=-1,
                remaining=-1,
                reset_seconds=0
            )

        client_ip = self.extract_client_ip(request)

        # 2. Authentication routes (Strict + Exponential Backoff on IP & Account)
        if category == EndpointCategory.AUTH:
            account_id = self.extract_account_identifier(request, body_bytes)
            window = settings.RATE_LIMIT_AUTH_WINDOW_SECONDS
            cutoff = now - window

            ip_key = f"auth_ip:{client_ip}"
            ip_attempts = [t for t in self._history.get(ip_key, []) if t > cutoff]
            ip_attempts.append(now)
            self._history[ip_key] = ip_attempts

            # Evaluate per-IP backoff
            ip_limited, ip_retry, ip_backoff, ip_reason = self._check_exponential_backoff(
                key=f"backoff_ip:{client_ip}",
                now=now,
                limit=settings.RATE_LIMIT_AUTH_PER_IP,
                base_backoff=settings.RATE_LIMIT_AUTH_BASE_BACKOFF,
                max_backoff=settings.RATE_LIMIT_AUTH_MAX_BACKOFF,
                window=window,
                attempts=ip_attempts
            )

            # Evaluate per-Account backoff if account is identified
            account_limited, acct_retry, acct_backoff, acct_reason = False, 0, 0.0, None
            if account_id:
                acct_key = f"auth_account:{account_id}"
                acct_attempts = [t for t in self._history.get(acct_key, []) if t > cutoff]
                acct_attempts.append(now)
                self._history[acct_key] = acct_attempts

                account_limited, acct_retry, acct_backoff, acct_reason = self._check_exponential_backoff(
                    key=f"backoff_account:{account_id}",
                    now=now,
                    limit=settings.RATE_LIMIT_AUTH_PER_ACCOUNT,
                    base_backoff=settings.RATE_LIMIT_AUTH_BASE_BACKOFF,
                    max_backoff=settings.RATE_LIMIT_AUTH_MAX_BACKOFF,
                    window=window,
                    attempts=acct_attempts
                )

            # Combine: stricter rule wins
            if account_limited or ip_limited:
                retry_after = max(acct_retry, ip_retry)
                backoff_sec = max(acct_backoff, ip_backoff)
                reason = acct_reason if account_limited else ip_reason
                limit = settings.RATE_LIMIT_AUTH_PER_ACCOUNT if account_limited else settings.RATE_LIMIT_AUTH_PER_IP
                return RateLimitResult(
                    allowed=False,
                    category=category,
                    limit=limit,
                    remaining=0,
                    reset_seconds=retry_after,
                    retry_after=retry_after,
                    backoff_seconds=backoff_sec,
                    reason=reason
                )

            # Remaining calculation
            remaining_ip = max(0, settings.RATE_LIMIT_AUTH_PER_IP - len(ip_attempts))
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=settings.RATE_LIMIT_AUTH_PER_IP,
                remaining=remaining_ip,
                reset_seconds=window
            )

        # 3. Authenticated User Actions (Loosest limits)
        if category == EndpointCategory.AUTHENTICATED:
            user_id = request.headers.get("X-User-ID") or request.headers.get("Authorization", "")[-16:] or client_ip
            limit = settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE
            window = 60
            cutoff = now - window

            key = f"user:{user_id}"
            history = [t for t in self._history.get(key, []) if t > cutoff]
            if len(history) >= limit:
                retry_after = math.ceil(window - (now - history[0]))
                return RateLimitResult(
                    allowed=False,
                    category=category,
                    limit=limit,
                    remaining=0,
                    reset_seconds=retry_after,
                    retry_after=retry_after,
                    reason="Authenticated user rate limit exceeded"
                )

            history.append(now)
            self._history[key] = history
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=limit,
                remaining=limit - len(history),
                reset_seconds=window
            )

        # 4. Public Endpoints (Moderate limits)
        limit = settings.RATE_LIMIT_PUBLIC_PER_MINUTE
        window = 60
        cutoff = now - window

        key = f"pub_ip:{client_ip}"
        history = [t for t in self._history.get(key, []) if t > cutoff]
        if len(history) >= limit:
            retry_after = math.ceil(window - (now - history[0]))
            return RateLimitResult(
                allowed=False,
                category=category,
                limit=limit,
                remaining=0,
                reset_seconds=retry_after,
                retry_after=retry_after,
                reason="Public endpoint rate limit exceeded"
            )

        history.append(now)
        self._history[key] = history
        return RateLimitResult(
            allowed=True,
            category=category,
            limit=limit,
            remaining=limit - len(history),
            reset_seconds=window
        )

# Global singleton
tiered_rate_limiter = TieredRateLimiter()
