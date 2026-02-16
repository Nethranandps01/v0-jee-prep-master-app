import csv
import io
import re
from datetime import datetime, timezone

from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.security import get_password_hash
from app.schemas.admin import (
    AnalyticsReportResponse,
    BillingReportResponse,
)
from app.schemas.common import PaginationMeta
from app.schemas.user import AdminUserCreateRequest
from app.services.activity_service import ActivityService
from app.services.notification_service import NotificationService
from app.utils.mongo import parse_object_id, serialize_id
from app.utils.time import to_relative_time
from app.services.planner_service import PlannerService


SUBJECTS = ["Physics", "Chemistry", "Mathematics"]


class AdminService:
    @staticmethod
    def _resolve_user_name(db: Database, user_id: str | None, cache: dict[str, str]) -> str:
        if not user_id:
            return "User"
        if user_id in cache:
            return cache[user_id]
        try:
            oid = parse_object_id(user_id, "user_id")
        except HTTPException:
            cache[user_id] = "User"
            return cache[user_id]
        user_doc = db.users.find_one({"_id": oid}, {"name": 1})
        name = str(user_doc.get("name") or "User") if user_doc else "User"
        cache[user_id] = name
        return name

    @staticmethod
    def _fallback_recent_activity(db: Database, *, limit: int = 5) -> list[dict]:
        events: list[dict] = []
        user_ids_to_resolve: set[str] = set()

        # Gather recent items from multiple collections
        tests = list(db.tests.find({}, {"title": 1, "creator_id": 1, "created_at": 1}).sort("created_at", -1).limit(limit * 2))
        attempts = list(db.test_attempts.find({}, {"student_id": 1, "subject": 1, "score": 1, "submitted_at": 1}).sort("submitted_at", -1).limit(limit * 2))
        contents = list(db.content_items.find({}, {"title": 1, "status": 1, "updated_at": 1, "created_at": 1}).sort("updated_at", -1).limit(limit * 2))
        downloads = list(db.library_downloads.find({}, {"student_id": 1, "title": 1, "updated_at": 1, "created_at": 1}).sort("updated_at", -1).limit(limit * 2))
        doubts = list(db.student_doubts.find({}, {"student_id": 1, "created_at": 1}).sort("created_at", -1).limit(limit * 2))
        feedback_list = list(db.feedback.find({}, {"student_id": 1, "rating": 1, "created_at": 1}).sort("created_at", -1).limit(limit * 2))

        # Build raw events and collect user IDs
        raw_events = []
        for test in tests:
            cid = str(test.get("creator_id") or "")
            if cid: user_ids_to_resolve.add(cid)
            raw_events.append({"text_tmpl": "{name} created paper '{title}'", "params": {"title": str(test.get("title") or "Untitled")}, "uid": cid, "type": "paper", "at": test.get("created_at")})
        
        for attempt in attempts:
            sid = str(attempt.get("student_id") or "")
            if sid: user_ids_to_resolve.add(sid)
            score = attempt.get("score")
            score_text = f" ({round(float(score), 1)}%)" if isinstance(score, (int, float)) else ""
            raw_events.append({"text_tmpl": "{name} submitted {subject} test{score_text}", "params": {"subject": str(attempt.get("subject") or "test"), "score_text": score_text}, "uid": sid, "type": "test", "at": attempt.get("submitted_at")})

        for content in contents:
            raw_events.append({"text_tmpl": "Content '{title}' marked {status}", "params": {"title": str(content.get("title") or "Untitled"), "status": str(content.get("status") or "updated")}, "uid": None, "type": "material", "at": content.get("updated_at") or content.get("created_at")})

        for download in downloads:
            sid = str(download.get("student_id") or "")
            if sid: user_ids_to_resolve.add(sid)
            raw_events.append({"text_tmpl": "{name} downloaded '{title}'", "params": {"title": str(download.get("title") or "material")}, "uid": sid, "type": "material", "at": download.get("updated_at") or download.get("created_at")})

        for doubt in doubts:
            sid = str(doubt.get("student_id") or "")
            if sid: user_ids_to_resolve.add(sid)
            raw_events.append({"text_tmpl": "{name} asked a study doubt", "params": {}, "uid": sid, "type": "chat", "at": doubt.get("created_at")})

        for f in feedback_list:
            sid = str(f.get("student_id") or "")
            if sid: user_ids_to_resolve.add(sid)
            rating = f.get("rating")
            rating_text = f" ({int(rating)}/5)" if isinstance(rating, (int, float)) else ""
            raw_events.append({"text_tmpl": "{name} submitted feedback{rating_text}", "params": {"rating_text": rating_text}, "uid": sid, "type": "feedback", "at": f.get("created_at")})

        # Batch resolve names
        user_map: dict[str, str] = {}
        if user_ids_to_resolve:
            oids = []
            for uid in user_ids_to_resolve:
                try: oids.append(parse_object_id(uid, "id"))
                except: continue
            if oids:
                users = db.users.find({"_id": {"$in": oids}}, {"name": 1})
                for u in users: user_map[str(u["_id"])] = u.get("name", "User")

        # Sort and Format
        raw_events.sort(key=lambda x: x["at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        
        final = []
        for e in raw_events[:limit]:
            name = user_map.get(e["uid"], "User") if e["uid"] else ""
            text = e["text_tmpl"].format(name=name, **e["params"])
            final.append({
                "id": f"fallback_{e['at'].timestamp() if e['at'] else 0}",
                "text": text,
                "time": to_relative_time(e["at"]),
                "type": e["type"],
            })
        return final

    @staticmethod
    def _paginate(total: int, page: int, limit: int) -> PaginationMeta:
        return PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            has_more=page * limit < total,
        )

    @staticmethod
    def list_users(
        db: Database,
        *,
        role: str | None,
        status_filter: str | None,
        search: str | None,
        page: int,
        limit: int,
    ) -> tuple[list[dict], PaginationMeta]:
        query: dict = {}
        if role:
            query["role"] = role
        if status_filter:
            query["status"] = status_filter
        if search:
            trimmed = search.strip()
            if trimmed:
                literal_pattern = re.escape(trimmed)
                tokens = [re.escape(token) for token in trimmed.split() if token]
                tolerant_pattern = r"[\W_]*".join(tokens)

                query_clauses = [
                    {"name": {"$regex": literal_pattern, "$options": "i"}},
                    {"email": {"$regex": literal_pattern, "$options": "i"}},
                ]
                if tolerant_pattern and tolerant_pattern != literal_pattern:
                    query_clauses.extend(
                        [
                            {"name": {"$regex": tolerant_pattern, "$options": "i"}},
                            {"email": {"$regex": tolerant_pattern, "$options": "i"}},
                        ]
                    )
                query["$or"] = query_clauses

        total = db.users.count_documents(query)
        cursor = (
            db.users.find(query)
            .sort("created_at", -1)
            .skip((page - 1) * limit)
            .limit(limit)
        )

        items: list[dict] = []
        for user in cursor:
            user_doc = serialize_id(user)
            user_doc.pop("password_hash", None)
            items.append(user_doc)

        return items, AdminService._paginate(total, page, limit)

    @staticmethod
    def create_user(db: Database, payload: AdminUserCreateRequest) -> dict:
        existing = db.users.find_one({"email": payload.email.lower()})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )

        now = datetime.now(timezone.utc)
        doc = {
            "name": payload.name,
            "email": payload.email.lower(),
            "password_hash": get_password_hash(payload.password),
            "role": payload.role,
            "status": "active",
            "subject": payload.subject,
            "year": payload.year,
            "created_at": now,
            "updated_at": now,
        }
        result = db.users.insert_one(doc)
        doc["_id"] = result.inserted_id

        ActivityService.log(
            db,
            text=f"Admin created {payload.role} account for {payload.name}",
            event_type="user",
            actor_role="admin",
            metadata={"user_id": str(result.inserted_id), "email": payload.email.lower()},
        )

        out = serialize_id(doc)
        out.pop("password_hash", None)
        return out

    @staticmethod
    def update_user_status(db: Database, user_id: str, status_value: str) -> dict:
        oid = parse_object_id(user_id, "user_id")
        result = db.users.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": status_value,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user = db.users.find_one({"_id": oid})
        assert user is not None
        out = serialize_id(user)
        out.pop("password_hash", None)

        ActivityService.log(
            db,
            text=f"User {out.get('name', 'Unknown')} status changed to {status_value}",
            event_type="user",
            actor_role="admin",
            metadata={"user_id": out.get("id"), "status": status_value},
        )
        return out

    @staticmethod
    def list_content_items(
        db: Database,
        *,
        status_filter: str | None,
        subject: str | None,
        page: int,
        limit: int,
    ) -> tuple[list[dict], PaginationMeta]:
        query: dict = {}
        if status_filter:
            query["status"] = status_filter
        if subject:
            query["subject"] = subject

        total = db.content_items.count_documents(query)
        cursor = (
            db.content_items.find(query)
            .sort("created_at", -1)
            .skip((page - 1) * limit)
            .limit(limit)
        )

        items = []
        for item in cursor:
            payload = serialize_id(item)
            payload["uploaded_by"] = payload.pop("uploaded_by_name", "Unknown")
            items.append(payload)

        return items, AdminService._paginate(total, page, limit)

    @staticmethod
    def update_content_status(db: Database, content_id: str, new_status: str) -> dict:
        oid = parse_object_id(content_id, "content_id")
        item = db.content_items.find_one({"_id": oid})
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content item not found",
            )

        if item.get("status") != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only pending items can be moderated",
            )

        now = datetime.now(timezone.utc)
        db.content_items.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": now,
                }
            },
        )

        linked_library_item_id = item.get("library_item_id")
        linked_library_item: dict | None = None
        if linked_library_item_id:
            try:
                linked_oid = parse_object_id(str(linked_library_item_id), "library_item_id")
                db.library_items.update_one(
                    {"_id": linked_oid},
                    {"$set": {"status": new_status, "updated_at": now}},
                )
                linked_library_item = db.library_items.find_one(
                    {"_id": linked_oid},
                    {"title": 1, "year": 1},
                )
            except HTTPException:
                # Keep moderation successful even if linked id is malformed in old docs.
                pass

        updated = db.content_items.find_one({"_id": oid})
        assert updated is not None
        payload = serialize_id(updated)
        payload["uploaded_by"] = payload.pop("uploaded_by_name", "Unknown")

        ActivityService.log(
            db,
            text=f"Content item '{payload.get('title', 'Untitled')}' marked {new_status}",
            event_type="material",
            actor_role="admin",
            metadata={"content_id": payload.get("id"), "status": new_status},
        )

        teacher_id = item.get("teacher_id")
        if teacher_id:
            NotificationService.create_for_user(
                db,
                user_id=str(teacher_id),
                title="Content Review Update",
                message=f"{payload.get('title', 'Your content')} was {new_status}.",
                notification_type="material",
            )

        if new_status == "approved" and linked_library_item:
            student_query: dict = {"role": "student", "status": "active"}
            year_value = linked_library_item.get("year")
            if year_value:
                student_query["year"] = year_value
            student_ids = [str(student["_id"]) for student in db.users.find(student_query, {"_id": 1})]
            NotificationService.create_for_users(
                db,
                user_ids=student_ids,
                title="New Study Material",
                message=f"{linked_library_item.get('title', 'New material')} is now available in your library.",
                notification_type="material",
            )

        return payload

    @staticmethod
    def _avg_score_for_subject(db: Database, subject: str) -> float:
        result = list(
            db.test_attempts.aggregate(
                [
                    {"$match": {"subject": subject, "submitted_at": {"$ne": None}}},
                    {"$group": {"_id": None, "avg": {"$avg": "$score"}}},
                ]
            )
        )
        if not result:
            return 0.0
        return round(float(result[0]["avg"]), 1)

    @staticmethod
    def _student_count_for_subject(db: Database, subject: str) -> int:
        classes = db.classes.find({"subject": subject}, {"student_ids": 1, "students": 1})
        student_ids: set[str] = set()
        fallback_count = 0
        for cls in classes:
            raw_student_ids = cls.get("student_ids") or []
            if raw_student_ids:
                for student_id in raw_student_ids:
                    student_ids.add(str(student_id))
            else:
                fallback_count += int(cls.get("students", 0) or 0)

        if student_ids:
            return len(student_ids)
        return fallback_count

    @staticmethod
    def get_dashboard(db: Database) -> dict:
        total_students = db.users.count_documents({"role": "student", "status": "active"})
        total_teachers = db.users.count_documents({"role": "teacher", "status": "active"})
        active_tests = db.tests.count_documents({"status": {"$in": ["assigned", "active"]}})

        attempts_total = db.test_attempts.count_documents({"submitted_at": {"$ne": None}})
        attempts_pass = db.test_attempts.count_documents(
            {"submitted_at": {"$ne": None}, "score": {"$gte": 40}}
        )
        pass_rate = round((attempts_pass / attempts_total) * 100, 1) if attempts_total else 0.0

        departments = []
        for subject in SUBJECTS:
            departments.append(
                {
                    "subject": subject,
                    "teachers": db.users.count_documents(
                        {"role": "teacher", "status": "active", "subject": subject}
                    ),
                    "students": AdminService._student_count_for_subject(db, subject),
                    "avg_score": AdminService._avg_score_for_subject(db, subject),
                }
            )

        activity_docs = list(db.activity_logs.find().sort("created_at", -1).limit(5))
        recent_activity = []
        for activity in activity_docs:
            recent_activity.append(
                {
                    "id": str(activity["_id"]),
                    "text": activity.get("text", ""),
                    "time": to_relative_time(
                        activity.get("created_at", datetime.now(timezone.utc))
                    ),
                    "type": activity.get("type", "event"),
                }
            )
        if not recent_activity:
            recent_activity = AdminService._fallback_recent_activity(db, limit=5)

        return {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "active_tests": active_tests,
            "pass_rate": pass_rate,
            "departments": departments,
            "recent_activity": recent_activity,
        }

    @staticmethod
    def _month_start(reference: datetime, month_delta: int = 0) -> datetime:
        year = reference.year
        month = reference.month + month_delta
        while month > 12:
            month -= 12
            year += 1
        while month < 1:
            month += 12
            year -= 1
        return datetime(year, month, 1, tzinfo=timezone.utc)

    @staticmethod
    def get_analytics_report(db: Database) -> AnalyticsReportResponse:
        dashboard = AdminService.get_dashboard(db)

        now = datetime.now(timezone.utc)
        monthly_usage = []

        for offset in range(-5, 1):
            month_start = AdminService._month_start(now, offset)
            next_month_start = AdminService._month_start(month_start, 1)

            tests_count = db.test_attempts.count_documents(
                {
                    "status": "submitted",
                    "submitted_at": {
                        "$gte": month_start,
                        "$lt": next_month_start,
                    },
                }
            )
            papers_count = db.tests.count_documents(
                {
                    "created_at": {
                        "$gte": month_start,
                        "$lt": next_month_start,
                    }
                }
            )

            monthly_usage.append(
                {
                    "month": month_start.strftime("%b"),
                    "tests": int(tests_count),
                    "papers": int(papers_count),
                }
            )

        return AnalyticsReportResponse(
            total_students=dashboard["total_students"],
            total_teachers=dashboard["total_teachers"],
            active_tests=dashboard["active_tests"],
            pass_rate=dashboard["pass_rate"],
            departments=dashboard["departments"],
            monthly_usage=monthly_usage,
        )

    @staticmethod
    def get_billing_report(db: Database) -> BillingReportResponse:
        doc = db.billing_reports.find_one(sort=[("created_at", -1)])
        if not doc:
            return BillingReportResponse(
                plan="N/A",
                students_allowed=0,
                students_used=0,
                monthly_usage=[],
                renewal_date="N/A",
            )

        monthly_usage = [
            {
                "month": item["month"],
                "tests": int(item.get("tests", 0)),
                "papers": int(item.get("papers", 0)),
            }
            for item in doc.get("monthly_usage", [])
        ]
        return BillingReportResponse(
            plan=doc.get("plan", "N/A"),
            students_allowed=int(doc.get("students_allowed", 0)),
            students_used=int(doc.get("students_used", 0)),
            monthly_usage=monthly_usage,
            renewal_date=doc.get("renewal_date", "N/A"),
        )

    @staticmethod
    def export_csv(db: Database, section: str) -> str:
        output = io.StringIO()
        writer = csv.writer(output)

        if section == "analytics":
            analytics = AdminService.get_analytics_report(db)
            writer.writerow(["metric", "value"])
            writer.writerow(["total_students", analytics.total_students])
            writer.writerow(["total_teachers", analytics.total_teachers])
            writer.writerow(["active_tests", analytics.active_tests])
            writer.writerow(["pass_rate", analytics.pass_rate])

            writer.writerow([])
            writer.writerow(["department", "teachers", "students", "avg_score"])
            for row in analytics.departments:
                writer.writerow([row.subject, row.teachers, row.students, row.avg_score])

            writer.writerow([])
            writer.writerow(["month", "tests", "papers"])
            for row in analytics.monthly_usage:
                writer.writerow([row.month, row.tests, row.papers])

        elif section == "billing":
            billing = AdminService.get_billing_report(db)
            writer.writerow(["metric", "value"])
            writer.writerow(["plan", billing.plan])
            writer.writerow(["students_allowed", billing.students_allowed])
            writer.writerow(["students_used", billing.students_used])
            writer.writerow(["renewal_date", billing.renewal_date])

            writer.writerow([])
            writer.writerow(["month", "tests", "papers"])
            for row in billing.monthly_usage:
                writer.writerow([row.month, row.tests, row.papers])
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported export section",
            )

        return output.getvalue()
    @staticmethod
    def set_jee_exam_date(db: Database, jee_date: datetime) -> dict:
        """
        Sets the global JEE exam date and triggers bulk plan generation.
        """
        db.settings.update_one(
            {"key": "global_jee_date"},
            {"$set": {"value": jee_date, "updated_at": datetime.now(timezone.utc)}},
            upsert=True
        )
        
        # Trigger bulk generation
        count = PlannerService.bulk_generate_plans(db, jee_date)
        
        ActivityService.log(
            db,
            text=f"Admin set global JEE exam date to {jee_date.strftime('%Y-%m-%d')} and updated {count} student plans",
            event_type="event",
            actor_role="admin",
            metadata={"jee_date": jee_date.isoformat(), "count": count},
        )
        
        return {"message": f"Global JEE exam date set. {count} student plans updated.", "count": count}
