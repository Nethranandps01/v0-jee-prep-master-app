from __future__ import annotations

from datetime import datetime, timedelta, timezone

from bson import Binary

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.client import create_mongo_client
from app.db.indexes import ensure_indexes


def reset_collections(db) -> None:
    collections = [
        "users",
        "refresh_tokens",
        "classes",
        "tests",
        "test_attempts",
        "lesson_plans",
        "library_items",
        "library_files",
        "library_downloads",
        "student_doubts",
        "content_items",
        "notifications",
        "feedback",
        "billing_reports",
        "activity_logs",
        "usage_metrics",
    ]
    for name in collections:
        db[name].delete_many({})


def seed_users(db) -> dict[str, str]:
    now = datetime.now(timezone.utc)

    users = [
        {
            "name": "Principal",
            "email": "admin@jpee.com",
            "password_hash": get_password_hash("admin12345"),
            "role": "admin",
            "status": "active",
            "subject": None,
            "year": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Dr. Sharma",
            "email": "sharma@example.com",
            "password_hash": get_password_hash("password123"),
            "role": "teacher",
            "status": "active",
            "subject": "Physics",
            "year": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Dr. Gupta",
            "email": "gupta@example.com",
            "password_hash": get_password_hash("password123"),
            "role": "teacher",
            "status": "active",
            "subject": "Chemistry",
            "year": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Prof. Verma",
            "email": "verma@example.com",
            "password_hash": get_password_hash("password123"),
            "role": "teacher",
            "status": "active",
            "subject": "Mathematics",
            "year": None,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Rahul Kumar",
            "email": "rahul@example.com",
            "password_hash": get_password_hash("password123"),
            "role": "student",
            "status": "active",
            "subject": None,
            "year": "12th",
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Priya Singh",
            "email": "priya@example.com",
            "password_hash": get_password_hash("password123"),
            "role": "student",
            "status": "active",
            "subject": None,
            "year": "12th",
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Amit Verma",
            "email": "amit@example.com",
            "password_hash": get_password_hash("password123"),
            "role": "student",
            "status": "active",
            "subject": None,
            "year": "11th",
            "created_at": now,
            "updated_at": now,
        },
    ]

    result = db.users.insert_many(users)
    return {
        users[index]["email"]: str(inserted_id)
        for index, inserted_id in enumerate(result.inserted_ids)
    }


def seed_classes(db, user_ids: dict[str, str]) -> None:
    db.classes.insert_many(
        [
            {
                "name": "JEE 2026 Batch A",
                "subject": "Physics",
                "year": "12th",
                "teacher_id": user_ids["sharma@example.com"],
                "student_ids": [user_ids["rahul@example.com"], user_ids["priya@example.com"]],
                "students": 2,
                "avg_score": 78,
                "created_at": datetime.now(timezone.utc),
            },
            {
                "name": "JEE 2026 Batch B",
                "subject": "Chemistry",
                "year": "12th",
                "teacher_id": user_ids["gupta@example.com"],
                "student_ids": [user_ids["rahul@example.com"]],
                "students": 1,
                "avg_score": 72,
                "created_at": datetime.now(timezone.utc),
            },
            {
                "name": "JEE 2027 Foundation",
                "subject": "Mathematics",
                "year": "11th",
                "teacher_id": user_ids["verma@example.com"],
                "student_ids": [user_ids["amit@example.com"]],
                "students": 1,
                "avg_score": 65,
                "created_at": datetime.now(timezone.utc),
            },
        ]
    )


