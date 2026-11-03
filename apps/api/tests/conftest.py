import pytest
from app.core.rate_limiter import tiered_rate_limiter

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    tiered_rate_limiter.reset()
    yield
    tiered_rate_limiter.reset()
