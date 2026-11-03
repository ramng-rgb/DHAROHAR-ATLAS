import json
import logging
import math
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from fastapi import Request
from app.core.config import settings
from app.core.redis_cache import get_redis_client

logger = logging.getLogger("dharohar.ratelimiter")

class EndpointCategory(str, Enum):
    AUTH = "auth"
    AUTHENTICATED = "authenticated"
    EXPENSIVE = "expensive"
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
    Tiered, production-grade rate limiter with Redis backing and in-memory fallback:
    1. Authentication Routes: Strictest limits (per-IP + per-account) with exponential backoff.
    2. Expensive Endpoints (/search/ask, /search hybrid, OCR uploads, jobs): 30 req/min + daily quotas.
    3. Public Endpoints: Moderate limits per-IP for anonymous traffic.
    4. Authenticated Actions: Looser limits for verified users/researchers.
    5. Exempt: Health, readiness probes, internal metrics, and static assets.
    """
    def __init__(self):
        # In-memory sliding window history fallback
        self._history: dict[str, list[float]] = {}
        # Exponential backoff expiration timestamps
        self._backoffs: dict[str, float] = {}
        # Daily quotas tracking in-memory fallback
        self._daily_quotas: dict[str, int] = {}

    def reset(self) -> None:
        """Clear all rate limit state (useful for test isolation)."""
        self._history.clear()
        self._backoffs.clear()
        self._daily_quotas.clear()

    def classify_endpoint(self, path: str, request: Request) -> EndpointCategory:
        # 0. Internal diagnostic / benchmark token check
        if request.headers.get("X-Internal-Token") == settings.METRICS_SECRET_KEY:
            return EndpointCategory.EXEMPT

        # 1. Exempt routes
        if path in ("/health", "/health/live", "/health/ready", "/ready", "/metrics", "/favicon.ico") or \
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

        # 3. Expensive Endpoints (/api/v1/ask, /search hybrid, OCR uploads, ingest)
        expensive_subpaths = (
            "/api/v1/ask",
            "/api/v1/search",
            "/api/v1/documents/uploads",
            "/api/v1/ingest",
        )
        if any(path == p or path.startswith(p + "/") for p in expensive_subpaths):
            return EndpointCategory.EXPENSIVE

        # 4. Authenticated User Action
        auth_header = request.headers.get("Authorization", "").strip()
        user_header = request.headers.get("X-User-ID", "").strip()
        if (auth_header.startswith("Bearer ") and len(auth_header) > 10) or user_header:
            return EndpointCategory.AUTHENTICATED

        # 5. Standard Public Endpoint
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
        account_header = request.headers.get("X-Account-ID") or request.headers.get("X-User-Email")
        if account_header:
            return account_header.strip().lower()

        account_query = request.query_params.get("email") or request.query_params.get("account")
        if account_query:
            return account_query.strip().lower()

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
        if len(attempts) > limit:
            excess = len(attempts) - limit
            backoff_duration = min(max_backoff, base_backoff * (2.0 ** (excess - 1)))
            self._backoffs[key] = max(self._backoffs.get(key, 0.0), now + backoff_duration)
            rem = backoff_duration
            return (
                True,
                math.ceil(rem),
                rem,
                f"Rate limit exceeded ({limit} attempts allowed). Exponential backoff of {rem:.1f}s applied."
            )

        backoff_until = self._backoffs.get(key, 0.0)
        if now < backoff_until:
            rem = backoff_until - now
            return True, math.ceil(rem), rem, f"Active exponential backoff in effect ({rem:.1f}s remaining)"

        return False, 0, 0.0, None

    async def _check_and_increment_redis_zset(self, key: str, now: float, window: int, limit: int) -> tuple[bool, int, int]:
        """
        Sliding window using Redis sorted sets (ZSET).
        Returns: (is_allowed, remaining, retry_after)
        """
        client = get_redis_client()
        if not client:
            return True, limit, 0
        try:
            cutoff = now - window
            pipe = client.pipeline()
            pipe.zremrangebyscore(key, 0, cutoff)
            member = f"{now:.6f}:{uuid.uuid4().hex[:6]}"
            pipe.zadd(key, {member: now})
            pipe.zcard(key)
            pipe.expire(key, window)
            res = await pipe.execute()
            count = res[2]
            if count > limit:
                # Find oldest entry
                oldest_members = await client.zrange(key, 0, 0, withscores=True)
                if oldest_members:
                    oldest_time = oldest_members[0][1]
                    retry_after = max(1, math.ceil(window - (now - oldest_time)))
                else:
                    retry_after = window
                return False, 0, retry_after
            return True, max(0, limit - count), 0
        except Exception as e:
            logger.warning(f"Redis rate limiter sliding window error: {e}")
            return True, limit, 0

    async def _check_daily_quota(self, action: str, identifier: str, max_daily: int) -> tuple[bool, int]:
        """
        Check and increment per-IP/user daily quota counter.
        Returns: (is_allowed, current_count)
        """
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        key = f"quota:{action}:{identifier}:{today_str}"
        client = get_redis_client()
        if client:
            try:
                count = await client.incr(key)
                if count == 1:
                    await client.expire(key, 86400)
                return count <= max_daily, count
            except Exception as e:
                logger.warning(f"Redis daily quota check error: {e}")

        # In-memory fallback
        curr = self._daily_quotas.get(key, 0) + 1
        self._daily_quotas[key] = curr
        return curr <= max_daily, curr

    async def _check_global_ai_cap(self) -> bool:
        """
        Check global daily AI call cap and log warning at 80%.
        Returns True if cap exceeded (trigger fallback to local/fake).
        """
        today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        key = f"quota:global_ai:{today_str}"
        cap = settings.GLOBAL_DAILY_AI_CALL_CAP
        client = get_redis_client()
        count = 1
        if client:
            try:
                count = await client.incr(key)
                if count == 1:
                    await client.expire(key, 86400)
            except Exception as e:
                logger.warning(f"Redis global AI cap error: {e}")
                count = self._daily_quotas.get(key, 0) + 1
                self._daily_quotas[key] = count
        else:
            count = self._daily_quotas.get(key, 0) + 1
            self._daily_quotas[key] = count

        if count >= int(0.8 * cap) and count < cap:
            logger.warning(f"AI daily global spending counter reached 80% threshold: {count}/{cap}")
        elif count >= cap:
            logger.warning(f"AI daily global spending cap reached: {count}/{cap}. Enabling fallback provider.")
            return True
        return False

    async def evaluate_request(
        self,
        request: Request,
        body_bytes: bytes | None = None
    ) -> RateLimitResult:
        path = request.url.path
        now = time.time()
        category = self.classify_endpoint(path, request)

        # Master switch check
        if not settings.RATE_LIMIT_ENABLED or category == EndpointCategory.EXEMPT:
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=-1,
                remaining=-1,
                reset_seconds=0
            )

        client_ip = self.extract_client_ip(request)

        # 1. Public Uploads Killswitch Check
        if (path.startswith("/api/v1/documents/uploads") or path.startswith("/api/v1/ingest")) and request.method == "POST":
            if not settings.PUBLIC_UPLOADS_ENABLED:
                return RateLimitResult(
                    allowed=False,
                    category=EndpointCategory.EXPENSIVE,
                    limit=0,
                    remaining=0,
                    reset_seconds=3600,
                    retry_after=3600,
                    reason="Public uploads are temporarily paused during judging evaluation."
                )

        # 2. Authentication routes (Strict + Exponential Backoff on IP & Account)
        if category == EndpointCategory.AUTH:
            account_id = self.extract_account_identifier(request, body_bytes)
            window = settings.RATE_LIMIT_AUTH_WINDOW_SECONDS
            cutoff = now - window

            ip_key = f"auth_ip:{client_ip}"
            ip_attempts = [t for t in self._history.get(ip_key, []) if t > cutoff]
            ip_attempts.append(now)
            self._history[ip_key] = ip_attempts

            ip_limited, ip_retry, ip_backoff, ip_reason = self._check_exponential_backoff(
                key=f"backoff_ip:{client_ip}",
                now=now,
                limit=settings.RATE_LIMIT_AUTH_PER_IP,
                base_backoff=settings.RATE_LIMIT_AUTH_BASE_BACKOFF,
                max_backoff=settings.RATE_LIMIT_AUTH_MAX_BACKOFF,
                window=window,
                attempts=ip_attempts
            )

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

            remaining_ip = max(0, settings.RATE_LIMIT_AUTH_PER_IP - len(ip_attempts))
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=settings.RATE_LIMIT_AUTH_PER_IP,
                remaining=remaining_ip,
                reset_seconds=window
            )

        # 3. Expensive Endpoints (/search/ask, /search hybrid, OCR uploads, jobs)
        if category == EndpointCategory.EXPENSIVE:
            # Check Daily Quotas
            if "/search/ask" in path:
                allowed_quota, curr_count = await self._check_daily_quota("ask", client_ip, settings.DAILY_ASK_QUOTA_PER_IP)
                if not allowed_quota:
                    return RateLimitResult(
                        allowed=False,
                        category=category,
                        limit=settings.DAILY_ASK_QUOTA_PER_IP,
                        remaining=0,
                        reset_seconds=86400,
                        retry_after=86400,
                        reason=f"Daily Ask quota exceeded ({settings.DAILY_ASK_QUOTA_PER_IP} queries/day)."
                    )
                # Check Global Cap
                cap_exceeded = await self._check_global_ai_cap()
                if cap_exceeded:
                    request.state.ai_fallback_notice = True

            elif "/uploads" in path or "/ingest" in path:
                allowed_quota, curr_count = await self._check_daily_quota("ocr", client_ip, settings.DAILY_OCR_QUOTA_PER_IP)
                if not allowed_quota:
                    return RateLimitResult(
                        allowed=False,
                        category=category,
                        limit=settings.DAILY_OCR_QUOTA_PER_IP,
                        remaining=0,
                        reset_seconds=86400,
                        retry_after=86400,
                        reason=f"Daily OCR upload quota exceeded ({settings.DAILY_OCR_QUOTA_PER_IP} uploads/day)."
                    )

            limit = settings.RATE_LIMIT_EXPENSIVE_PER_MINUTE
            window = 60
            redis_key = f"rl:exp:{client_ip}"
            allowed, remaining, retry_after = await self._check_and_increment_redis_zset(redis_key, now, window, limit)
            if not allowed:
                return RateLimitResult(
                    allowed=False,
                    category=category,
                    limit=limit,
                    remaining=0,
                    reset_seconds=retry_after,
                    retry_after=retry_after,
                    reason="Expensive endpoint rate limit exceeded"
                )

            # In-memory history sync
            cutoff = now - window
            mem_history = [t for t in self._history.get(redis_key, []) if t > cutoff]
            mem_history.append(now)
            self._history[redis_key] = mem_history
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=limit,
                remaining=remaining,
                reset_seconds=window
            )

        # 4. Authenticated User Actions (Loosest limits)
        if category == EndpointCategory.AUTHENTICATED:
            user_id = request.headers.get("X-User-ID") or request.headers.get("Authorization", "")[-16:] or client_ip
            limit = settings.RATE_LIMIT_AUTHENTICATED_PER_MINUTE
            window = 60
            redis_key = f"rl:usr:{user_id}"
            allowed, remaining, retry_after = await self._check_and_increment_redis_zset(redis_key, now, window, limit)
            if not allowed:
                return RateLimitResult(
                    allowed=False,
                    category=category,
                    limit=limit,
                    remaining=0,
                    reset_seconds=retry_after,
                    retry_after=retry_after,
                    reason="Authenticated user rate limit exceeded"
                )

            cutoff = now - window
            mem_history = [t for t in self._history.get(redis_key, []) if t > cutoff]
            mem_history.append(now)
            self._history[redis_key] = mem_history
            return RateLimitResult(
                allowed=True,
                category=category,
                limit=limit,
                remaining=remaining,
                reset_seconds=window
            )

        # 5. Public Endpoints (Moderate limits)
        limit = settings.RATE_LIMIT_PUBLIC_PER_MINUTE
        window = 60
        redis_key = f"rl:pub:{client_ip}"
        allowed, remaining, retry_after = await self._check_and_increment_redis_zset(redis_key, now, window, limit)
        if not allowed:
            return RateLimitResult(
                allowed=False,
                category=category,
                limit=limit,
                remaining=0,
                reset_seconds=retry_after,
                retry_after=retry_after,
                reason="Public endpoint rate limit exceeded"
            )

        cutoff = now - window
        mem_history = [t for t in self._history.get(redis_key, []) if t > cutoff]
        mem_history.append(now)
        self._history[redis_key] = mem_history
        return RateLimitResult(
            allowed=True,
            category=category,
            limit=limit,
            remaining=remaining,
            reset_seconds=window
        )

# Global singleton
tiered_rate_limiter = TieredRateLimiter()
