from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.deps import get_current_user, get_db, require_roles
from app.schemas.student import (
    NotificationReadAllResponse,
    NotificationReadRequest,
    NotificationResponse,
)
from app.services.student_service import StudentService


router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    dependencies=[Depends(require_roles("teacher", "student"))],
)


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> list[NotificationResponse]:
    return [
        NotificationResponse(**item)
        for item in StudentService.list_notifications(db, current_user)
    ]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    payload: NotificationReadRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> NotificationResponse:
    updated = StudentService.mark_notification_read(
        db,
        current_user,
        notification_id,
        read=payload.read,
    )
    return NotificationResponse(**updated)


@router.post("/read-all", response_model=NotificationReadAllResponse)
async def mark_all_notifications_read(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> NotificationReadAllResponse:
    updated = StudentService.mark_all_notifications_read(db, current_user)
    return NotificationReadAllResponse(**updated)
