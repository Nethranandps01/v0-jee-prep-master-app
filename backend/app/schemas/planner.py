from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

class StudyPlanTask(BaseModel):
    id: str
    title: str
    subject: str
    topic: str
    duration_minutes: int
    status: Literal["pending", "completed", "skipped"] = "pending"
    type: Literal["study", "revision", "mock_test"] = "study"
    subtopics: list[str] = Field(default_factory=list)
    completed_subtopics: list[str] = Field(default_factory=list)
    quiz_status: Literal["not_started", "in_progress", "passed"] = "not_started"
    due_date: datetime
    resource_links: list[str] = Field(default_factory=list)

class StudyPlanResponse(BaseModel):
    id: str
    student_id: str
    tasks: list[StudyPlanTask]
    availability_hours: float
    target_exam_date: datetime
    created_at: datetime
    updated_at: datetime

class UpdateAvailabilityRequest(BaseModel):
    availability_hours: float = Field(ge=0, le=24)
    target_exam_date: datetime | None = None