def seed_tests_and_attempts(db, user_ids: dict[str, str]) -> None:
    now = datetime.now(timezone.utc)
    physics_class_ids = [
        str(cls["_id"])
        for cls in db.classes.find(
            {"teacher_id": user_ids["sharma@example.com"], "subject": "Physics", "year": "12th"},
            {"_id": 1},
        )
    ]
    chemistry_class_ids = [
        str(cls["_id"])
        for cls in db.classes.find(
            {"teacher_id": user_ids["gupta@example.com"], "subject": "Chemistry", "year": "12th"},
            {"_id": 1},
        )
    ]
    test_docs = [
        {
            "title": "JEE Main Mock Test #12",
            "subject": "Physics",
            "difficulty": "Medium",
            "questions": 75,
            "duration": 180,
            "status": "assigned",
            "year": "12th",
            "assigned": True,
            "students": 2,
            "creator_id": user_ids["sharma@example.com"],
            "assigned_to_class_ids": physics_class_ids,
            "created_at": now - timedelta(days=4),
        },
        {
            "title": "Mechanics & Thermodynamics",
            "subject": "Physics",
            "difficulty": "Hard",
            "questions": 30,
            "duration": 60,
            "status": "completed",
            "year": "12th",
            "assigned": True,
            "students": 2,
            "creator_id": user_ids["sharma@example.com"],
            "assigned_to_class_ids": physics_class_ids,
            "created_at": now - timedelta(days=7),
        },
        {
            "title": "Organic Chemistry Marathon",
            "subject": "Chemistry",
            "difficulty": "Medium",
            "questions": 40,
            "duration": 90,
            "status": "completed",
            "year": "12th",
            "assigned": True,
            "students": 2,
            "creator_id": user_ids["gupta@example.com"],
            "assigned_to_class_ids": chemistry_class_ids,
            "created_at": now - timedelta(days=8),
        },
        {
            "title": "Calculus & Algebra",
            "subject": "Mathematics",
            "difficulty": "Easy",
            "questions": 25,
            "duration": 45,
            "status": "assigned",
            "year": "12th",
            "assigned": False,
            "students": 0,
            "creator_id": user_ids["verma@example.com"],
            "assigned_to_class_ids": [],
            "created_at": now - timedelta(days=2),
        },
    ]
    inserted = db.tests.insert_many(test_docs)

    attempt_docs = [
        {
            "student_id": user_ids["rahul@example.com"],
            "test_id": str(inserted.inserted_ids[1]),
            "subject": "Physics",
            "score": 87,
            "status": "submitted",
            "total_questions": 30,
            "correct_answers": 24,
            "incorrect_answers": 3,
            "unattempted": 3,
            "submitted_at": now - timedelta(days=6),
        },
        {
            "student_id": user_ids["rahul@example.com"],
            "test_id": str(inserted.inserted_ids[2]),
            "subject": "Chemistry",
            "score": 72,
            "status": "submitted",
            "total_questions": 40,
            "correct_answers": 28,
            "incorrect_answers": 8,
            "unattempted": 4,
            "submitted_at": now - timedelta(days=5),
        },
        {
            "student_id": user_ids["priya@example.com"],
            "test_id": str(inserted.inserted_ids[1]),
            "subject": "Physics",
            "score": 62,
            "status": "submitted",
            "total_questions": 30,
            "correct_answers": 19,
            "incorrect_answers": 9,
            "unattempted": 2,
            "submitted_at": now - timedelta(days=6),
        },
        {
            "student_id": user_ids["priya@example.com"],
            "test_id": str(inserted.inserted_ids[2]),
            "subject": "Chemistry",
            "score": 81,
            "status": "submitted",
            "total_questions": 40,
            "correct_answers": 31,
            "incorrect_answers": 6,
            "unattempted": 3,
            "submitted_at": now - timedelta(days=5),
        },
        {
            "student_id": user_ids["amit@example.com"],
            "test_id": str(inserted.inserted_ids[2]),
            "subject": "Mathematics",
            "score": 35,
            "status": "submitted",
            "total_questions": 40,
            "correct_answers": 12,
            "incorrect_answers": 18,
            "unattempted": 10,
            "submitted_at": now - timedelta(days=4),
        },
    ]
    db.test_attempts.insert_many(attempt_docs)


