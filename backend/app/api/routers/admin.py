from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from pymongo.database import Database

from app.api.deps import get_db, require_roles, get_current_user
from app.schemas.admin import (
    AdminDashboardResponse,
    AnalyticsReportResponse,
    BillingReportResponse,
    ContentItemResponse,
    ContentStatusUpdateRequest,
    SetJeeExamDateRequest,
)
from app.schemas.common import PaginatedResponse
from app.schemas.user import AdminUserCreateRequest, UserPublic, UserStatusUpdateRequest
from app.services.admin_service import AdminService
from app.utils.cache import admin_cache


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_roles("admin"))],
)


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def get_dashboard(
    token: str = Depends(get_current_user),
    db: Database = Depends(get_db),
) -> AdminDashboardResponse:
    cached = admin_cache.get("global_dashboard")
    if cached:
        return AdminDashboardResponse(**cached)
        
    dash = AdminService.get_dashboard(db)
    admin_cache.set("global_dashboard", dash)
    return AdminDashboardResponse(**dash)


@router.get("/users", response_model=PaginatedResponse[UserPublic])
async def list_users(
    role: Literal["admin", "teacher", "student"] | None = None,
    status_filter: Literal["active", "inactive"] | None = Query(default=None, alias="status"),
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
    db: Database = Depends(get_db),
) -> PaginatedResponse[UserPublic]:
    items, meta = AdminService.list_users(
        db,
        role=role,
        status_filter=status_filter,
        search=search,
        page=page,
        limit=limit,
    )
    return PaginatedResponse[UserPublic](
        items=[UserPublic(**item) for item in items],
        meta=meta,
    )


@router.post("/users", response_model=UserPublic, status_code=201)
async def create_user(
    payload: AdminUserCreateRequest,
    db: Database = Depends(get_db),
) -> UserPublic:
    user = AdminService.create_user(db, payload)
    return UserPublic(**user)


@router.patch("/users/{user_id}/status", response_model=UserPublic)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    db: Database = Depends(get_db),
) -> UserPublic:
    user = AdminService.update_user_status(db, user_id, payload.status)
    return UserPublic(**user)


@router.get("/content-items", response_model=PaginatedResponse[ContentItemResponse])
async def list_content_items(
    status_filter: Literal["pending", "approved", "rejected"] | None = Query(
        default=None,
        alias="status",
    ),
    subject: Literal["Physics", "Chemistry", "Mathematics"] | None = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
    db: Database = Depends(get_db),
) -> PaginatedResponse[ContentItemResponse]:
    items, meta = AdminService.list_content_items(
        db,
        status_filter=status_filter,
        subject=subject,
        page=page,
        limit=limit,
    )
    return PaginatedResponse[ContentItemResponse](
        items=[ContentItemResponse(**item) for item in items],
        meta=meta,
    )


@router.patch("/content-items/{content_id}/status", response_model=ContentItemResponse)
async def update_content_status(
    content_id: str,
    payload: ContentStatusUpdateRequest,
    db: Database = Depends(get_db),
) -> ContentItemResponse:
    item = AdminService.update_content_status(db, content_id, payload.status)
    return ContentItemResponse(**item)


@router.get("/reports/analytics", response_model=AnalyticsReportResponse)
async def analytics_report(db: Database = Depends(get_db)) -> AnalyticsReportResponse:
    return AdminService.get_analytics_report(db)


@router.get("/reports/billing", response_model=BillingReportResponse)
async def billing_report(db: Database = Depends(get_db)) -> BillingReportResponse:
    return AdminService.get_billing_report(db)


@router.get("/reports/export", response_model=None)
async def export_report(
    section: Literal["analytics", "billing"] = "analytics",
    format: Literal["csv"] = "csv",
    db: Database = Depends(get_db),
) -> Response:

    data = AdminService.export_csv(db, section)
    filename = f"{section}-report.csv"

    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/settings/jee-exam-date")
async def set_jee_exam_date(
    payload: SetJeeExamDateRequest,
    db: Database = Depends(get_db),
) -> dict:
    return AdminService.set_jee_exam_date(db, payload.jee_exam_date)
