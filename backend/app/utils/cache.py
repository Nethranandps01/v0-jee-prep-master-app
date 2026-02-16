import time
from typing import Any, Dict, Optional, Tuple

class SimpleTTLCache:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl = ttl_seconds
        self.cache: Dict[str, Tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        value, timestamp = self.cache[key]
        if time.time() - timestamp > self.ttl:
            del self.cache[key]
            return None
        return value

    def set(self, key: str, value: Any):
        self.cache[key] = (value, time.time())

    def clear(self):
        self.cache.clear()

# Global instances for different domains
student_cache = SimpleTTLCache(ttl_seconds=30)
teacher_cache = SimpleTTLCache(ttl_seconds=30)
admin_cache = SimpleTTLCache(ttl_seconds=60)
planner_cache = SimpleTTLCache(ttl_seconds=300) # Planner assessment is heavy, cache longer
