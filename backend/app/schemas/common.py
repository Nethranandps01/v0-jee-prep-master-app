from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    has_more: bool


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    meta: PaginationMeta


class MessageResponse(BaseModel):
    message: str


class ChatRequest(BaseModel):
    query: str


class ChatAskResponse(BaseModel):
    response: str


class ChatSession(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