def seed_content_and_activity(db) -> None:
    now = datetime.now(timezone.utc)
    db.content_items.insert_many(
        [
            {
                "title": "Rotation Dynamics - Notes",
                "uploaded_by_name": "Dr. Sharma",
                "subject": "Physics",
                "date": "Feb 10, 2026",
                "status": "pending",
                "teacher_id": None,
                "library_item_id": None,
                "created_at": now - timedelta(hours=10),
                "updated_at": now - timedelta(hours=10),
            },
            {
                "title": "Organic Reactions Flowchart",
                "uploaded_by_name": "Dr. Gupta",
                "subject": "Chemistry",
                "date": "Feb 9, 2026",
                "status": "pending",
                "teacher_id": None,
                "library_item_id": None,
                "created_at": now - timedelta(hours=20),
                "updated_at": now - timedelta(hours=20),
            },
            {
                "title": "Integration Shortcuts PDF",
                "uploaded_by_name": "Prof. Verma",
                "subject": "Mathematics",
                "date": "Feb 8, 2026",
                "status": "approved",
                "teacher_id": None,
                "library_item_id": None,
                "created_at": now - timedelta(days=2),
                "updated_at": now - timedelta(days=2),
            },
        ]
    )


def seed_reports(db) -> None:
    db.usage_metrics.insert_many(
        [
            {"month": "Sep", "tests": 45, "papers": 12, "order": 1},
            {"month": "Oct", "tests": 52, "papers": 15, "order": 2},
            {"month": "Nov", "tests": 68, "papers": 18, "order": 3},
            {"month": "Dec", "tests": 40, "papers": 10, "order": 4},
            {"month": "Jan", "tests": 75, "papers": 22, "order": 5},
            {"month": "Feb", "tests": 38, "papers": 14, "order": 6},
        ]
    )

    db.billing_reports.insert_one(
        {
            "plan": "Institution Pro",
            "students_allowed": 500,
            "students_used": 485,
            "monthly_usage": [
                {"month": "Sep", "tests": 45, "papers": 12},
                {"month": "Oct", "tests": 52, "papers": 15},
                {"month": "Nov", "tests": 68, "papers": 18},
                {"month": "Dec", "tests": 40, "papers": 10},
                {"month": "Jan", "tests": 75, "papers": 22},
                {"month": "Feb", "tests": 38, "papers": 14},
            ],
            "renewal_date": "Mar 15, 2026",
            "created_at": datetime.now(timezone.utc),
        }
    )


