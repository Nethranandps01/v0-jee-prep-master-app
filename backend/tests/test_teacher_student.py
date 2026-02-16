import pytest


@pytest.mark.anyio
async def test_teacher_module_flow(async_client, teacher_headers: dict[str, str]) -> None:
    summary = await async_client.get("/api/v1/teacher/home-summary", headers=teacher_headers)
    assert summary.status_code == 200

    created = await async_client.post(
        "/api/v1/teacher/papers",
        json={
            "title": "Electrostatics Practice Set",
            "subject": "Physics",
            "difficulty": "Medium",
            "questions": 25,
            "duration": 45,
            "year": "12th",
        },
        headers=teacher_headers,
    )
    assert created.status_code == 201
    paper_id = created.json()["id"]

    classes = await async_client.get("/api/v1/teacher/classes", headers=teacher_headers)
    assert classes.status_code == 200
    class_id = classes.json()[0]["id"]

    assigned = await async_client.post(
        f"/api/v1/teacher/papers/{paper_id}/assign",
        json={"class_ids": [class_id]},
        headers=teacher_headers,
    )
    assert assigned.status_code == 200
    assert assigned.json()["status"] == "assigned"


@pytest.mark.anyio
async def test_teacher_can_manage_class_students(async_client, teacher_headers: dict[str, str]) -> None:
    classes = await async_client.get("/api/v1/teacher/classes", headers=teacher_headers)
    assert classes.status_code == 200
    assert len(classes.json()) >= 1
    class_id = classes.json()[0]["id"]

    options = await async_client.get(
        f"/api/v1/teacher/classes/{class_id}/assignable-students",
        headers=teacher_headers,
    )
    assert options.status_code == 200
    assert len(options.json()) >= 1
    first_student_id = options.json()[0]["id"]

    cleared = await async_client.put(
        f"/api/v1/teacher/classes/{class_id}/students",
        json={"student_ids": []},
        headers=teacher_headers,
    )
    assert cleared.status_code == 200
    assert cleared.json()["students"] == 0

    students_after_clear = await async_client.get(
        f"/api/v1/teacher/classes/{class_id}/students",
        headers=teacher_headers,
    )
    assert students_after_clear.status_code == 200
    assert students_after_clear.json() == []

    updated = await async_client.put(
        f"/api/v1/teacher/classes/{class_id}/students",
        json={"student_ids": [first_student_id]},
        headers=teacher_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["students"] == 1

    students = await async_client.get(
        f"/api/v1/teacher/classes/{class_id}/students",
        headers=teacher_headers,
    )
    assert students.status_code == 200
    assert len(students.json()) == 1
    assert students.json()[0]["id"] == first_student_id

    created_11th = await async_client.post(
        "/api/v1/teacher/classes",
        json={"name": "11th Validation", "year": "11th", "subject": "Physics"},
        headers=teacher_headers,
    )
    assert created_11th.status_code == 201
    invalid_assign = await async_client.put(
        f"/api/v1/teacher/classes/{created_11th.json()['id']}/students",
        json={"student_ids": [first_student_id]},
        headers=teacher_headers,
    )
    assert invalid_assign.status_code == 400


def test_generate_chat_reply_disables_thinking_budget(monkeypatch) -> None:
    from app.services import ai_service as ai_service_module

    captured: dict[str, object] = {}

    def fake_call_openai(prompt: str, **kwargs):
        captured["prompt"] = prompt
        captured["kwargs"] = kwargs
        return "Mock response"

    monkeypatch.setattr(ai_service_module, "call_openai", fake_call_openai)
    response = ai_service_module.generate_chat_reply("How should I revise Physics?")

    assert response == "Mock response"
    assert isinstance(captured.get("prompt"), str)
    assert "Student query:" in str(captured["prompt"])
    assert isinstance(captured.get("kwargs"), dict)
    assert captured["kwargs"].get("thinking_budget") == 0
    assert captured["kwargs"].get("max_output_tokens") == 900


def test_generate_chat_reply_uses_question_pattern_mode(monkeypatch) -> None:
    from app.services import ai_service as ai_service_module

    captured: dict[str, object] = {}

    def fake_call_openai(prompt: str, **kwargs):
        captured["prompt"] = prompt
        captured["kwargs"] = kwargs
        return "Question pattern response"

    monkeypatch.setattr(ai_service_module, "call_openai", fake_call_openai)
    response = ai_service_module.generate_chat_reply("what are the question can be asked on photon")

    assert response == "Question pattern response"
    assert "Most asked JEE question types" in str(captured["prompt"])
    assert "Practice questions (8 total" in str(captured["prompt"])
    assert captured["kwargs"].get("thinking_budget") == 0
    assert captured["kwargs"].get("max_output_tokens") == 1200


@pytest.mark.anyio
async def test_teacher_paper_creation_requires_ai_when_configured(
    async_client,
    teacher_headers: dict[str, str],
    monkeypatch,
) -> None:
    from app.services import teacher_service as teacher_service_module

    monkeypatch.setattr(
        teacher_service_module.TeacherService,
        "_should_require_ai_generation",
        staticmethod(lambda: True),
    )
    monkeypatch.setattr(
        teacher_service_module,
        "build_question_set_with_source",
        lambda subject, total_questions, difficulty: (
            [
                {
                    "id": "q1",
                    "subject": subject,
                    "text": "Q1",
                    "options": ["A", "B", "C", "D"],
                    "correct": 0,
                    "explanation": "Mock",
                }
            ],
            "template",
        ),
    )

    response = await async_client.post(
        "/api/v1/teacher/papers",
        json={
            "title": "AI Required Failure Path",
            "subject": "Physics",
            "difficulty": "Medium",
            "questions": 10,
            "duration": 30,
            "year": "12th",
        },
        headers=teacher_headers,
    )
    assert response.status_code == 503


@pytest.mark.anyio
async def test_teacher_library_requires_multipart_upload(
    async_client,
    teacher_headers: dict[str, str],
) -> None:
    response = await async_client.post(
        "/api/v1/teacher/library-items",
        json={
            "title": "Legacy JSON Upload",
            "subject": "Physics",
            "type": "PDF",
            "chapters": 2,
            "year": "12th",
        },
        headers=teacher_headers,
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_student_module_flow(async_client, student_headers: dict[str, str]) -> None:
    tests = await async_client.get("/api/v1/student/tests", headers=student_headers)
    assert tests.status_code == 200
    assigned_test = next((item for item in tests.json() if item.get("status") == "assigned"), None)
    assert assigned_test is not None
    test_id = assigned_test["id"]

    started = await async_client.post(
        f"/api/v1/student/tests/{test_id}/start",
        headers=student_headers,
    )
    assert started.status_code == 200
    attempt_id = started.json()["attempt_id"]

    save_answers = await async_client.post(
        f"/api/v1/student/attempts/{attempt_id}/answers",
        json={"answers": {"q1": 1, "q2": 2, "q3": None}},
        headers=student_headers,
    )
    assert save_answers.status_code == 200

    submitted = await async_client.post(
        f"/api/v1/student/attempts/{attempt_id}/submit",
        headers=student_headers,
    )
    assert submitted.status_code == 200
    assert submitted.json()["score"] >= 0

    result = await async_client.get(
        f"/api/v1/student/results/{attempt_id}",
        headers=student_headers,
    )
    assert result.status_code == 200

    progress = await async_client.get("/api/v1/student/progress", headers=student_headers)
    assert progress.status_code == 200
    weeks = [item["week"] for item in progress.json().get("rank_history", [])]
    assert len(weeks) == len(set(weeks))

    library_items = await async_client.get("/api/v1/student/library-items", headers=student_headers)
    assert library_items.status_code == 200
    assert len(library_items.json()) >= 1
    library_item_id = library_items.json()[0]["id"]

    downloaded = await async_client.get(
        f"/api/v1/student/library-items/{library_item_id}/download",
        headers=student_headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.headers["content-type"]
    assert "attachment; filename=" in downloaded.headers.get("content-disposition", "")

    downloads = await async_client.get(
        "/api/v1/student/library-downloads",
        headers=student_headers,
    )
    assert downloads.status_code == 200
    assert library_item_id in downloads.json()


@pytest.mark.anyio
async def test_student_auto_submit_reports_teacher(
    async_client,
    student_headers: dict[str, str],
    teacher_headers: dict[str, str],
) -> None:
    tests = await async_client.get("/api/v1/student/tests", headers=student_headers)
    assert tests.status_code == 200
    assigned_test = next((item for item in tests.json() if item.get("status") == "assigned"), None)
    assert assigned_test is not None

    started = await async_client.post(
        f"/api/v1/student/tests/{assigned_test['id']}/start",
        headers=student_headers,
    )
    assert started.status_code == 200
    attempt_id = started.json()["attempt_id"]

    submitted = await async_client.post(
        f"/api/v1/student/attempts/{attempt_id}/submit",
        json={"violation_reason": "Student switched tab or app during active test"},
        headers=student_headers,
    )
    assert submitted.status_code == 200

    teacher_notifications = await async_client.get("/api/v1/notifications", headers=teacher_headers)
    assert teacher_notifications.status_code == 200
    auto_submit_report = next(
        (
            item
            for item in teacher_notifications.json()
            if item.get("title") == "Test Auto-Submitted"
            and "Rahul Kumar" in item.get("message", "")
        ),
        None,
    )
    assert auto_submit_report is not None


@pytest.mark.anyio
async def test_student_tests_filtering_works(
    async_client,
    student_headers: dict[str, str],
) -> None:
    all_tests = await async_client.get("/api/v1/student/tests", headers=student_headers)
    assert all_tests.status_code == 200
    assert len(all_tests.json()) >= 1

    assigned_tests = await async_client.get(
        "/api/v1/student/tests",
        params={"status": "assigned"},
        headers=student_headers,
    )
    assert assigned_tests.status_code == 200
    assert all(item.get("status") == "assigned" for item in assigned_tests.json())

    completed_tests = await async_client.get(
        "/api/v1/student/tests",
        params={"status": "completed"},
        headers=student_headers,
    )
    assert completed_tests.status_code == 200
    assert all(item.get("status") == "completed" for item in completed_tests.json())

    physics_tests = await async_client.get(
        "/api/v1/student/tests",
        params={"subject": "Physics"},
        headers=student_headers,
    )
    assert physics_tests.status_code == 200
    assert all(item.get("subject") == "Physics" for item in physics_tests.json())

    chemistry_completed = await async_client.get(
        "/api/v1/student/tests",
        params={"status": "completed", "subject": "Chemistry"},
        headers=student_headers,
    )
    assert chemistry_completed.status_code == 200
    assert all(
        item.get("status") == "completed" and item.get("subject") == "Chemistry"
        for item in chemistry_completed.json()
    )


@pytest.mark.anyio
async def test_student_library_hides_items_without_stored_file(
    async_client,
    teacher_headers: dict[str, str],
    admin_headers: dict[str, str],
    student_headers: dict[str, str],
) -> None:
    upload = await async_client.post(
        "/api/v1/teacher/library-items/upload",
        data={
            "title": "Broken Legacy Material",
            "subject": "Physics",
            "type": "PDF",
            "chapters": "1",
            "year": "12th",
        },
        files={
            "file": ("broken-legacy-material.pdf", b"%PDF-1.4\nlegacy\n", "application/pdf")
        },
        headers=teacher_headers,
    )
    assert upload.status_code == 201
    item_id = upload.json()["id"]

    pending_items = await async_client.get(
        "/api/v1/admin/content-items",
        params={"status": "pending"},
        headers=admin_headers,
    )
    assert pending_items.status_code == 200
    pending = next(
        (
            item
            for item in pending_items.json()["items"]
            if item.get("id") == item_id or item.get("title") == "Broken Legacy Material"
        ),
        None,
    )
    assert pending is not None

    moderated = await async_client.patch(
        f"/api/v1/admin/content-items/{pending['id']}/status",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert moderated.status_code == 200

    # Simulate old/broken data where metadata exists but file blob record is missing.
    db = async_client._transport.app.state.db  # type: ignore[attr-defined]
    db.library_files.delete_one({"library_item_id": item_id})

    listed = await async_client.get("/api/v1/student/library-items", headers=student_headers)
    assert listed.status_code == 200
    assert all(item.get("id") != item_id for item in listed.json())


@pytest.mark.anyio
async def test_teacher_upload_admin_approve_student_downloads_real_file(
    async_client,
    teacher_headers: dict[str, str],
    admin_headers: dict[str, str],
    student_headers: dict[str, str],
) -> None:
    upload = await async_client.post(
        "/api/v1/teacher/library-items/upload",
        data={
            "title": "Uploaded Physics Notes",
            "subject": "Physics",
            "type": "PDF",
            "chapters": "2",
            "year": "12th",
        },
        files={
            "file": ("uploaded-physics-notes.pdf", b"%PDF-1.4\nTeacher upload binary\n", "application/pdf")
        },
        headers=teacher_headers,
    )
    assert upload.status_code == 201
    item_id = upload.json()["id"]
    assert upload.json()["status"] == "pending"
    before_notifications = await async_client.get("/api/v1/notifications", headers=student_headers)
    assert before_notifications.status_code == 200
    before_notification_count = len(before_notifications.json())

    pending_items = await async_client.get(
        "/api/v1/admin/content-items",
        params={"status": "pending"},
        headers=admin_headers,
    )
    assert pending_items.status_code == 200
    pending = next(
        (
            item
            for item in pending_items.json()["items"]
            if item.get("title") == "Uploaded Physics Notes"
        ),
        None,
    )
    assert pending is not None

    moderated = await async_client.patch(
        f"/api/v1/admin/content-items/{pending['id']}/status",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert moderated.status_code == 200
    assert moderated.json()["status"] == "approved"

    after_notifications = await async_client.get("/api/v1/notifications", headers=student_headers)
    assert after_notifications.status_code == 200
    assert len(after_notifications.json()) >= before_notification_count + 1
    assert any(
        item.get("title") == "New Study Material" and "Uploaded Physics Notes" in item.get("message", "")
        for item in after_notifications.json()
    )

    student_items = await async_client.get("/api/v1/student/library-items", headers=student_headers)
    assert student_items.status_code == 200
    student_item = next((item for item in student_items.json() if item.get("id") == item_id), None)
    assert student_item is not None

    downloaded = await async_client.get(
        f"/api/v1/student/library-items/{item_id}/download",
        headers=student_headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.headers.get("content-type", "").startswith("application/pdf")
    assert downloaded.content.startswith(b"%PDF-1.4")


@pytest.mark.anyio
async def test_teacher_upload_publish_now_is_immediately_downloadable(
    async_client,
    teacher_headers: dict[str, str],
    student_headers: dict[str, str],
) -> None:
    before_notifications = await async_client.get("/api/v1/notifications", headers=student_headers)
    assert before_notifications.status_code == 200
    before_notification_count = len(before_notifications.json())

    upload = await async_client.post(
        "/api/v1/teacher/library-items/upload",
        data={
            "title": "Instant Student Access Notes",
            "subject": "Physics",
            "type": "PDF",
            "chapters": "2",
            "year": "12th",
            "publish_now": "true",
        },
        files={
            "file": ("instant-student-access.pdf", b"%PDF-1.4\nInstant access\n", "application/pdf")
        },
        headers=teacher_headers,
    )
    assert upload.status_code == 201
    item_id = upload.json()["id"]
    assert upload.json()["status"] == "approved"

    listed = await async_client.get("/api/v1/student/library-items", headers=student_headers)
    assert listed.status_code == 200
    assert any(item.get("id") == item_id for item in listed.json())

    downloaded = await async_client.get(
        f"/api/v1/student/library-items/{item_id}/download",
        headers=student_headers,
    )
    assert downloaded.status_code == 200
    assert downloaded.content.startswith(b"%PDF-1.4")

    after_notifications = await async_client.get("/api/v1/notifications", headers=student_headers)
    assert after_notifications.status_code == 200
    assert len(after_notifications.json()) >= before_notification_count + 1
    assert any(
        item.get("title") == "New Study Material"
        and "Instant Student Access Notes" in item.get("message", "")
        for item in after_notifications.json()
    )


@pytest.mark.anyio
async def test_student_cannot_access_library_item_of_other_year_even_if_subject_all(
    async_client,
    teacher_headers: dict[str, str],
    admin_headers: dict[str, str],
    student_headers: dict[str, str],
) -> None:
    upload = await async_client.post(
        "/api/v1/teacher/library-items/upload",
        data={
            "title": "All Subject 11th Pack",
            "subject": "All",
            "type": "Question Bank",
            "chapters": "3",
            "year": "11th",
        },
        files={
            "file": ("all-subject-11th.txt", b"11th all-subject pack", "text/plain")
        },
        headers=teacher_headers,
    )
    assert upload.status_code == 201
    item_id = upload.json()["id"]

    pending_items = await async_client.get(
        "/api/v1/admin/content-items",
        params={"status": "pending"},
        headers=admin_headers,
    )
    assert pending_items.status_code == 200
    pending = next(
        (
            item
            for item in pending_items.json()["items"]
            if item.get("title") == "All Subject 11th Pack"
        ),
        None,
    )
    assert pending is not None

    moderated = await async_client.patch(
        f"/api/v1/admin/content-items/{pending['id']}/status",
        json={"status": "approved"},
        headers=admin_headers,
    )
    assert moderated.status_code == 200

    listed = await async_client.get("/api/v1/student/library-items", headers=student_headers)
    assert listed.status_code == 200
    assert all(item.get("id") != item_id for item in listed.json())

    download = await async_client.get(
        f"/api/v1/student/library-items/{item_id}/download",
        headers=student_headers,
    )
    assert download.status_code == 404


@pytest.mark.anyio
async def test_admin_dashboard_falls_back_when_activity_logs_empty(
    async_client,
    admin_headers: dict[str, str],
) -> None:
    db = async_client._transport.app.state.db  # type: ignore[attr-defined]
    db.activity_logs.delete_many({})

    response = await async_client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["recent_activity"]) > 0
    assert all("text" in item and "type" in item and "time" in item for item in payload["recent_activity"])


@pytest.mark.anyio
async def test_student_cannot_start_unassigned_draft(
    async_client,
    teacher_headers: dict[str, str],
    student_headers: dict[str, str],
) -> None:
    created = await async_client.post(
        "/api/v1/teacher/papers",
        json={
            "title": "Draft Access Guard Test",
            "subject": "Physics",
            "difficulty": "Easy",
            "questions": 10,
            "duration": 20,
            "year": "12th",
        },
        headers=teacher_headers,
    )
    assert created.status_code == 201
    draft_id = created.json()["id"]

    listed = await async_client.get("/api/v1/student/tests", headers=student_headers)
    assert listed.status_code == 200
    assert all(test["id"] != draft_id for test in listed.json())

    started = await async_client.post(
        f"/api/v1/student/tests/{draft_id}/start",
        headers=student_headers,
    )
    assert started.status_code == 403


@pytest.mark.anyio
async def test_resume_attempt_returns_saved_answers(async_client, student_headers: dict[str, str]) -> None:
    tests = await async_client.get("/api/v1/student/tests", headers=student_headers)
    assert tests.status_code == 200
    assigned_test = next((item for item in tests.json() if item.get("status") == "assigned"), None)
    assert assigned_test is not None
    test_id = assigned_test["id"]

    first_start = await async_client.post(
        f"/api/v1/student/tests/{test_id}/start",
        headers=student_headers,
    )
    assert first_start.status_code == 200
    attempt_id = first_start.json()["attempt_id"]

    save_answers = await async_client.post(
        f"/api/v1/student/attempts/{attempt_id}/answers",
        json={"answers": {"q1": 2}},
        headers=student_headers,
    )
    assert save_answers.status_code == 200

    resumed = await async_client.post(
        f"/api/v1/student/tests/{test_id}/start",
        headers=student_headers,
    )
    assert resumed.status_code == 200
    assert resumed.json()["attempt_id"] == attempt_id
    assert resumed.json()["answers"].get("q1") == 2


@pytest.mark.anyio
async def test_notifications_and_chat(
    async_client,
    student_headers: dict[str, str],
) -> None:
    notifications = await async_client.get("/api/v1/notifications", headers=student_headers)
    assert notifications.status_code == 200
    assert len(notifications.json()) >= 1

    first_unread = next((item for item in notifications.json() if item.get("read") is False), None)
    if first_unread is not None:
        marked = await async_client.patch(
            f"/api/v1/notifications/{first_unread['id']}/read",
            json={"read": True},
            headers=student_headers,
        )
        assert marked.status_code == 200
        assert marked.json()["read"] is True

    marked_all = await async_client.post(
        "/api/v1/notifications/read-all",
        headers=student_headers,
    )
    assert marked_all.status_code == 200
    assert "updated_count" in marked_all.json()

    chat = await async_client.post(
        "/api/v1/chat/ask",
        json={"query": "Explain Newton's laws"},
        headers=student_headers,
    )
    assert chat.status_code == 200
    assert isinstance(chat.json()["response"], str)
    assert chat.json()["response"].strip()


@pytest.mark.anyio
async def test_student_doubt_api_persists_history(
    async_client,
    student_headers: dict[str, str],
) -> None:
    asked = await async_client.post(
        "/api/v1/student/doubts/ask",
        json={"query": "Why does projectile motion have independent axes?", "subject": "Physics"},
        headers=student_headers,
    )
    assert asked.status_code == 200
    payload = asked.json()
    assert payload["query"]
    assert payload["response"]
    assert payload["subject"] == "Physics"

    history = await async_client.get(
        "/api/v1/student/doubts",
        params={"limit": 5},
        headers=student_headers,
    )
    assert history.status_code == 200
    assert any(item["id"] == payload["id"] for item in history.json())
