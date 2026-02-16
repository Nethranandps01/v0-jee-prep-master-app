from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TeacherHomeSummaryResponse(BaseModel):
    total_students: int
    total_papers: int
    subject_avg: float


class TeacherPaperResponse(BaseModel):
    id: str
    title: str
    subject: str
    difficulty: str
    questions: int
    duration: int
    status: str
    year: str | None = None
    assigned: bool = False
    students: int = 0
    question_source: str | None = None
    question_set: list["TeacherPaperQuestionResponse"] | None = None
    created_at: datetime | None = None


class TeacherPaperQuestionResponse(BaseModel):
    id: str
    subject: str
    text: str
    options: list[str]
    correct: int
    explanation: str


class TeacherPaperCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    subject: Literal["Physics", "Chemistry", "Mathematics"]
    difficulty: Literal["Easy", "Medium", "Hard", "Mixed"] = "Medium"
    questions: int = Field(ge=5, le=200)
    duration: int = Field(ge=10, le=360)
    year: Literal["11th", "12th"]
    topic: str | None = Field(default=None, max_length=200)


class TeacherPaperUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    difficulty: Literal["Easy", "Medium", "Hard", "Mixed"] | None = None
    duration: int | None = Field(default=None, ge=10, le=360)
    questions: int | None = Field(default=None, ge=5, le=200)
    status: Literal["draft", "assigned", "archived"] | None = None


class AssignPaperRequest(BaseModel):
    class_ids: list[str] = Field(min_length=1)


class TeacherClassResponse(BaseModel):
    id: str
    name: str
    subject: str
    year: str
    students: int
    avg_score: float


class TeacherClassCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    year: Literal["11th", "12th"]
    subject: Literal["Physics", "Chemistry", "Mathematics"]


class TeacherClassStudentsUpdateRequest(BaseModel):
    student_ids: list[str] = Field(default_factory=list, max_length=500)


class TeacherClassStudentOptionResponse(BaseModel):
    id: str
    name: str
    email: str
    role: Literal["student"]
    status: Literal["active", "inactive"]
    subject: Literal["Physics", "Chemistry", "Mathematics"] | None = None
    year: Literal["11th", "12th"] | None = None
    assigned: bool


class LessonPlanResponse(BaseModel):
    id: str
    subject: str
    year: str
    topic: str
    objectives: list[str]
    activities: list[str]
    duration: int
    status: Literal["draft", "published"]


class LessonPlanCreateRequest(BaseModel):
    year: Literal["11th", "12th"]
    topic: str = Field(min_length=2, max_length=200)
    objectives: list[str]
    activities: list[str]
    duration: int = Field(ge=15, le=180)


class LessonPlanUpdateRequest(BaseModel):
    topic: str | None = None
    objectives: list[str] | None = None
    activities: list[str] | None = None
    duration: int | None = Field(default=None, ge=15, le=180)
    status: Literal["draft", "published"] | None = None


class LibraryItemResponse(BaseModel):
    id: str
    title: str
    subject: str
    type: str
    chapters: int
    year: str
    status: str | None = None
    file_name: str | None = None
    file_size_bytes: int | None = None
    file_content_type: str | None = None
    created_at: datetime | None = None


class LibraryItemCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    subject: Literal["Physics", "Chemistry", "Mathematics", "All"]
    type: Literal["PDF", "Question Bank", "DOCX", "Image"]
    chapters: int = Field(ge=1, le=200)
    year: Literal["11th", "12th"]


class TeacherStudentAttemptResponse(BaseModel):
    attempt_id: str
    test_title: str
    subject: str
    score: float
    total_questions: int
    submitted_at: datetime | None
    violation_reason: str | None
    is_suspicious: bool
    questions: list["TeacherAttemptQuestionDetail"] | None = None


class TeacherAttemptQuestionDetail(BaseModel):
    question_text: str
    selected_option: str | None
    correct_option: str
    is_correct: bool
    explanation: str | None = None
    time_spent: int = 0
