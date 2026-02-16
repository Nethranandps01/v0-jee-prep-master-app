from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StudentHomeSummaryResponse(BaseModel):
    assigned_tests: int
    completed_tests: int
    avg_score: float
    streak: int


class StudentTestResponse(BaseModel):
    id: str
    title: str
    subject: str
    difficulty: str
    questions: int
    duration: int
    status: str
    attempt_id: str | None = None
    year: str | None = None
    score: float | None = None
    created_at: datetime | None = None


class AttemptQuestionResponse(BaseModel):
    id: str
    subject: str
    text: str
    options: list[str]


class StartAttemptResponse(BaseModel):
    attempt_id: str
    status: str
    started_at: datetime
    duration: int
    questions: list[AttemptQuestionResponse] = Field(default_factory=list)
    answers: dict[str, int | None] = Field(default_factory=dict)


class SaveAnswersRequest(BaseModel):
    answers: dict[str, int | None]
    time_spent: dict[str, int] | None = None


class SubmitAttemptRequest(BaseModel):
    violation_reason: str | None = Field(default=None, max_length=500)
    time_spent: dict[str, int] | None = None


class SubmitAttemptResponse(BaseModel):
    attempt_id: str
    score: float
    total_questions: int
    answered: int
    correct_answers: int
    incorrect_answers: int
    unattempted: int


class ResultQuestionResponse(BaseModel):
    question_id: str
    subject: str
    question_text: str
    options: list[str]
    selected_answer: int | None
    correct_answer: int
    is_correct: bool
    explanation: str


class ResultResponse(BaseModel):
    attempt_id: str
    test_id: str
    subject: str
    score: float
    total_questions: int
    answered: int
    correct_answers: int
    incorrect_answers: int
    unattempted: int
    submitted_at: datetime
    questions: list[ResultQuestionResponse] = Field(default_factory=list)


class RankPoint(BaseModel):
    week: str
    rank: int


class TopicMastery(BaseModel):
    topic: str
    mastery: float


class StudentProgressResponse(BaseModel):
    overall_rank: int
    total_students: int
    tests_completed: int
    avg_score: float
    rank_history: list[RankPoint]
    topic_mastery: list[TopicMastery]


class StudentLibraryItemResponse(BaseModel):
    id: str
    title: str
    subject: str
    type: str
    chapters: int
    year: str
    file_name: str | None = None
    file_size_bytes: int | None = None
    file_content_type: str | None = None
    external_url: str | None = None
    metadata: dict | None = None


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: str | None = Field(default=None, max_length=1000)


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime


class NotificationReadRequest(BaseModel):
    read: bool = True


class NotificationReadAllResponse(BaseModel):
    updated_count: int


class ChatAskRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1500)


class ChatAskResponse(BaseModel):
    response: str


class StudentDoubtAskRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1500)
    subject: Literal["Physics", "Chemistry", "Mathematics"] | None = None
    context: str | None = Field(default=None, max_length=2000)


class StudentDoubtResponse(BaseModel):
    id: str
    query: str
    response: str
    subject: str | None = None
    context: str | None = None
    created_at: datetime


class QuizSubmitRequest(BaseModel):
    answers: dict[str, int]


class QuizSubmitResponse(BaseModel):
    attempt_id: str
    score: float
    passed: bool
    correct_count: int
    total_questions: int
