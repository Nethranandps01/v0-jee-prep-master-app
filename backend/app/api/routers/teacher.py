from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import ValidationError
from pymongo.database import Database

from app.api.deps import get_current_user, get_db, require_roles
from app.schemas.common import MessageResponse
from app.schemas.teacher import (
    AssignPaperRequest,
    TeacherClassStudentOptionResponse,
    TeacherClassStudentsUpdateRequest,
    LessonPlanCreateRequest,
    LessonPlanResponse,
    LessonPlanUpdateRequest,
    LibraryItemCreateRequest,
    LibraryItemResponse,
    TeacherClassCreateRequest,
    TeacherClassResponse,
    TeacherHomeSummaryResponse,
    TeacherPaperCreateRequest,
    TeacherPaperResponse,
    TeacherPaperUpdateRequest,
    TeacherStudentAttemptResponse,
)
from app.schemas.user import UserPublic
from app.services.teacher_service import TeacherService


router = APIRouter(
    prefix="/teacher",
    tags=["teacher"],
    dependencies=[Depends(require_roles("teacher"))],
)


@router.get("/home-summary", response_model=TeacherHomeSummaryResponse)
async def home_summary(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherHomeSummaryResponse:
    return TeacherHomeSummaryResponse(**TeacherService.get_home_summary(db, current_user))


@router.get("/papers", response_model=list[TeacherPaperResponse])
async def list_papers(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[TeacherPaperResponse]:
    return [
        TeacherPaperResponse(**paper)
        for paper in TeacherService.list_papers(db, current_user)
    ]


@router.post("/papers", response_model=TeacherPaperResponse, status_code=status.HTTP_201_CREATED)
async def create_paper(
    payload: TeacherPaperCreateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherPaperResponse:
    return TeacherPaperResponse(**TeacherService.create_paper(db, current_user, payload))


@router.get("/papers/{paper_id}", response_model=TeacherPaperResponse)
async def get_paper(
    paper_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherPaperResponse:
    return TeacherPaperResponse(**TeacherService.get_paper(db, current_user, paper_id))


@router.patch("/papers/{paper_id}", response_model=TeacherPaperResponse)
async def update_paper(
    paper_id: str,
    payload: TeacherPaperUpdateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherPaperResponse:
    return TeacherPaperResponse(
        **TeacherService.update_paper(db, current_user, paper_id, payload)
    )


@router.post("/papers/{paper_id}/assign", response_model=TeacherPaperResponse)
async def assign_paper(
    paper_id: str,
    payload: AssignPaperRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherPaperResponse:
    return TeacherPaperResponse(
        **TeacherService.assign_paper(db, current_user, paper_id, payload)
    )


@router.get("/classes", response_model=list[TeacherClassResponse])
async def list_classes(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[TeacherClassResponse]:
    return [TeacherClassResponse(**cls) for cls in TeacherService.list_classes(db, current_user)]


@router.post("/classes", response_model=TeacherClassResponse, status_code=status.HTTP_201_CREATED)
async def create_class(
    payload: TeacherClassCreateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherClassResponse:
    return TeacherClassResponse(**TeacherService.create_class(db, current_user, payload))


@router.get("/classes/{class_id}/students", response_model=list[UserPublic])
async def class_students(
    class_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[UserPublic]:
    return [
        UserPublic(**student)
        for student in TeacherService.class_students(db, current_user, class_id)
    ]


@router.get("/classes/{class_id}/assignable-students", response_model=list[TeacherClassStudentOptionResponse])
async def class_assignable_students(
    class_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[TeacherClassStudentOptionResponse]:
    return [
        TeacherClassStudentOptionResponse(**student)
        for student in TeacherService.list_assignable_students(db, current_user, class_id)
    ]


@router.put("/classes/{class_id}/students", response_model=TeacherClassResponse)
async def update_class_students(
    class_id: str,
    payload: TeacherClassStudentsUpdateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> TeacherClassResponse:
    return TeacherClassResponse(
        **TeacherService.update_class_students(
            db,
            current_user,
            class_id,
            student_ids=payload.student_ids,
        )
    )


@router.get("/lesson-plans", response_model=list[LessonPlanResponse])
async def list_lesson_plans(
    year: Literal["11th", "12th"] | None = Query(default=None),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[LessonPlanResponse]:
    return [
        LessonPlanResponse(**plan)
        for plan in TeacherService.list_lesson_plans(db, current_user, year)
    ]


@router.post(
    "/lesson-plans",
    response_model=LessonPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lesson_plan(
    payload: LessonPlanCreateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LessonPlanResponse:
    return LessonPlanResponse(
        **TeacherService.create_lesson_plan(db, current_user, payload)
    )


@router.patch("/lesson-plans/{lesson_id}", response_model=LessonPlanResponse)
async def update_lesson_plan(
    lesson_id: str,
    payload: LessonPlanUpdateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LessonPlanResponse:
    return LessonPlanResponse(
        **TeacherService.update_lesson_plan(db, current_user, lesson_id, payload)
    )


@router.delete("/lesson-plans/{lesson_id}", response_model=MessageResponse)
async def delete_lesson_plan(
    lesson_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> MessageResponse:
    TeacherService.delete_lesson_plan(db, current_user, lesson_id)
    return MessageResponse(message="Lesson plan deleted")


@router.get("/library-items", response_model=list[LibraryItemResponse])
async def list_library_items(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[LibraryItemResponse]:
    return [
        LibraryItemResponse(**item)
        for item in TeacherService.list_library_items(db, current_user)
    ]


@router.post("/library-items", response_model=LibraryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_library_item(
    payload: LibraryItemCreateRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LibraryItemResponse:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "Direct JSON creation is disabled. "
            "Use /api/v1/teacher/library-items/upload with multipart form-data including file."
        ),
    )


@router.post("/library-items/upload", response_model=LibraryItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_library_item(
    title: str = Form(...),
    subject: Literal["Physics", "Chemistry", "Mathematics", "All"] = Form(...),
    type: Literal["PDF", "Question Bank", "DOCX", "Image"] = Form(...),
    chapters: int = Form(...),
    year: Literal["11th", "12th"] = Form(...),
    publish_now: bool = Form(False),
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> LibraryItemResponse:
    try:
        payload = LibraryItemCreateRequest(
            title=title,
            subject=subject,
            type=type,
            chapters=chapters,
            year=year,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc

    content = await file.read()
    await file.close()
    file_payload = TeacherService.build_library_file_payload(
        filename=file.filename,
        content_type=file.content_type,
        content=content,
        material_type=payload.type,
    )
    created = TeacherService.create_library_item(
        db,
        current_user,
        payload,
        file_payload=file_payload,
        publish_now=publish_now,
    )
    return LibraryItemResponse(**created)
@router.get("/students/{student_id}/attempts", response_model=list[TeacherStudentAttemptResponse])
async def get_student_attempts(
    student_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[TeacherStudentAttemptResponse]:
    return [
        TeacherStudentAttemptResponse(**item)
        for item in TeacherService.get_student_attempts(db, current_user, student_id)
    ]
