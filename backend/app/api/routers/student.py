from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from pymongo.database import Database

from app.api.deps import get_current_user, get_db, require_roles
from app.schemas.common import MessageResponse, ChatAskResponse, ChatRequest, ChatSession, ChatMessage
from app.schemas.student import (
    FeedbackRequest,
    ResultResponse,
    SaveAnswersRequest,
    SubmitAttemptRequest,
    StartAttemptResponse,
    StudentDoubtAskRequest,
    StudentDoubtResponse,
    StudentHomeSummaryResponse,
    StudentLibraryItemResponse,
    StudentProgressResponse,
    StudentTestResponse,
    SubmitAttemptResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.schemas.planner import StudyPlanResponse, UpdateAvailabilityRequest
from app.services.student_service import StudentService
from app.services.ai_service import stream_chat_reply
from app.utils.cache import student_cache  # Added


router = APIRouter(
    prefix="/student",
    tags=["student"],
    dependencies=[Depends(require_roles("student"))],
)


@router.post("/chat/ask")
async def ask_ai_chat(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    return StreamingResponse(
        stream_chat_reply(payload.query),
        media_type="text/event-stream"
    )
@router.get("/home-summary", response_model=StudentHomeSummaryResponse)
async def home_summary(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StudentHomeSummaryResponse:
    user_id = str(current_user["_id"])
    cached = student_cache.get(f"home_{user_id}")
    if cached:
        return StudentHomeSummaryResponse(**cached)
    
    summary = StudentService.home_summary(db, current_user)
    student_cache.set(f"home_{user_id}", summary)
    return StudentHomeSummaryResponse(**summary)

@router.get("/tests", response_model=list[StudentTestResponse])
async def list_tests(
    status_filter: Literal["assigned", "completed"] | None = Query(default=None, alias="status"),
    subject: Literal["Physics", "Chemistry", "Mathematics"] | None = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[StudentTestResponse]:
    return [
        StudentTestResponse(**test)
        for test in StudentService.list_tests(db, current_user, status_filter, subject)
    ]


@router.post("/tests/{test_id}/start", response_model=StartAttemptResponse)
async def start_test(
    test_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StartAttemptResponse:
    return StartAttemptResponse(**StudentService.start_test(db, current_user, test_id))


@router.post("/attempts/{attempt_id}/answers")
async def save_answers(
    attempt_id: str,
    payload: SaveAnswersRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    return StudentService.save_answers(db, current_user, attempt_id, payload.answers)


@router.post("/attempts/{attempt_id}/submit", response_model=SubmitAttemptResponse)
async def submit_attempt(
    attempt_id: str,
    payload: SubmitAttemptRequest | None = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> SubmitAttemptResponse:
    return SubmitAttemptResponse(
        **StudentService.submit_attempt(
            db,
            current_user,
            attempt_id,
            violation_reason=(payload.violation_reason if payload else None),
            time_spent=(payload.time_spent if payload else None),
        )
    )


@router.get("/results/{attempt_id}", response_model=ResultResponse)
async def get_result(
    attempt_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ResultResponse:
    return ResultResponse(**StudentService.result(db, current_user, attempt_id))


@router.get("/progress", response_model=StudentProgressResponse)
async def progress(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StudentProgressResponse:
    user_id = str(current_user["_id"])
    cached = student_cache.get(f"progress_{user_id}")
    if cached:
        return StudentProgressResponse(**cached)
        
    prog = StudentService.progress(db, current_user)
    student_cache.set(f"progress_{user_id}", prog)
    return StudentProgressResponse(**prog)


@router.get("/library-items", response_model=list[StudentLibraryItemResponse])
async def list_library_items(
    subject: Literal["Physics", "Chemistry", "Mathematics"] | None = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[StudentLibraryItemResponse]:
    return [
        StudentLibraryItemResponse(**item)
        for item in StudentService.list_library(db, current_user, subject)
    ]


@router.get("/library-downloads", response_model=list[str])
async def list_library_downloads(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[str]:
    return StudentService.list_library_downloads(db, current_user)


@router.get("/library-items/{item_id}/download", response_model=None)
async def download_library_item(
    item_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Response:
    payload = StudentService.download_library_item(db, current_user, item_id)
    filename = payload["filename"]
    content_type = payload["content_type"]
    content = payload["content"]
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/feedback", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    return MessageResponse(**StudentService.submit_feedback(db, current_user, payload))



@router.post("/chat/sessions", response_model=ChatSession)
async def create_chat_session(
    title: str | None = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> ChatSession:
    return ChatSession(**StudentService.create_chat_session(db, current_user, title))


@router.get("/chat/sessions", response_model=list[ChatSession])
async def list_chat_sessions(
    limit: int = 20,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ChatSession]:
    return [
        ChatSession(**session)
        for session in StudentService.list_chat_sessions(db, current_user, limit)
    ]


@router.get("/chat/sessions/{session_id}/messages", response_model=list[ChatMessage])
async def get_chat_session_messages(
    session_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[ChatMessage]:
    return [
        ChatMessage(**msg)
        for msg in StudentService.get_chat_session_messages(db, current_user, session_id)
    ]


@router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    success = StudentService.delete_chat_session(db, current_user, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return MessageResponse(message="Session deleted successfully")


@router.post("/doubts/ask")
async def ask_student_doubt(
    payload: StudentDoubtAskRequest,
    session_id: str | None = Query(default=None),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StreamingResponse:
    # 1. Ensure a session exists or create one if not provided (though frontend should ideally manage this)
    # Actually, if session_id is None, we should probably create one, BUT doing it inside a streaming response 
    # might be tricky if we want to return the ID. 
    # For now, let's assume valid session_id is passed, OR we just log without session if missing (fallback).
    # Better: If session_id is present, we log.
    
    if session_id:
        StudentService.save_chat_message(db, session_id, "user", payload.query)

    async def stream_and_save():
        full_response = ""
        async for chunk in stream_chat_reply(payload.query):
            full_response += chunk
            yield chunk
        
        # After streaming is done, save the AI response
        if session_id:
            StudentService.save_chat_message(db, session_id, "ai", full_response)
            
            # Auto-title session if it's the first message (or just check if title is "New Chat")
            # We can do a quick check or just leave it generic for now. 
            # Optimization: Update title asynchronously based on first prompt? 
            # Let's keep it simple: Just save for now.

    return StreamingResponse(
        stream_and_save(), 
        media_type="text/event-stream"
    )

@router.get("/doubts", response_model=list[StudentDoubtResponse])
async def list_student_doubts(
    limit: int = Query(default=20, ge=1, le=100),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[StudentDoubtResponse]:
    return [
        StudentDoubtResponse(**item)
        for item in StudentService.list_student_doubts(db, current_user, limit=limit)
    ]


@router.get("/planner/plan", response_model=StudyPlanResponse)
async def get_study_plan(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StudyPlanResponse:
    plan = StudentService.get_study_plan(db, current_user)
    if not plan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Study plan not found")
    return StudyPlanResponse(**plan)


@router.post("/planner/generate", response_model=StudyPlanResponse)
async def generate_study_plan(
    payload: UpdateAvailabilityRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> StudyPlanResponse:
    return StudyPlanResponse(**StudentService.generate_study_plan(db, current_user, payload))


@router.post("/planner/tasks/{task_id}/complete", response_model=MessageResponse)
async def complete_study_plan_task(
    task_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    success = StudentService.mark_study_plan_task_complete(db, current_user, task_id)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found or already completed")
    return MessageResponse(message="Task marked as complete")


@router.post("/planner/tasks/{task_id}/quiz", response_model=dict)
async def generate_task_quiz(
    task_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    from app.services.planner_service import PlannerService
    return PlannerService.generate_task_quiz(db, current_user["_id"], task_id)


@router.post("/planner/tasks/{task_id}/subtopics/toggle", response_model=dict)
async def toggle_task_subtopic(
    task_id: str,
    subtopic: str = Query(...),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    from app.services.planner_service import PlannerService
    return PlannerService.toggle_task_subtopic(db, current_user["_id"], task_id, subtopic)


@router.post("/planner/quiz/{attempt_id}/submit", response_model=QuizSubmitResponse)
async def submit_task_quiz(
    attempt_id: str,
    payload: QuizSubmitRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> QuizSubmitResponse:
    from app.services.planner_service import PlannerService
    result = PlannerService.submit_task_quiz(db, current_user["_id"], attempt_id, payload.answers)
    return QuizSubmitResponse(**result)


@router.get("/planner/assess", response_model=dict)
async def assess_study_progress(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> dict:
    return StudentService.assess_study_progress(db, current_user)


@router.get("/public-resources/search", response_model=list[dict])
async def search_public_resources(
    topic: str,
    subject: Literal["Physics", "Chemistry", "Mathematics"] | None = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    return StudentService.search_public_resources(db, current_user, topic, subject)
