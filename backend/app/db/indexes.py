from pymongo.database import Database


_THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30



def ensure_indexes(db: Database) -> None:
    db.users.create_index("email", unique=True)
    db.users.create_index([("role", 1), ("status", 1)])
    db.users.create_index([("created_at", -1)])
    db.users.create_index([("role", 1), ("status", 1), ("subject", 1)])
    db.users.create_index([("role", 1), ("status", 1), ("year", 1)])

    db.refresh_tokens.create_index("token_hash", unique=True)
    # TTL index; token docs are auto-removed after expiry by MongoDB.
    db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    db.refresh_tokens.create_index([("user_id", 1), ("revoked_at", 1), ("expires_at", 1)])

    db.tests.create_index([("status", 1), ("year", 1), ("subject", 1)])
    db.tests.create_index([("creator_id", 1), ("created_at", -1)])
    # Student access patterns: assigned/active tests by class membership or legacy year assignment.
    db.tests.create_index([("status", 1), ("assigned_to_class_ids", 1), ("created_at", -1)])
    db.tests.create_index([("assigned", 1), ("year", 1), ("status", 1), ("created_at", -1)])
    db.tests.create_index([("status", 1), ("subject", 1), ("created_at", -1)])
    # Student test attempt access patterns
    db.test_attempts.create_index([("student_id", 1), ("test_id", 1)])
    # Explicit simple indexes requested for optimization
    db.test_attempts.create_index([("student_id", 1), ("status", 1)])
    db.test_attempts.create_index([("student_id", 1), ("submitted_at", -1)])
    db.test_attempts.create_index([("student_id", 1), ("status", 1), ("submitted_at", -1)])
    db.test_attempts.create_index([("student_id", 1), ("score", -1)])
    db.test_attempts.create_index([("submitted_at", -1)])
    db.test_attempts.create_index([("subject", 1), ("submitted_at", -1)])
    db.test_attempts.create_index([("score", 1)])
    # Added for optimized leaderboard aggregation
    db.test_attempts.create_index([("status", 1), ("submitted_at", -1), ("score", -1)]) 
    db.test_attempts.create_index([("student_id", 1), ("status", 1), ("updated_at", -1)])
    
    db.tests.create_index([("created_at", -1)])

    db.content_items.create_index([("status", 1), ("subject", 1), ("created_at", -1)])
    db.content_items.create_index([("updated_at", -1)])
    db.classes.create_index([("teacher_id", 1), ("created_at", -1)])
    db.lesson_plans.create_index([("teacher_id", 1), ("year", 1), ("created_at", -1)])
    db.library_items.create_index([("subject", 1), ("year", 1), ("created_at", -1)])
    db.library_items.create_index([("teacher_id", 1), ("created_at", -1)])
    db.library_items.create_index([("status", 1), ("year", 1), ("subject", 1), ("created_at", -1)])
    db.library_files.create_index([("library_item_id", 1)], unique=True)
    db.library_files.create_index([("created_at", -1)])
    db.library_downloads.create_index([("student_id", 1), ("library_item_id", 1)], unique=True)
    db.library_downloads.create_index([("student_id", 1), ("updated_at", -1)])
    db.library_downloads.create_index([("updated_at", -1)])
    db.student_doubts.create_index([("student_id", 1), ("created_at", -1)])
    db.feedback.create_index([("created_at", -1)])
    db.notifications.create_index([("user_id", 1), ("read", 1), ("created_at", -1)])
    db.activity_logs.create_index([("created_at", -1)])
    db.classes.create_index([("subject", 1)])
    db.classes.create_index("student_ids")
    db.settings.create_index([("key", 1)], unique=True)
    db.billing_reports.create_index([("created_at", -1)])
    db.chat_sessions.create_index([("student_id", 1), ("updated_at", -1)])
    db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])

    # Auto-expire chat history after 30 days from creation.
    # TTL cleanup is performed by MongoDB in the background.
    db.chat_sessions.create_index("created_at", expireAfterSeconds=_THIRTY_DAYS_SECONDS)
    db.chat_messages.create_index("created_at", expireAfterSeconds=_THIRTY_DAYS_SECONDS)
