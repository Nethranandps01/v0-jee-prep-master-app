from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


RoleType = Literal["admin", "teacher", "student"]
UserStatusType = Literal["active", "inactive"]
SubjectType = Literal["Physics", "Chemistry", "Mathematics"]
YearType = Literal["11th", "12th"]


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: RoleType
    status: UserStatusType
    subject: SubjectType | None = None
    year: YearType | None = None
    availability_hours: float | None = Field(default=None, ge=0, le=24)
    target_exam_date: datetime | None = None
    created_at: datetime | None = None


class AdminUserCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["teacher", "student"]
    subject: SubjectType | None = None
    year: YearType | None = None

    @model_validator(mode="after")
    def validate_role_fields(self) -> "AdminUserCreateRequest":
        if self.role == "teacher" and self.subject is None:
            raise ValueError("subject is required for teacher")
        if self.role == "student" and self.year is None:
            raise ValueError("year is required for student")
        return self


class UserStatusUpdateRequest(BaseModel):
    status: UserStatusType
