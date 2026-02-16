import os
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from bson import Binary

# Test env must be set before importing app settings/app modules.
os.environ["MONGODB_URI"] = "mongomock://localhost"
os.environ["MONGODB_DB"] = "jpee_test"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "7"
os.environ["OPENAI_API_KEY"] = ""

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.client import create_mongo_client
from app.db.indexes import ensure_indexes
from app.main import create_app


@pytest.fixture
def anyio_backend():
    return "asyncio"


def seed_test_data(db) -> None:
    now = datetime.now(timezone.utc)

    db.users.delete_many({})
    db.classes.delete_many({})
    db.tests.delete_many({})
    db.test_attempts.delete_many({})
    db.lesson_plans.delete_many({})
    db.library_items.delete_many({})
    db.library_files.delete_many({})
    db.library_downloads.delete_many({})
    db.student_doubts.delete_many({})
    db.content_items.delete_many({})
    db.notifications.delete_many({})
    db.feedback.delete_many({})
    db.activity_logs.delete_many({})
    db.billing_reports.delete_many({})
    db.usage_metrics.delete_many({})
    db.refresh_tokens.delete_many({})

    user_result = db.users.insert_many(
        [
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
        ]
    )
    teacher_id = str(user_result.inserted_ids[1])
    student_id = str(user_result.inserted_ids[2])

    class_result = db.classes.insert_one(
        {
            "name": "JEE 2026 Batch A",
            "subject": "Physics",
            "year": "12th",
            "teacher_id": teacher_id,
            "student_ids": [student_id],
            "students": 1,
            "avg_score": 78,
            "created_at": now,
            "updated_at": now,
        }
    )
    class_id = str(class_result.inserted_id)

    test_result = db.tests.insert_many(
        [
            {
                "title": "JEE Main Mock Test #12",
                "subject": "Physics",
                "difficulty": "Medium",
                "questions": 30,
                "duration": 60,
                "status": "assigned",
                "assigned": True,
                "students": 1,
                "assigned_to_class_ids": [class_id],
                "creator_id": teacher_id,
                "year": "12th",
                "created_at": now - timedelta(days=2),
            },
            {
                "title": "Chemistry Practice",
                "subject": "Chemistry",
                "difficulty": "Hard",
                "questions": 40,
                "duration": 90,
                "status": "assigned",
                "assigned": True,
                "students": 1,
                "assigned_to_class_ids": [class_id],
                "creator_id": teacher_id,
                "year": "12th",
                "created_at": now - timedelta(days=1),
            },
        ]
    )
    physics_test_id = str(test_result.inserted_ids[0])

    db.test_attempts.insert_many(
        [
            {
                "student_id": student_id,
                "test_id": physics_test_id,
                "subject": "Physics",
                "score": 88,
                "status": "submitted",
                "total_questions": 30,
                "correct_answers": 24,
                "incorrect_answers": 4,
                "unattempted": 2,
                "submitted_at": now - timedelta(days=1),
            },
            {
                "student_id": student_id,
                "test_id": "legacy-chemistry",
                "subject": "Chemistry",
                "score": 75,
                "status": "submitted",
                "total_questions": 40,
                "correct_answers": 30,
                "incorrect_answers": 6,
                "unattempted": 4,
                "submitted_at": now - timedelta(days=1),
            },
            {
                "student_id": student_id,
                "test_id": "legacy-maths",
                "subject": "Mathematics",
                "score": 30,
                "status": "submitted",
                "total_questions": 40,
                "correct_answers": 12,
                "incorrect_answers": 16,
                "unattempted": 12,
                "submitted_at": now - timedelta(days=1),
            },
        ]
    )

    db.lesson_plans.insert_one(
        {
            "subject": "Physics",
            "year": "12th",
            "topic": "Electrostatics",
            "objectives": ["Understand Coulomb law"],
            "activities": ["Numericals"],
            "duration": 60,
            "status": "published",
            "teacher_id": teacher_id,
            "created_at": now,
            "updated_at": now,
        }
    )

    seeded_pdf_content = b"%PDF-1.4\n% Seeded PDF content for tests.\n"
    seeded_qbank_content = b"Seeded question bank file for tests.\nLine 2.\n"

    library_result = db.library_items.insert_many(
        [
            {
                "title": "NCERT Physics Class 12",
                "subject": "Physics",
                "type": "PDF",
                "chapters": 15,
                "year": "12th",
                "status": "approved",
                "teacher_id": teacher_id,
                "uploaded_by_name": "Dr. Sharma",
                "file_name": "ncert-physics-class-12.pdf",
                "file_content_type": "application/pdf",
                "file_size_bytes": len(seeded_pdf_content),
                "created_at": now,
                "updated_at": now,
            },
            {
                "title": "Previous Year Questions",
                "subject": "All",
                "type": "Question Bank",
                "chapters": 10,
                "year": "12th",
                "status": "approved",
                "teacher_id": teacher_id,
                "uploaded_by_name": "Dr. Sharma",
                "file_name": "previous-year-questions.txt",
                "file_content_type": "text/plain; charset=utf-8",
                "file_size_bytes": len(seeded_qbank_content),
                "created_at": now,
                "updated_at": now,
            },
        ]
    )
    db.library_files.insert_many(
        [
            {
                "library_item_id": str(library_result.inserted_ids[0]),
                "filename": "ncert-physics-class-12.pdf",
                "content_type": "application/pdf",
                "size_bytes": len(seeded_pdf_content),
                "data": Binary(seeded_pdf_content),
                "created_at": now,
                "updated_at": now,
            },
            {
                "library_item_id": str(library_result.inserted_ids[1]),
                "filename": "previous-year-questions.txt",
                "content_type": "text/plain; charset=utf-8",
                "size_bytes": len(seeded_qbank_content),
                "data": Binary(seeded_qbank_content),
                "created_at": now,
                "updated_at": now,
            },
        ]
    )

    db.content_items.insert_many(
        [
            {
                "title": "Rotation Dynamics - Notes",
                "uploaded_by_name": "Dr. Sharma",
                "subject": "Physics",
                "date": "Feb 10, 2026",
                "status": "pending",
                "created_at": now,
                "updated_at": now,
            },
            {
                "title": "Integration Shortcuts",
                "uploaded_by_name": "Prof. Verma",
                "subject": "Mathematics",
                "date": "Feb 8, 2026",
                "status": "approved",
                "created_at": now,
                "updated_at": now,
            },
        ]
    )

    db.notifications.insert_many(
        [
            {
                "user_id": student_id,
                "title": "New Test Assigned",
                "message": "JEE Main Mock Test #12 has been assigned.",
                "type": "test",
                "read": False,
                "created_at": now - timedelta(hours=2),
            },
            {
                "user_id": teacher_id,
                "title": "Paper Assigned Successfully",
                "message": "Mock test was assigned to class.",
                "type": "test",
                "read": False,
                "created_at": now - timedelta(hours=3),
            },
        ]
    )

    db.activity_logs.insert_many(
        [
            {
                "text": "Dr. Sharma created JEE Main Mock #12",
                "type": "paper",
                "created_at": now - timedelta(hours=2),
            },
            {
                "text": "15 students completed Physics Unit Test",
                "type": "test",
                "created_at": now - timedelta(hours=4),
            },
        ]
    )

    db.usage_metrics.insert_many(
        [
            {"month": "Jan", "tests": 70, "papers": 20, "order": 1},
            {"month": "Feb", "tests": 38, "papers": 14, "order": 2},
        ]
    )

    db.billing_reports.insert_one(
        {
            "plan": "Institution Pro",
            "students_allowed": 500,
            "students_used": 300,
            "monthly_usage": [
                {"month": "Jan", "tests": 70, "papers": 20},
                {"month": "Feb", "tests": 38, "papers": 14},
            ],
            "renewal_date": "Mar 15, 2026",
            "created_at": now,
        }
    )


@pytest.fixture
def app():
    get_settings.cache_clear()
    app = create_app()

    settings = get_settings()
    client = create_mongo_client(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    ensure_indexes(db)

    app.state.mongo_client = client
    app.state.db = db

    seed_test_data(db)

    yield app

    client.close()


@pytest.fixture
async def async_client(app):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def admin_headers(async_client) -> dict[str, str]:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@jpee.com", "password": "admin12345"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def teacher_headers(async_client) -> dict[str, str]:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "sharma@example.com", "password": "password123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def student_headers(async_client) -> dict[str, str]:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "rahul@example.com", "password": "password123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