def seed_lessons_and_library(db, user_ids: dict[str, str]) -> None:
    now = datetime.now(timezone.utc)
    db.lesson_plans.insert_many(
        [
            {
                "subject": "Physics",
                "year": "11th",
                "topic": "Newton's Laws of Motion",
                "objectives": ["Understand laws", "Apply laws"],
                "activities": ["Demo", "Problem-solving"],
                "duration": 90,
                "status": "published",
                "teacher_id": user_ids["sharma@example.com"],
                "created_at": now,
            },
            {
                "subject": "Chemistry",
                "year": "12th",
                "topic": "Coordination Compounds",
                "objectives": ["Nomenclature", "Crystal field"],
                "activities": ["Exercises", "Quiz"],
                "duration": 75,
                "status": "published",
                "teacher_id": user_ids["gupta@example.com"],
                "created_at": now,
            },
        ]
    )

    library_docs = [
        {
            "title": "NCERT Physics Class 12",
            "subject": "Physics",
            "type": "PDF",
            "chapters": 15,
            "year": "12th",
            "status": "approved",
            "teacher_id": user_ids["sharma@example.com"],
            "uploaded_by_name": "Dr. Sharma",
            "created_at": now,
            "updated_at": now,
        },
        {
            "title": "Previous Year Questions (2015-2025)",
            "subject": "All",
            "type": "Question Bank",
            "chapters": 10,
            "year": "12th",
            "status": "approved",
            "teacher_id": user_ids["gupta@example.com"],
            "uploaded_by_name": "Dr. Gupta",
            "created_at": now,
            "updated_at": now,
        },
    ]

    inserted = db.library_items.insert_many(library_docs)
    library_file_docs = []
    for index, library_id in enumerate(inserted.inserted_ids):
        item = library_docs[index]
        if item["type"] == "PDF":
            filename = "ncert-physics-class-12.pdf"
            content_type = "application/pdf"
            content = (
                b"%PDF-1.4\n"
                b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
                b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R>>endobj\n"
                b"4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 36 100 Td (NCERT Physics Class 12) Tj ET\nendstream\nendobj\n"
                b"xref\n0 5\n0000000000 65535 f \n"
                b"0000000010 00000 n \n0000000053 00000 n \n0000000104 00000 n \n0000000191 00000 n \n"
                b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n286\n%%EOF\n"
            )
        else:
            filename = "previous-year-questions-2015-2025.txt"
            content_type = "text/plain; charset=utf-8"
            content = (
                "Previous Year Questions (2015-2025)\n"
                "Subject coverage: Physics, Chemistry, Mathematics\n"
                "This is a seeded sample question bank for demo downloads.\n"
            ).encode("utf-8")

        library_file_docs.append(
            {
                "library_item_id": str(library_id),
                "filename": filename,
                "content_type": content_type,
                "size_bytes": len(content),
                "data": Binary(content),
                "created_at": now,
                "updated_at": now,
            }
        )
        db.library_items.update_one(
            {"_id": library_id},
            {
                "$set": {
                    "file_name": filename,
                    "file_content_type": content_type,
                    "file_size_bytes": len(content),
                    "updated_at": now,
                }
            },
        )

    db.library_files.insert_many(library_file_docs)

    content_docs = []
    for index, library_id in enumerate(inserted.inserted_ids):
        item = library_docs[index]
        content_docs.append(
            {
                "title": item["title"],
                "uploaded_by_name": item["uploaded_by_name"],
                "subject": item["subject"],
                "date": now.strftime("%b %d, %Y"),
                "status": item["status"],
                "library_item_id": str(library_id),
                "teacher_id": item["teacher_id"],
                "created_at": now,
                "updated_at": now,
            }
        )

    db.content_items.insert_many(content_docs)


def seed_notifications(db, user_ids: dict[str, str]) -> None:
    now = datetime.now(timezone.utc)
    db.notifications.insert_many(
        [
            {
                "user_id": user_ids["rahul@example.com"],
                "title": "New Test Assigned",
                "message": "JEE Main Mock Test #12 has been assigned.",
                "type": "test",
                "read": False,
                "created_at": now - timedelta(hours=2),
            },
            {
                "user_id": user_ids["rahul@example.com"],
                "title": "Results Ready",
                "message": "Mechanics & Thermodynamics test results are ready.",
                "type": "result",
                "read": False,
                "created_at": now - timedelta(days=1),
            },
            {
                "user_id": user_ids["sharma@example.com"],
                "title": "Paper Assigned Successfully",
                "message": "JEE Main Mock Test #12 assigned to Batch A.",
                "type": "test",
                "read": False,
                "created_at": now - timedelta(hours=3),
            },
        ]
    )


def main() -> None:
    settings = get_settings()
    client = create_mongo_client(settings.mongodb_uri)
    db = client[settings.mongodb_db]

    ensure_indexes(db)
    reset_collections(db)

    user_ids = seed_users(db)
    seed_classes(db, user_ids)
    seed_tests_and_attempts(db, user_ids)
    seed_content_and_activity(db)
    seed_reports(db)
    seed_lessons_and_library(db, user_ids)
    seed_notifications(db, user_ids)

    print("Seed completed.")
    print("Admin login: admin@jpee.com / admin12345")
    print("Teacher login: sharma@example.com / password123")
    print("Student login: rahul@example.com / password123")

    client.close()


if __name__ == "__main__":
    main()
