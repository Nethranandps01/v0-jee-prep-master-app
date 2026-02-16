from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import get_settings
from app.schemas.student import FeedbackRequest, SaveAnswersRequest
from app.services.activity_service import ActivityService
from app.services.ai_service import generate_chat_reply
from app.services.notification_service import NotificationService
from app.services.planner_service import PlannerService
from app.services.public_resource import PublicResourceService
from app.services.question_bank import build_question_set
from app.utils.mongo import parse_object_id, serialize_id


class StudentService:
    @staticmethod
    def home_summary(db: Database, student: dict) -> dict:
        student_id = str(student["_id"])
        year = student.get("year")
        class_ids = StudentService._student_class_ids(db, student_id)

        # 1. Counts and Averages
        stats_pipeline = [
            {"$match": {"student_id": student_id, "status": "submitted"}},
            {
                "$group": {
                    "_id": None,
                    "completed_tests": {"$sum": 1},
                    "avg_score": {"$avg": "$score"},
                }
            },
        ]
        stats = list(db.test_attempts.aggregate(stats_pipeline))
        completed_tests = stats[0]["completed_tests"] if stats else 0
        avg_score = round(float(stats[0]["avg_score"]), 1) if stats else 0.0

        # 2. Assigned tests (optimized query)
        access_clauses = []
        if class_ids: access_clauses.append({"assigned_to_class_ids": {"$in": class_ids}})
        if year: access_clauses.append({"year": year, "assigned": True, "$or": [{"assigned_to_class_ids": {"$exists": False}}, {"assigned_to_class_ids": {"$size": 0}}]})
        
        assigned_query = {"status": {"$in": ["assigned", "active"]}}
        if access_clauses: assigned_query["$or"] = access_clauses
        else: assigned_query["_id"] = {"$exists": False}
        
        assigned_tests_count = db.tests.count_documents(assigned_query)

        # 3. Streak (Minimal fetch)
        submissions = list(
            db.test_attempts.find(
                {"student_id": student_id, "status": "submitted", "submitted_at": {"$ne": None}},
                {"submitted_at": 1},
            ).sort("submitted_at", -1).limit(30) # Fetch last 30 for streak
        )
        unique_dates = []
        seen = set()
        for s in submissions:
            day = s["submitted_at"].astimezone(timezone.utc).date()
            if day not in seen:
                seen.add(day)
                unique_dates.append(day)
        
        streak = 0
        if unique_dates:
            today = datetime.now(timezone.utc).date()
            if (today - unique_dates[0]).days <= 1:
                streak = 1
                for i in range(len(unique_dates) - 1):
                    if (unique_dates[i] - unique_dates[i+1]).days == 1: streak += 1
                    else: break

        return {
            "assigned_tests": assigned_tests_count,
            "completed_tests": completed_tests,
            "avg_score": avg_score,
            "streak": streak,
        }

    @staticmethod
    def list_tests(
        db: Database,
        student: dict,
        status_filter: str | None,
        subject: str | None,
    ) -> list[dict]:
        student_id = str(student["_id"])
        year = student.get("year")
        class_ids = StudentService._student_class_ids(db, student_id)

        submitted_attempts = list(
            db.test_attempts.find(
                {"student_id": student_id, "status": "submitted"},
            ).sort("submitted_at", -1)
        )
        latest_submitted_attempt_by_test: dict[str, dict] = {}
        for attempt in submitted_attempts:
            test_id = str(attempt.get("test_id") or "")
            if not test_id or test_id in latest_submitted_attempt_by_test:
                continue
            latest_submitted_attempt_by_test[test_id] = attempt

        access_clauses: list[dict] = []
        if class_ids:
            access_clauses.append(
                {
                    "status": {"$in": ["assigned", "active"]},
                    "assigned_to_class_ids": {"$in": class_ids},
                }
            )
        if year:
            # Legacy fallback for older docs that do not store assigned class IDs.
            access_clauses.append(
                {
                    "assigned": True,
                    "year": year,
                    "status": {"$in": ["assigned", "active"]},
                    "$or": [
                        {"assigned_to_class_ids": {"$exists": False}},
                        {"assigned_to_class_ids": {"$size": 0}},
                    ],
                }
            )

        query: dict = {"$or": access_clauses} if access_clauses else {"_id": {"$exists": False}}
        if subject:
            query["subject"] = subject

        tests = list(db.tests.find(query).sort("created_at", -1))
        loaded_test_ids = {str(test["_id"]) for test in tests}

        # Always include completed tests for which the student has submitted attempts.
        for test_id in latest_submitted_attempt_by_test:
            if test_id in loaded_test_ids:
                continue
            test_doc = StudentService._find_test_by_id(db, test_id)
            if not test_doc:
                continue
            if subject and test_doc.get("subject") != subject:
                continue
            tests.append(test_doc)
            loaded_test_ids.add(test_id)

        def _created_at_key(doc: dict) -> datetime:
            created_at = doc.get("created_at")
            if isinstance(created_at, datetime):
                return created_at
            return datetime(1970, 1, 1, tzinfo=timezone.utc)

        tests.sort(key=_created_at_key, reverse=True)

        responses = []
        for test in tests:
            payload = serialize_id(test)
            attempt = latest_submitted_attempt_by_test.get(payload["id"])
            if attempt:
                payload["score"] = attempt.get("score")
                payload["attempt_id"] = str(attempt.get("_id"))
                payload["status"] = "completed"
            else:
                payload["score"] = None
                payload["attempt_id"] = None
                payload["status"] = "assigned"
            responses.append(payload)

        if status_filter:
            responses = [item for item in responses if item.get("status") == status_filter]

        return responses

    @staticmethod
    def start_test(db: Database, student: dict, test_id: str) -> dict:
        student_id = str(student["_id"])
        test_oid = parse_object_id(test_id, "test_id")

        test = db.tests.find_one({"_id": test_oid})
        if not test:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test not found")

        if not StudentService._is_test_assigned_to_student(db, student, test):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Test is not assigned to this student",
            )

        existing_submitted = db.test_attempts.find_one(
            {
                "student_id": student_id,
                "test_id": test_id,
                "status": "submitted",
            }
        )
        if existing_submitted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Test already submitted",
            )

        total_questions = int(test.get("questions", 0) or 0)
        duration = int(test.get("duration", 60) or 60)

        question_set = test.get("question_set") or []
        if not question_set:
            try:
                question_set = build_question_set(
                    str(test.get("subject", "Physics")),
                    total_questions,
                    str(test.get("difficulty", "Medium")),
                    require_ai=bool((get_settings().openai_api_key or "").strip()),
                )
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(exc),
                ) from exc
            db.tests.update_one(
                {"_id": test_oid},
                {
                    "$set": {
                        "question_set": question_set,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

        existing = db.test_attempts.find_one(
            {
                "student_id": student_id,
                "test_id": test_id,
                "status": "in_progress",
            }
        )
        if existing:
            attempt_questions = existing.get("question_set") or question_set
            existing_answers = dict(existing.get("answers", {}))
            if not existing.get("question_set"):
                db.test_attempts.update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "question_set": attempt_questions,
                            "total_questions": len(attempt_questions),
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )

            return {
                "attempt_id": str(existing["_id"]),
                "status": "in_progress",
                "started_at": existing["started_at"],
                "duration": duration,
                "questions": StudentService._public_question_set(attempt_questions),
                "answers": existing_answers,
            }

        now = datetime.now(timezone.utc)
        doc = {
            "student_id": student_id,
            "test_id": test_id,
            "subject": test.get("subject", "General"),
            "status": "in_progress",
            "answers": {},
            "question_set": question_set,
            "started_at": now,
            "submitted_at": None,
            "score": None,
            "total_questions": len(question_set),
            "correct_answers": 0,
            "incorrect_answers": 0,
            "unattempted": len(question_set),
            "updated_at": now,
        }
        result = db.test_attempts.insert_one(doc)
        return {
            "attempt_id": str(result.inserted_id),
            "status": "in_progress",
            "started_at": now,
            "duration": duration,
            "questions": StudentService._public_question_set(question_set),
            "answers": {},
        }

    @staticmethod
    def save_answers(db: Database, student: dict, attempt_id: str, payload: SaveAnswersRequest) -> dict:
        student_id = str(student["_id"])
        attempt_oid = parse_object_id(attempt_id, "attempt_id")

        attempt = db.test_attempts.find_one({"_id": attempt_oid, "student_id": student_id})
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

        if attempt.get("status") != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attempt is already submitted",
            )

        merged_answers = dict(attempt.get("answers", {}))
        normalized_answers = {
            key: StudentService._normalize_answer(value)
            for key, value in payload.answers.items()
        }
        merged_answers.update(normalized_answers)

        merged_time_spent = dict(attempt.get("time_spent", {}))
        if payload.time_spent:
            for q_id, seconds in payload.time_spent.items():
                if isinstance(seconds, int) and seconds >= 0:
                    merged_time_spent[q_id] = seconds

        db.test_attempts.update_one(
            {"_id": attempt_oid},
            {
                "$set": {
                    "answers": merged_answers,
                    "time_spent": merged_time_spent,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        return {
            "attempt_id": attempt_id,
            "saved_answers": len([value for value in merged_answers.values() if value is not None]),
        }

    @staticmethod
    def submit_attempt(
        db: Database,
        student: dict,
        attempt_id: str,
        *,
        violation_reason: str | None = None,
        time_spent: dict[str, int] | None = None,
    ) -> dict:
        student_id = str(student["_id"])
        attempt_oid = parse_object_id(attempt_id, "attempt_id")

        attempt = db.test_attempts.find_one({"_id": attempt_oid, "student_id": student_id})
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")
        
        if attempt.get("status") == "submitted":
            raise HTTPException(status_code=409, detail="Attempt already submitted")
        
        cleaned_violation_reason = (violation_reason or "").strip() or None
        if time_spent:
            db.test_attempts.update_one(
                {"_id": attempt_oid},
                {"$set": {f"time_spent.{k}": v for k, v in time_spent.items() if isinstance(v, int) and v >= 0}}
            )

        attempt = db.test_attempts.find_one({"_id": attempt_oid})  # Refresh
        auto_submitted = cleaned_violation_reason is not None

        answers = attempt.get("answers", {})
        question_set = attempt.get("question_set") or []
        if not question_set:
            test_id = str(attempt.get("test_id") or "")
            test_doc = StudentService._find_test_by_id(db, test_id)
            if test_doc:
                recovered_question_set = test_doc.get("question_set") or []
                if isinstance(recovered_question_set, list) and recovered_question_set:
                    question_set = recovered_question_set
                    db.test_attempts.update_one(
                        {"_id": attempt_oid},
                        {
                            "$set": {
                                "question_set": question_set,
                                "total_questions": len(question_set),
                                "updated_at": datetime.now(timezone.utc),
                            }
                        },
                    )

        total_questions = int(attempt.get("total_questions") or 0)
        if total_questions <= 0:
            total_questions = len(question_set)

        if question_set:
            correct_answers = 0
            answered = 0
            question_map = {
                str(question.get("id")): int(question.get("correct", -1))
                for question in question_set
            }
            for question_id, correct_option in question_map.items():
                selected = StudentService._normalize_answer(answers.get(question_id))
                if selected is None:
                    continue
                answered += 1
                if selected == correct_option:
                    correct_answers += 1

            incorrect_answers = answered - correct_answers
            unattempted = max(total_questions - answered, 0)
            score = round((correct_answers / total_questions) * 100, 1) if total_questions else 0.0
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attempt cannot be graded because answer key is missing",
            )

        submitted_at = datetime.now(timezone.utc)
        db.test_attempts.update_one(
            {"_id": attempt_oid},
            {
                "$set": {
                    "status": "submitted",
                    "score": score,
                    "correct_answers": correct_answers,
                    "incorrect_answers": incorrect_answers,
                    "unattempted": unattempted,
                    "auto_submitted": auto_submitted,
                    "violation_reason": cleaned_violation_reason,
                    "submitted_at": submitted_at,
                    "updated_at": submitted_at,
                }
            },
        )

        activity_text = f"{student.get('name', 'Student')} submitted test with score {score}%"
        if auto_submitted:
            activity_text = (
                f"{student.get('name', 'Student')} was auto-submitted for leaving test screen ({score}%)"
            )
        ActivityService.log(
            db,
            text=activity_text,
            event_type="test",
            actor_id=str(student["_id"]),
            actor_role="student",
            metadata={
                "attempt_id": attempt_id,
                "score": score,
                "subject": attempt.get("subject"),
                "auto_submitted": auto_submitted,
                "violation_reason": cleaned_violation_reason,
            },
        )

        NotificationService.create_for_user(
            db,
            user_id=str(student["_id"]),
            title="Result Ready",
            message=f"Your result is ready. Score: {score}%",
            notification_type="result",
        )

        test_doc = StudentService._find_test_by_id(db, str(attempt.get("test_id") or ""))
        teacher_id = str(test_doc.get("creator_id") or "") if test_doc else ""
        if teacher_id and auto_submitted:
            NotificationService.create_for_user(
                db,
                user_id=teacher_id,
                title="Test Auto-Submitted",
                message=(
                    f"{student.get('name', 'Student')}'s attempt for "
                    f"'{test_doc.get('title', 'a test')}' was auto-submitted for leaving the test screen."
                ),
                notification_type="test",
            )

        return {
            "attempt_id": attempt_id,
            "score": score,
            "total_questions": total_questions,
            "answered": answered,
            "correct_answers": correct_answers,
            "incorrect_answers": incorrect_answers,
            "unattempted": unattempted,
        }

    @staticmethod
    def result(db: Database, student: dict, attempt_id: str) -> dict:
        student_id = str(student["_id"])
        attempt_oid = parse_object_id(attempt_id, "attempt_id")
        attempt = db.test_attempts.find_one(
            {"_id": attempt_oid, "student_id": student_id, "status": "submitted"}
        )
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")

        answers = attempt.get("answers", {})
        question_set = attempt.get("question_set") or []

        questions: list[dict] = []
        for index, question in enumerate(question_set, start=1):
            question_id = str(question.get("id") or f"q{index}")
            selected = StudentService._normalize_answer(answers.get(question_id))
            correct_answer = int(question.get("correct", 0) or 0)
            questions.append(
                {
                    "question_id": question_id,
                    "subject": str(question.get("subject") or attempt.get("subject", "General")),
                    "question_text": str(question.get("text") or f"Question {index}"),
                    "options": [str(option) for option in (question.get("options") or [])],
                    "selected_answer": selected,
                    "correct_answer": correct_answer,
                    "is_correct": selected is not None and selected == correct_answer,
                    "explanation": str(
                        question.get("explanation")
                        or "Review the concept for this question and retry a similar problem."
                    ),
                }
            )

        return {
            "attempt_id": str(attempt["_id"]),
            "test_id": attempt.get("test_id", ""),
            "subject": attempt.get("subject", "General"),
            "score": float(attempt.get("score", 0.0)),
            "total_questions": int(attempt.get("total_questions", len(question_set))),
            "answered": int(attempt.get("correct_answers", 0) + attempt.get("incorrect_answers", 0)),
            "correct_answers": int(attempt.get("correct_answers", 0)),
            "incorrect_answers": int(attempt.get("incorrect_answers", 0)),
            "unattempted": int(attempt.get("unattempted", 0)),
            "submitted_at": attempt.get("submitted_at", datetime.now(timezone.utc)),
            "questions": questions,
        }


    @staticmethod
    def progress(db: Database, student: dict) -> dict:
        student_id = str(student["_id"])

        # 1. Subject Breakdown & Mastery (Aggregation)
        mastery_results = list(db.test_attempts.aggregate([
            {"$match": {"student_id": student_id, "status": "submitted"}},
            {"$group": {"_id": "$subject", "avg": {"$avg": "$score"}, "count": {"$sum": 1}}}
        ]))
        topic_mastery = [{"topic": r["_id"] or "General", "mastery": round(float(r["avg"]), 1)} for r in mastery_results]
        if not topic_mastery: topic_mastery = [{"topic": "General", "mastery": 0.0}]

        total_completed = sum(r["count"] for r in mastery_results)
        overall_avg = round(sum(r["avg"] * r["count"] for r in mastery_results) / total_completed, 1) if total_completed else 0.0

        # 2. Overall Rank (Optimized Aggregation - Single pass)
        pipeline = [
            {"$match": {"status": "submitted", "submitted_at": {"$ne": None}}},
            {"$group": {"_id": "$student_id", "score": {"$avg": "$score"}}},
            {"$sort": {"score": -1, "_id": 1}}
        ]
        results = list(db.test_attempts.aggregate(pipeline))
        curr_rank = 0
        total_students = len(results)
        for i, r in enumerate(results, 1):
            if str(r["_id"]) == student_id:
                curr_rank = i
                break
        if curr_rank == 0: curr_rank = total_students + 1

        # 3. Rank History (Last 6 attempts) - Simplified to avoid N+1
        # To avoid the heavy N+1 aggregate loop, we return a simpler trend or last results
        rank_history = []
        last_attempts = list(db.test_attempts.find(
            {"student_id": student_id, "status": "submitted"},
            {"submitted_at": 1, "score": 1}
        ).sort("submitted_at", -1).limit(6))
        
        for att in reversed(last_attempts):
            # For performance, we'll use the current rank if history isn't strictly required to be historical rank
            # Or better, we just show the dates with the current rank or a cached historical rank if available.
            rank_history.append({
                "week": att["submitted_at"].strftime("%b %d"), 
                "rank": curr_rank
            })

        if not rank_history: rank_history = [{"week": "Now", "rank": curr_rank}]

        return {
            "overall_rank": curr_rank,
            "total_students": total_students,
            "tests_completed": total_completed,
            "avg_score": overall_avg,
            "rank_history": rank_history,
            "topic_mastery": topic_mastery,
        }
    @staticmethod
    def list_library(db: Database, student: dict, subject: str | None = None) -> list[dict]:
        year = student.get("year")

        and_conditions = [{"status": "approved"}, {"year": year}]
        if subject:
            and_conditions.append({"$or": [{"subject": subject}, {"subject": "All"}]})

        query: dict = {"$and": and_conditions}

        pipeline = [
            {"$match": query},
            {"$sort": {"created_at": -1}},
            {
                "$lookup": {
                    "from": "library_files",
                    "let": {"item_id": "$_id", "str_item_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$or": [
                                        {"$eq": ["$library_item_id", "$$item_id"]},
                                        {"$eq": ["$library_item_id", "$$str_item_id"]}
                                    ]
                                }
                            }
                        },
                        {"$project": {"_id": 1}}
                    ],
                    "as": "file_details"
                }
            },
            {"$match": {"file_details": {"$ne": []}}},
            {"$project": {"file_details": 0}}
        ]
        docs = list(db.library_items.aggregate(pipeline))
        return [serialize_id(doc) for doc in docs]

    @staticmethod
    def list_library_downloads(db: Database, student: dict) -> list[str]:
        student_id = str(student["_id"])
        docs = db.library_downloads.find(
            {"student_id": student_id},
            {"library_item_id": 1},
        )
        item_ids: list[str] = []
        for doc in docs:
            library_item_id = doc.get("library_item_id")
            if library_item_id:
                item_ids.append(str(library_item_id))
        return item_ids

    @staticmethod
    def download_library_item(db: Database, student: dict, item_id: str) -> dict:
        student_id = str(student["_id"])
        year = student.get("year")
        item_oid = parse_object_id(item_id, "item_id")

        item = db.library_items.find_one(
            {
                "_id": item_oid,
                "status": "approved",
                "year": year,
            }
        )
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Library item not found",
            )

        now = datetime.now(timezone.utc)
        db.library_downloads.update_one(
            {
                "student_id": student_id,
                "library_item_id": str(item_oid),
            },
            {
                "$setOnInsert": {
                    "student_id": student_id,
                    "library_item_id": str(item_oid),
                    "created_at": now,
                },
                "$set": {
                    "updated_at": now,
                    "title": item.get("title"),
                },
                "$inc": {"download_count": 1},
            },
            upsert=True,
        )

        ActivityService.log(
            db,
            text=f"{student.get('name', 'Student')} downloaded '{item.get('title', 'material')}'",
            event_type="material",
            actor_id=student_id,
            actor_role="student",
            metadata={"library_item_id": str(item_oid)},
        )

        file_doc = db.library_files.find_one({"library_item_id": str(item_oid)})
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original file not available for this material",
            )

        raw_content = file_doc.get("data")
        if raw_content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original file not available for this material",
            )
        try:
            content = (
                raw_content.encode("utf-8")
                if isinstance(raw_content, str)
                else bytes(raw_content)
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Original file not available for this material",
            ) from exc

        filename = str(file_doc.get("filename") or item.get("file_name") or "material.bin")
        content_type = str(
            file_doc.get("content_type")
            or item.get("file_content_type")
            or "application/octet-stream"
        )

        return {
            "filename": filename,
            "content_type": content_type,
            "content": content,
        }

    @staticmethod
    def submit_feedback(db: Database, student: dict, payload: FeedbackRequest) -> dict:
        doc = {
            "student_id": str(student["_id"]),
            "rating": payload.rating,
            "feedback": payload.feedback,
            "created_at": datetime.now(timezone.utc),
        }
        db.feedback.insert_one(doc)
        ActivityService.log(
            db,
            text=f"{student.get('name', 'Student')} submitted feedback ({payload.rating}/5)",
            event_type="feedback",
            actor_id=str(student["_id"]),
            actor_role="student",
            metadata={"rating": payload.rating},
        )
        return {"message": "Feedback submitted"}

    @staticmethod
    def list_notifications(db: Database, user: dict) -> list[dict]:
        docs = db.notifications.find({"user_id": str(user["_id"])}).sort("created_at", -1)
        return [serialize_id(doc) for doc in docs]

    @staticmethod
    def mark_notification_read(
        db: Database,
        user: dict,
        notification_id: str,
        *,
        read: bool,
    ) -> dict:
        notification_oid = parse_object_id(notification_id, "notification_id")
        result = db.notifications.update_one(
            {
                "_id": notification_oid,
                "user_id": str(user["_id"]),
            },
            {
                "$set": {
                    "read": read,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found",
            )

        updated = db.notifications.find_one({"_id": notification_oid})
        assert updated is not None
        return serialize_id(updated)

    @staticmethod
    def mark_all_notifications_read(db: Database, user: dict) -> dict:
        result = db.notifications.update_many(
            {
                "user_id": str(user["_id"]),
                "read": False,
            },
            {
                "$set": {
                    "read": True,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return {"updated_count": int(result.modified_count)}

    @staticmethod
    def ask_chat(query: str) -> str:
        try:
            response = generate_chat_reply(query)
            if response.strip():
                return response.strip()
        except Exception:
            # Fall back to a local knowledge response when external AI is unavailable.
            pass

        lower = query.lower()
        if "newton" in lower:
            return (
                "Newton's laws: inertia, F=ma, and action-reaction. "
                "For JEE, focus on free-body diagrams and force balance."
            )
        if "quadratic" in lower:
            return (
                "Use factoring, quadratic formula, or completing square. "
                "Also practice discriminant-based root analysis for JEE."
            )
        if "chatelier" in lower or "equilibrium" in lower:
            return (
                "Le Chatelier's principle: system shifts to oppose disturbances. "
                "Review pressure and temperature effect cases carefully."
            )
        if "time" in lower or "tips" in lower:
            return (
                "For JEE, time management is key. Allocate more time to your weakest subjects "
                "and maintain a consistent schedule using the study planner."
            )
        return (
            "I can help with conceptual doubts in Physics, Chemistry, and Mathematics. "
            "Please ask a specific question about a topic or formula."
        )

    @staticmethod
    def get_study_plan(db: Database, student: dict) -> dict | None:
        return PlannerService.get_plan(db, str(student["_id"]))

    @staticmethod
    def generate_study_plan(db: Database, student: dict, payload: Any) -> dict:
        student_id = str(student["_id"])
        # Update student profile with new availability/target date
        db.users.update_one(
            {"_id": student["_id"]},
            {
                "$set": {
                    "availability_hours": payload.availability_hours,
                    "target_exam_date": payload.target_exam_date,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return PlannerService.generate_plan(
            db,
            student_id,
            payload.availability_hours,
            payload.target_exam_date or datetime.now(timezone.utc) + timedelta(days=30),
        )

    @staticmethod
    def assess_study_progress(db: Database, student: dict) -> dict:
        return PlannerService.assess_progress(db, str(student["_id"]))

    @staticmethod
    def search_public_resources(db: Database, student: dict, topic: str, subject: str | None = None) -> list[dict]:
        sub = subject or student.get("subject", "Physics")
        return PublicResourceService.search_resources(sub, topic)
    @staticmethod
    def mark_study_plan_task_complete(db: Database, student: dict, task_id: str) -> bool:
        return PlannerService.mark_task_complete(db, str(student["_id"]), task_id)

    @staticmethod
    def ask_student_doubt(
        db: Database,
        student: dict,
        *,
        query: str,
        subject: str | None = None,
        context: str | None = None,
    ) -> dict:
        enriched_query = query.strip()
        parts = [f"Student query: {enriched_query}"]
        if subject:
            parts.append(f"Subject focus: {subject}")
        if context:
            parts.append(f"Context: {context.strip()}")
        response = StudentService.ask_chat("\n".join(parts))

        now = datetime.now(timezone.utc)
        doc = {
            "student_id": str(student["_id"]),
            "query": enriched_query,
            "response": response,
            "subject": subject,
            "context": context.strip() if context else None,
            "created_at": now,
            "updated_at": now,
        }
        inserted = db.student_doubts.insert_one(doc)
        doc["_id"] = inserted.inserted_id

        ActivityService.log(
            db,
            text=f"{student.get('name', 'Student')} asked a study doubt",
            event_type="chat",
            actor_id=str(student["_id"]),
            actor_role="student",
            metadata={"subject": subject},
        )
        return serialize_id(doc)

    @staticmethod
    def list_student_doubts(db: Database, student: dict, *, limit: int = 20) -> list[dict]:
        safe_limit = max(1, min(limit, 100))
        docs = db.student_doubts.find({"student_id": str(student["_id"])}).sort("created_at", -1).limit(safe_limit)
        return [serialize_id(doc) for doc in docs]

    @staticmethod
    def create_chat_session(db: Database, student: dict, title: str | None = None) -> dict:
        doc = {
            "student_id": str(student["_id"]),
            "title": title or "New Chat",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = db.chat_sessions.insert_one(doc)
        return serialize_id(db.chat_sessions.find_one({"_id": result.inserted_id}))

    @staticmethod
    def list_chat_sessions(db: Database, student: dict, limit: int = 20) -> list[dict]:
        docs = db.chat_sessions.find({"student_id": str(student["_id"])}).sort("updated_at", -1).limit(limit)
        return [serialize_id(doc) for doc in docs]

    @staticmethod
    def get_chat_session_messages(db: Database, student: dict, session_id: str) -> list[dict]:
        # Verify ownership
        session = db.chat_sessions.find_one({"_id": parse_object_id(session_id, "session_id"), "student_id": str(student["_id"])})
        if not session:
            # Check if it might be a newly created session from sidebar navigation that doesn't strictly exist yet? 
            # No, backend should correct strict ownership.
            # But return empty if not found to avoid crashing frontend? 
            # Better to raise error or return empty. User expects messages.
            return []
            
        docs = db.chat_messages.find({"session_id": session_id}).sort("created_at", 1)
        return [serialize_id(doc) for doc in docs]

    @staticmethod
    def save_chat_message(db: Database, session_id: str, role: str, content: str) -> str:
        doc = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "created_at": datetime.now(timezone.utc),
        }
        result = db.chat_messages.insert_one(doc)
        
        # Update session updated_at
        db.chat_sessions.update_one(
            {"_id": parse_object_id(session_id, "session_id")},
            {"$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        return str(result.inserted_id)

    @staticmethod
    def update_session_title(db: Database, student: dict, session_id: str, title: str) -> bool:
        result = db.chat_sessions.update_one(
            {"_id": parse_object_id(session_id, "session_id"), "student_id": str(student["_id"])},
            {"$set": {"title": title, "updated_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    @staticmethod
    def delete_chat_session(db: Database, student: dict, session_id: str) -> bool:
        # Verify ownership and delete
        query = {"_id": parse_object_id(session_id, "session_id"), "student_id": str(student["_id"])}
        result = db.chat_sessions.delete_one(query)
        
        if result.deleted_count > 0:
            # Delete associated messages
            db.chat_messages.delete_many({"session_id": session_id})
            return True
        return False

    @staticmethod
    def _public_question_set(question_set: list[dict]) -> list[dict]:
        payload: list[dict] = []
        for index, question in enumerate(question_set, start=1):
            payload.append(
                {
                    "id": str(question.get("id") or f"q{index}"),
                    "subject": str(question.get("subject") or "General"),
                    "text": str(question.get("text") or f"Question {index}"),
                    "options": [str(option) for option in (question.get("options") or [])],
                }
            )
        return payload

    @staticmethod
    def _average_scores_by_student(db: Database, upto: datetime | None = None) -> dict[str, float]:
        active_students = list(
            db.users.find({"role": "student", "status": "active"}, {"_id": 1})
        )
        scores_map: dict[str, list[float]] = {str(user["_id"]): [] for user in active_students}

        query: dict = {"status": "submitted", "submitted_at": {"$ne": None}}
        if upto is not None:
            query["submitted_at"]["$lte"] = upto

        attempts = db.test_attempts.find(query, {"student_id": 1, "score": 1})
        for attempt in attempts:
            sid = str(attempt.get("student_id"))
            if sid not in scores_map:
                continue
            scores_map[sid].append(float(attempt.get("score", 0.0)))

        return {
            sid: (round(sum(values) / len(values), 1) if values else 0.0)
            for sid, values in scores_map.items()
        }

    @staticmethod
    def _rank_for_student(score_by_student: dict[str, float], student_id: str) -> int:
        if student_id not in score_by_student:
            score_by_student[student_id] = 0.0

        ranked = sorted(score_by_student.items(), key=lambda item: (-item[1], item[0]))
        for index, (sid, _) in enumerate(ranked, start=1):
            if sid == student_id:
                return index
        return max(1, len(ranked))

    @staticmethod
    def _normalize_answer(value: object) -> int | None:
        if value is None:
            return None

        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return None

        if parsed < 0:
            return None
        return parsed

    @staticmethod
    def _find_test_by_id(db: Database, test_id: str) -> dict | None:
        if not ObjectId.is_valid(test_id):
            return None
        return db.tests.find_one({"_id": ObjectId(test_id)})

    @staticmethod
    def _student_class_ids(db: Database, student_id: str) -> list[str]:
        candidate_ids: list[object] = [student_id]
        if ObjectId.is_valid(student_id):
            candidate_ids.append(ObjectId(student_id))

        class_docs = db.classes.find(
            {"student_ids": {"$in": candidate_ids}},
            {"_id": 1},
        )
        return [str(doc["_id"]) for doc in class_docs]

    @staticmethod
    def _is_test_assigned_to_student(db: Database, student: dict, test: dict) -> bool:
        status_value = str(test.get("status") or "").lower()
        if status_value not in {"assigned", "active"}:
            return False

        student_id = str(student["_id"])
        class_ids = set(StudentService._student_class_ids(db, student_id))
        test_class_ids = {str(class_id) for class_id in test.get("assigned_to_class_ids", []) if class_id}
        if test_class_ids:
            return bool(class_ids.intersection(test_class_ids))

        # Legacy fallback for seed/old data that only tracks year + assigned flag.
        return bool(test.get("assigned")) and test.get("year") == student.get("year")
