from __future__ import annotations

from datetime import datetime, timezone

from pymongo.database import Database


class ActivityService:
    @staticmethod
    def log(
        db: Database,
        *,
        text: str,
        event_type: str,
        actor_id: str | None = None,
        actor_role: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        document = {
            "text": text,
            "type": event_type,
            "actor_id": actor_id,
            "actor_role": actor_role,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
        }
        try:
            db.activity_logs.insert_one(document)
        except Exception:
            # Activity logs must never block core operations.
            return
