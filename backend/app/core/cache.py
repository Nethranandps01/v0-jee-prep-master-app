import json
from datetime import timedelta
from typing import Any

import redis

from app.core.config import get_settings

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    settings = get_settings()
    url = settings.redis_url
    print("REDIS_URL", url)
    if not url:
        print("Redis disabled: REDIS_URL not set")
        return None

    try:
        _redis_client = redis.from_url(url, decode_responses=True)
        _redis_client.ping()  # verify connection once
        print(f"Redis connected: {url}")
    except Exception as exc:
        print(f"Redis connection failed for {url}: {exc}")
        _redis_client = None

    return _redis_client


def cache_get(key: str) -> Any | None:
    client = get_redis()
    if not client:
        return None
    raw = client.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: timedelta) -> None:
    client = get_redis()
    if not client:
        return
    try:
        payload = json.dumps(value, default=str)
    except TypeError:
        # Fallback: best-effort string cast
        payload = json.dumps(str(value))
    client.setex(key, int(ttl.total_seconds()), payload)


def cache_delete(key: str) -> None:
    client = get_redis()
    if not client:
        return
    client.delete(key)


def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern (e.g. prefix:*)"""
    client = get_redis()
    if not client:
        return
    keys = client.keys(pattern)
    if keys:
        client.delete(*keys)
