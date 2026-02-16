from datetime import datetime
from typing import Literal

from pydantic import BaseModel


ContentStatusType = Literal["pending", "approved", "rejected"]


class DepartmentPerformance(BaseModel):
    subject: str
    teachers: int
    students: int
    avg_score: float


class ActivityItem(BaseModel):
    id: str
    text: str
    time: str
    type: str


class AdminDashboardResponse(BaseModel):
    total_students: int
    total_teachers: int
    active_tests: int
    pass_rate: float
    departments: list[DepartmentPerformance]
    recent_activity: list[ActivityItem]


class ContentItemResponse(BaseModel):
    id: str
    title: str
    uploaded_by: str
    subject: str
    date: str
    status: ContentStatusType
    created_at: datetime | None = None


class ContentStatusUpdateRequest(BaseModel):
    status: Literal["approved", "rejected"]


class MonthlyUsageItem(BaseModel):
    month: str
    tests: int
    papers: int


class AnalyticsReportResponse(BaseModel):
    total_students: int
    total_teachers: int
    active_tests: int
    pass_rate: float
    departments: list[DepartmentPerformance]
    monthly_usage: list[MonthlyUsageItem]


class BillingReportResponse(BaseModel):
    plan: str
    students_allowed: int
    students_used: int
    monthly_usage: list[MonthlyUsageItem]
    renewal_date: str


class SetJeeExamDateRequest(BaseModel):
    jee_exam_date: datetime
