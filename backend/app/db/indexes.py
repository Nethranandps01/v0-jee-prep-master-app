from pymongo.database import Database



def ensure_indexes(db: Database) -> None:
    db.users.create_index("email", unique=True)
    db.users.create_index([("role", 1), ("status", 1)])

    db.refresh_tokens.create_index("token_hash", unique=True)
    # TTL index; token docs are auto-removed after expiry by MongoDB.
    db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)

    db.tests.create_index([("status", 1), ("year", 1), ("subject", 1)])
    db.tests.create_index([("creator_id", 1), ("created_at", -1)])
    db.test_attempts.create_index([("student_id", 1), ("test_id", 1)])
    db.test_attempts.create_index([("student_id", 1), ("status", 1), ("submitted_at", -1)])

    db.content_items.create_index([("status", 1), ("subject", 1), ("created_at", -1)])
    db.classes.create_index([("teacher_id", 1), ("created_at", -1)])
    db.lesson_plans.create_index([("teacher_id", 1), ("year", 1), ("created_at", -1)])
    db.library_items.create_index([("subject", 1), ("year", 1), ("created_at", -1)])
    db.library_items.create_index([("teacher_id", 1), ("created_at", -1)])
    db.library_files.create_index([("library_item_id", 1)], unique=True)
    db.library_files.create_index([("created_at", -1)])
    db.library_downloads.create_index([("student_id", 1), ("library_item_id", 1)], unique=True)
    db.library_downloads.create_index([("student_id", 1), ("updated_at", -1)])
    db.student_doubts.create_index([("student_id", 1), ("created_at", -1)])
    db.notifications.create_index([("user_id", 1), ("read", 1), ("created_at", -1)])
    db.activity_logs.create_index([("created_at", -1)])
