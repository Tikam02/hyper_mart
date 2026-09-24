import time
from collections import defaultdict

from fastapi import HTTPException, status

_hits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, max_hits: int, window_seconds: int) -> None:
    """In-memory sliding-window limiter. Single-process only — swap for Redis
    before running more than one backend worker (see PRD §9)."""
    now = time.monotonic()
    window_start = now - window_seconds
    hits = [t for t in _hits[key] if t > window_start]
    if len(hits) >= max_hits:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests, try again shortly.")
    hits.append(now)
    _hits[key] = hits
