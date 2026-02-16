from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


SubjectType = Literal["Physics", "Chemistry", "Mathematics"]
YearType = Literal["11th", "12th"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["teacher", "student"]
    subject: SubjectType | None = None
    year: YearType | None = None

    @model_validator(mode="after")
    def validate_role_fields(self) -> "RegisterRequest":
        if self.role == "teacher" and self.subject is None:
            raise ValueError("subject is required for teacher")
        if self.role == "student" and self.year is None:
            raise ValueError("year is required for student")
        return self


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
