from fastapi import APIRouter, Depends

from app.api.deps import require_roles
from app.schemas.student import ChatAskRequest, ChatAskResponse
from app.services.student_service import StudentService


router = APIRouter(
    prefix="/chat",
    tags=["chat"],
    dependencies=[Depends(require_roles("teacher", "student"))],
)


@router.post("/ask", response_model=ChatAskResponse)
async def ask_chat(payload: ChatAskRequest) -> ChatAskResponse:
    return ChatAskResponse(response=StudentService.ask_chat(payload.query))
