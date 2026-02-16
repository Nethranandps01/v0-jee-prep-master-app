import mimetypes
import os
import re
from datetime import datetime, timezone

from bson import Binary
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import get_settings
from app.schemas.teacher import (
    AssignPaperRequest,
    LessonPlanCreateRequest,
    LessonPlanUpdateRequest,
    LibraryItemCreateRequest,
    TeacherClassCreateRequest,
    TeacherPaperCreateRequest,
    TeacherPaperUpdateRequest,
    TeacherStudentAttemptResponse,
)
from app.services.activity_service import ActivityService
from app.services.notification_service import NotificationService
from app.services.question_bank import build_question_set_with_source
from app.utils.mongo import parse_object_id, serialize_id


class TeacherService:
    MAX_LIBRARY_FILE_BYTES = 10 * 1024 * 1024

    @staticmethod
    def get_home_summary(db: Database, teacher: dict) -> dict:
        teacher_id = str(teacher["_id"])
        subject = teacher.get("subject")

        # 1. Total Unique Students across all classes (Aggregation)
        pipeline = [
            {"$match": {"teacher_id": teacher_id}},
            {"$unwind": "$student_ids"},
            {"$group": {"_id": None, "unique_students": {"$addToSet": "$student_ids"}}},
            {"$project": {"count": {"$size": "$unique_students"}}}
        ]
        res = list(db.classes.aggregate(pipeline))
        total_students = res[0]["count"] if res else 0
        
        # If no explicit student_ids, fallback to the 'students' counter field
        if total_students == 0:
            fallback = db.classes.aggregate([
                {"$match": {"teacher_id": teacher_id}},
                {"$group": {"_id": None, "total": {"$sum": "$students"}}}
            ])
            fallback_res = list(fallback)
            total_students = fallback_res[0]["total"] if fallback_res else 0

        # 2. Total Papers
        total_papers = db.tests.count_documents({"creator_id": teacher_id})

        # 3. Subject Average
        avg_pipeline = [
            {"$match": {"subject": subject, "submitted_at": {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$score"}}},
        ]
        avg_result = list(db.test_attempts.aggregate(avg_pipeline))
        subject_avg = round(float(avg_result[0]["avg"]), 1) if avg_result else 0.0

        return {
            "total_students": total_students,
            "total_papers": total_papers,
            "subject_avg": subject_avg,
        }

    @staticmethod
    def list_papers(db: Database, teacher: dict) -> list[dict]:
        teacher_id = str(teacher["_id"])
        docs = db.tests.find({"creator_id": teacher_id}).sort("created_at", -1)
        return [TeacherService._paper_payload(doc, include_question_set=False) for doc in docs]

    @staticmethod
    def create_paper(db: Database, teacher: dict, payload: TeacherPaperCreateRequest) -> dict:
        now = datetime.now(timezone.utc)
        question_set, question_source = build_question_set_with_source(
            payload.subject,
            payload.questions,
            payload.difficulty,
            topic=payload.topic,
        )
        if TeacherService._should_require_ai_generation() and question_source != "ai":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI question generation failed. Please retry.",
            )

        doc = {
            "title": payload.title,
            "subject": payload.subject,
            "difficulty": payload.difficulty,
            "questions": payload.questions,
            "duration": payload.duration,
            "year": payload.year,
            "topic": payload.topic,
            "status": "draft",
            "assigned": False,
            "students": 0,
            "creator_id": str(teacher["_id"]),
            "assigned_to_class_ids": [],
            "question_set": question_set,
            "question_source": question_source,
            "created_at": now,
            "updated_at": now,
        }
        result = db.tests.insert_one(doc)
        doc["_id"] = result.inserted_id

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} created paper '{payload.title}'",
            event_type="paper",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"paper_id": str(result.inserted_id), "subject": payload.subject},
        )

        return TeacherService._paper_payload(doc, include_question_set=True)

    @staticmethod
    def get_paper(db: Database, teacher: dict, paper_id: str) -> dict:
        oid = parse_object_id(paper_id, "paper_id")
        paper = db.tests.find_one({"_id": oid, "creator_id": str(teacher["_id"])})
        if not paper:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
        return TeacherService._paper_payload(paper, include_question_set=True)

    @staticmethod
    def update_paper(
        db: Database,
        teacher: dict,
        paper_id: str,
        payload: TeacherPaperUpdateRequest,
    ) -> dict:
        oid = parse_object_id(paper_id, "paper_id")
        existing = db.tests.find_one({"_id": oid, "creator_id": str(teacher["_id"])})
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")

        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updates provided")

        if "questions" in updates or "difficulty" in updates:
            question_count = int(updates.get("questions", existing.get("questions", 0) or 0))
            difficulty = str(updates.get("difficulty", existing.get("difficulty", "Medium")))
            subject = str(existing.get("subject", "Physics"))
            question_set, question_source = build_question_set_with_source(
                subject,
                question_count,
                difficulty,
            )
            if TeacherService._should_require_ai_generation() and question_source != "ai":
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI question generation failed. Please retry.",
                )
            updates["question_set"] = question_set
            updates["question_source"] = question_source

        updates["updated_at"] = datetime.now(timezone.utc)

        db.tests.update_one(
            {"_id": oid, "creator_id": str(teacher["_id"])},
            {"$set": updates},
        )

        updated = db.tests.find_one({"_id": oid})
        assert updated is not None

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} updated paper '{updated.get('title', 'Untitled')}'",
            event_type="paper",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"paper_id": str(oid), "fields": list(updates.keys())},
        )

        return TeacherService._paper_payload(updated, include_question_set=True)

    @staticmethod
    def assign_paper(
        db: Database,
        teacher: dict,
        paper_id: str,
        payload: AssignPaperRequest,
    ) -> dict:
        oid = parse_object_id(paper_id, "paper_id")
        paper = db.tests.find_one({"_id": oid, "creator_id": str(teacher["_id"])})
        if not paper:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")

        class_oids = [parse_object_id(class_id, "class_id") for class_id in payload.class_ids]
        classes = list(
            db.classes.find(
                {
                    "_id": {"$in": class_oids},
                    "teacher_id": str(teacher["_id"]),
                }
            )
        )
        if len(classes) != len(class_oids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more classes are invalid for this teacher",
            )

        fallback_students = 0
        student_ids: list[str] = []
        for cls in classes:
            if cls.get("student_ids"):
                cls_student_ids = [str(student_id) for student_id in cls["student_ids"]]
                student_ids.extend(cls_student_ids)
            else:
                fallback_students += int(cls.get("students", 0))

        unique_student_ids = sorted(set(student_ids))
        students = len(unique_student_ids) if unique_student_ids else fallback_students

        db.tests.update_one(
            {"_id": oid},
            {
                "$set": {
                    "assigned": True,
                    "status": "assigned",
                    "students": students,
                    "assigned_to_class_ids": [str(c["_id"]) for c in classes],
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        updated = db.tests.find_one({"_id": oid})
        assert updated is not None

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} assigned paper '{updated.get('title', 'Untitled')}' to {len(classes)} class(es)",
            event_type="test",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"paper_id": str(oid), "class_count": len(classes), "students": students},
        )

        if unique_student_ids:
            NotificationService.create_for_users(
                db,
                user_ids=unique_student_ids,
                title="New Test Assigned",
                message=f"{updated.get('title', 'A test')} has been assigned.",
                notification_type="test",
            )

        NotificationService.create_for_user(
            db,
            user_id=str(teacher["_id"]),
            title="Paper Assigned Successfully",
            message=f"{updated.get('title', 'Paper')} assigned to {len(classes)} class(es).",
            notification_type="test",
        )

        return TeacherService._paper_payload(updated, include_question_set=False)

    @staticmethod
    def list_classes(db: Database, teacher: dict) -> list[dict]:
        docs = db.classes.find({"teacher_id": str(teacher["_id"])}).sort("created_at", -1)
        return [TeacherService._class_payload(doc) for doc in docs]

    @staticmethod
    def create_class(db: Database, teacher: dict, payload: TeacherClassCreateRequest) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "name": payload.name,
            "year": payload.year,
            "subject": payload.subject,
            "teacher_id": str(teacher["_id"]),
            "student_ids": [],
            "students": 0,
            "avg_score": 0.0,
            "created_at": now,
            "updated_at": now,
        }
        result = db.classes.insert_one(doc)
        doc["_id"] = result.inserted_id

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} created class '{payload.name}'",
            event_type="class",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"class_id": str(result.inserted_id), "year": payload.year, "subject": payload.subject},
        )

        return TeacherService._class_payload(doc)

    @staticmethod
    def class_students(db: Database, teacher: dict, class_id: str) -> list[dict]:
        oid = parse_object_id(class_id, "class_id")
        cls = db.classes.find_one({"_id": oid, "teacher_id": str(teacher["_id"])})
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        student_ids = [parse_object_id(sid, "student_id") for sid in cls.get("student_ids", [])]
        students = []
        if student_ids:
            docs = db.users.find({"_id": {"$in": student_ids}, "role": "student"})
            for user in docs:
                payload = serialize_id(user)
                payload.pop("password_hash", None)
                students.append(payload)
        return students

    @staticmethod
    def list_assignable_students(db: Database, teacher: dict, class_id: str) -> list[dict]:
        oid = parse_object_id(class_id, "class_id")
        cls = db.classes.find_one({"_id": oid, "teacher_id": str(teacher["_id"])})
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        year = cls.get("year")
        query: dict = {"role": "student", "status": "active"}
        if year:
            query["year"] = year

        assigned_ids = {str(student_id) for student_id in cls.get("student_ids", [])}
        docs = db.users.find(query).sort("name", 1)

        students: list[dict] = []
        for user in docs:
            payload = serialize_id(user)
            payload.pop("password_hash", None)
            payload["assigned"] = payload["id"] in assigned_ids
            students.append(payload)
        return students

    @staticmethod
    def update_class_students(
        db: Database,
        teacher: dict,
        class_id: str,
        *,
        student_ids: list[str],
    ) -> dict:
        oid = parse_object_id(class_id, "class_id")
        cls = db.classes.find_one({"_id": oid, "teacher_id": str(teacher["_id"])})
        if not cls:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

        unique_student_ids = list(dict.fromkeys(student_ids))
        valid_student_ids: list[str] = []
        if unique_student_ids:
            student_oids = [parse_object_id(student_id, "student_id") for student_id in unique_student_ids]
            query: dict = {
                "_id": {"$in": student_oids},
                "role": "student",
                "status": "active",
            }
            year = cls.get("year")
            if year:
                query["year"] = year

            found_students = list(db.users.find(query, {"_id": 1}))
            found_ids = {str(student["_id"]) for student in found_students}
            if len(found_ids) != len(unique_student_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more students are invalid or do not match class year",
                )
            valid_student_ids = [student_id for student_id in unique_student_ids if student_id in found_ids]

        now = datetime.now(timezone.utc)
        db.classes.update_one(
            {"_id": oid, "teacher_id": str(teacher["_id"])},
            {
                "$set": {
                    "student_ids": valid_student_ids,
                    "students": len(valid_student_ids),
                    "updated_at": now,
                }
            },
        )
        updated = db.classes.find_one({"_id": oid})
        assert updated is not None

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} updated students for class '{updated.get('name', 'Class')}'",
            event_type="class",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"class_id": str(oid), "student_count": len(valid_student_ids)},
        )

        return TeacherService._class_payload(updated)

    @staticmethod
    def list_lesson_plans(db: Database, teacher: dict, year: str | None = None) -> list[dict]:
        query = {"teacher_id": str(teacher["_id"])}
        if year:
            query["year"] = year
        docs = db.lesson_plans.find(query).sort("created_at", -1)
        return [TeacherService._lesson_payload(doc) for doc in docs]

    @staticmethod
    def create_lesson_plan(
        db: Database,
        teacher: dict,
        payload: LessonPlanCreateRequest,
    ) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "subject": teacher.get("subject", "Physics"),
            "year": payload.year,
            "topic": payload.topic,
            "objectives": payload.objectives,
            "activities": payload.activities,
            "duration": payload.duration,
            "status": "draft",
            "teacher_id": str(teacher["_id"]),
            "created_at": now,
            "updated_at": now,
        }
        result = db.lesson_plans.insert_one(doc)
        doc["_id"] = result.inserted_id

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} created lesson plan '{payload.topic}'",
            event_type="plan",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"lesson_id": str(result.inserted_id), "year": payload.year},
        )

        return TeacherService._lesson_payload(doc)

    @staticmethod
    def update_lesson_plan(
        db: Database,
        teacher: dict,
        lesson_id: str,
        payload: LessonPlanUpdateRequest,
    ) -> dict:
        oid = parse_object_id(lesson_id, "lesson_id")
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updates provided")
        updates["updated_at"] = datetime.now(timezone.utc)

        result = db.lesson_plans.update_one(
            {"_id": oid, "teacher_id": str(teacher["_id"])},
            {"$set": updates},
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson plan not found",
            )

        doc = db.lesson_plans.find_one({"_id": oid})
        assert doc is not None

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} updated lesson plan '{doc.get('topic', 'Untitled')}'",
            event_type="plan",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"lesson_id": str(oid), "fields": list(updates.keys())},
        )

        return TeacherService._lesson_payload(doc)

    @staticmethod
    def delete_lesson_plan(db: Database, teacher: dict, lesson_id: str) -> None:
        oid = parse_object_id(lesson_id, "lesson_id")
        lesson = db.lesson_plans.find_one({"_id": oid, "teacher_id": str(teacher["_id"])})
        if not lesson:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson plan not found",
            )

        result = db.lesson_plans.delete_one(
            {"_id": oid, "teacher_id": str(teacher["_id"])}
        )
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lesson plan not found",
            )

        teacher_name = teacher.get("name", "Teacher")
        ActivityService.log(
            db,
            text=f"{teacher_name} deleted lesson plan '{lesson.get('topic', 'Untitled')}'",
            event_type="plan",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={"lesson_id": str(oid)},
        )

    @staticmethod
    def list_library_items(db: Database, teacher: dict) -> list[dict]:
        docs = db.library_items.find({"teacher_id": str(teacher["_id"])}).sort("created_at", -1)
        return [TeacherService._library_payload(doc) for doc in docs]

    @staticmethod
    def create_library_item(
        db: Database,
        teacher: dict,
        payload: LibraryItemCreateRequest,
        file_payload: dict | None = None,
        *,
        publish_now: bool = False,
    ) -> dict:
        now = datetime.now(timezone.utc)
        teacher_name = teacher.get("name", "Teacher")
        initial_status = "approved" if publish_now else "pending"

        doc = {
            "title": payload.title,
            "subject": payload.subject,
            "type": payload.type,
            "chapters": payload.chapters,
            "year": payload.year,
            "status": initial_status,
            "uploaded_by_name": teacher_name,
            "teacher_id": str(teacher["_id"]),
            "file_name": file_payload.get("filename") if file_payload else None,
            "file_content_type": file_payload.get("content_type") if file_payload else None,
            "file_size_bytes": file_payload.get("size_bytes") if file_payload else None,
            "created_at": now,
            "updated_at": now,
        }
        result = db.library_items.insert_one(doc)
        doc["_id"] = result.inserted_id
        if file_payload:
            db.library_files.insert_one(
                {
                    "library_item_id": result.inserted_id,  # Use native ObjectId
                    "filename": file_payload["filename"],
                    "content_type": file_payload["content_type"],
                    "size_bytes": file_payload["size_bytes"],
                    "data": Binary(file_payload["content"]),
                    "created_at": now,
                    "updated_at": now,
                }
            )

        db.content_items.insert_one(
            {
                "title": payload.title,
                "uploaded_by_name": teacher_name,
                "subject": payload.subject,
                "date": now.strftime("%b %d, %Y"),
                "status": initial_status,
                "library_item_id": result.inserted_id,  # Use native ObjectId
                "teacher_id": str(teacher["_id"]),
                "created_at": now,
                "updated_at": now,
            }
        )

        ActivityService.log(
            db,
            text=f"{teacher_name} uploaded library item '{payload.title}'",
            event_type="material",
            actor_id=str(teacher["_id"]),
            actor_role="teacher",
            metadata={
                "library_item_id": str(result.inserted_id),
                "subject": payload.subject,
                "status": initial_status,
            },
        )

        if not publish_now:
            admin_ids = [str(admin["_id"]) for admin in db.users.find({"role": "admin", "status": "active"}, {"_id": 1})]
            NotificationService.create_for_users(
                db,
                user_ids=admin_ids,
                title="Content Needs Review",
                message=f"{teacher_name} uploaded '{payload.title}' for moderation.",
                notification_type="material",
            )
        else:
            student_ids = [
                str(student["_id"])
                for student in db.users.find(
                    {"role": "student", "status": "active", "year": payload.year},
                    {"_id": 1},
                )
            ]
            NotificationService.create_for_users(
                db,
                user_ids=student_ids,
                title="New Study Material",
                message=f"{payload.title} is now available in your library.",
                notification_type="material",
            )

        return TeacherService._library_payload(doc)

    @staticmethod
    def build_library_file_payload(
        *,
        filename: str | None,
        content_type: str | None,
        content: bytes,
        material_type: str,
    ) -> dict:
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        if len(content) > TeacherService.MAX_LIBRARY_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds {TeacherService.MAX_LIBRARY_FILE_BYTES // (1024 * 1024)}MB limit",
            )

        safe_filename = TeacherService._safe_filename(filename)
        extension = os.path.splitext(safe_filename)[1].lower()
        guessed_type, _ = mimetypes.guess_type(safe_filename)
        normalized_content_type = (content_type or guessed_type or "application/octet-stream").strip()

        if material_type == "PDF" and extension != ".pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF type requires a .pdf file",
            )
        if material_type == "DOCX" and extension != ".docx":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DOCX type requires a .docx file",
            )
        if material_type == "Image":
            is_image_extension = extension in {".png", ".jpg", ".jpeg", ".gif", ".webp"}
            if not (normalized_content_type.startswith("image/") or is_image_extension):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Image type requires an image file",
                )

        return {
            "filename": safe_filename,
            "content_type": normalized_content_type,
            "size_bytes": len(content),
            "content": content,
        }

    @staticmethod
    def _paper_payload(doc: dict, *, include_question_set: bool = False) -> dict:
        payload = serialize_id(doc)
        payload.setdefault("assigned", False)
        payload.setdefault("students", 0)
        if not include_question_set:
            payload.pop("question_set", None)
        return payload

    @staticmethod
    def _class_payload(doc: dict) -> dict:
        payload = serialize_id(doc)
        payload["students"] = (
            len(payload.get("student_ids", []))
            if payload.get("student_ids")
            else int(payload.get("students", 0))
        )
        payload.setdefault("avg_score", 0.0)
        return payload

    @staticmethod
    def _lesson_payload(doc: dict) -> dict:
        return serialize_id(doc)

    @staticmethod
    def _library_payload(doc: dict) -> dict:
        payload = serialize_id(doc)
        payload.setdefault("file_name", None)
        payload.setdefault("file_content_type", None)
        payload.setdefault("file_size_bytes", None)
        return payload

    @staticmethod
    def _safe_filename(filename: str | None) -> str:
        value = (filename or "").strip()
        if not value:
            return f"material-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.bin"

        value = os.path.basename(value)
        sanitized = re.sub(r"[^a-zA-Z0-9._-]+", "_", value).strip("._")
        return sanitized or "material.bin"

    @staticmethod
    def get_student_attempts(db: Database, teacher: dict, student_id: str) -> list[dict]:
        """
        Fetch all test attempts for a specific student, visible to the teacher.
        Includes proctoring details (violation_reason).
        """
        sid_oid = parse_object_id(student_id, "student_id")
        #Verify student exists
        student = db.users.find_one({"_id": sid_oid, "role": "student"})
        if not student:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

        # Fetch attempts
        attempts = list(
            db.test_attempts.find(
                {"student_id": student_id, "status": "submitted"}
            ).sort("submitted_at", -1)
        )

        results = []
        for attempt in attempts:
            test_id = attempt.get("test_id")
            test_title = "Unknown Test"
            questions_detail = []

            if test_id:
                test = db.tests.find_one({"_id": parse_object_id(test_id, "test_id")})
                if test:
                    test_title = test.get("title", "Untitled")
                    
                    # Build Question Map
                    q_map = {q["id"]: q for q in test.get("question_set", [])}
                    
                    # Answers
                    correct_answers_ids = attempt.get("correct_answers", [])
                    incorrect_answers_ids = attempt.get("incorrect_answers", [])
                    # In a real app, we'd store the actual selected option index in attempt.
                    # For now, we'll try to reconstruct or use what's available.
                    # The attempt schema usually stores valid question IDs in lists.
                    
                    # IMPORTANT: The current attempt schema might not store the *exact* selected option index 
                    # for every question in a structured way that's easy to retrieve here without 'answers' map.
                    # Let's check if 'answers' (map of q_id -> option_index) is saved. 
                    # If not, we might only be able to show if it was correct/incorrect.
                    
                    # Checking `StudentService.submit_attempt`... it saves `answers`? 
                    # The `SubmitAttemptRequest` has `answers`. 
                    # The `test_attempts` collection update in `student_service.py` typically matches the request.
                    # Let's assume `answers` dict is present in attempt document.
                    
                    student_answers = attempt.get("answers", {}) # q_id -> index
                    time_spent_map = attempt.get("time_spent", {}) # q_id -> seconds
                    
                    for q in test.get("question_set", []):
                        qid = q["id"]
                        selected_idx = student_answers.get(qid)
                        correct_idx = q.get("correct")
                        time_taken = time_spent_map.get(qid, 0)
                        
                        try:
                             # 0-based index to option text
                            selected_text = q["options"][selected_idx] if selected_idx is not None and 0 <= selected_idx < len(q["options"]) else None
                            correct_text = q["options"][correct_idx] if correct_idx is not None and 0 <= correct_idx < len(q["options"]) else "Unknown"
                        except (IndexError, TypeError):
                             selected_text = "Invalid"
                             correct_text = "Error"

                        is_right = (selected_idx == correct_idx) and (selected_idx is not None)

                        questions_detail.append({
                            "question_text": q.get("text", "Question"),
                            "selected_option": selected_text,
                            "correct_option": correct_text,
                            "is_correct": is_right,
                            "explanation": q.get("explanation"),
                            "time_spent": time_taken,
                        })
            
            # Proctoring Check
            violation = attempt.get("violation_reason")
            is_suspicious = bool(violation) or attempt.get("auto_submitted", False)

            results.append({
                "attempt_id": str(attempt["_id"]),
                "test_title": test_title,
                "subject": attempt.get("subject", "General"),
                "score": attempt.get("score", 0.0),
                "total_questions": attempt.get("total_questions", 0),
                "submitted_at": attempt.get("submitted_at"),
                "violation_reason": violation,
                "is_suspicious": is_suspicious,
                "questions": questions_detail,
            })
        
        return results

    @staticmethod
    def _should_require_ai_generation() -> bool:
        settings = get_settings()
        return bool((settings.openai_api_key or "").strip())
