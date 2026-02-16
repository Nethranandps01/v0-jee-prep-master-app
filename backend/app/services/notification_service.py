from __future__ import annotations

from datetime import datetime, timezone

from pymongo.database import Database


class NotificationService:
    @staticmethod
    def create_for_user(
        db: Database,
        *,
        user_id: str,
        title: str,
        message: str,
        notification_type: str,
    ) -> None:
        doc = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "read": False,
            "created_at": datetime.now(timezone.utc),
        }
        try:
            db.notifications.insert_one(doc)
        except Exception:
            # Notifications are non-blocking.
            return

    @staticmethod
    def create_for_users(
        db: Database,
        *,
        user_ids: list[str],
        title: str,
        message: str,
        notification_type: str,
    ) -> None:
        if not user_ids:
            return

        now = datetime.now(timezone.utc)
        docs = [
            {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "read": False,
                "created_at": now,
            }
            for user_id in user_ids
        ]
        try:
            db.notifications.insert_many(docs)
        except Exception:
            return
