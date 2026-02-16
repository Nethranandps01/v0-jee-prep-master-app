from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.deps import get_current_user, get_db
from app.core.config import get_settings
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenPairResponse
from app.schemas.user import UserPublic
from app.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenPairResponse, status_code=201)
async def register(
    payload: RegisterRequest,
    db: Database = Depends(get_db),
) -> TokenPairResponse:
    settings = get_settings()
    return AuthService.register(
        db,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        subject=payload.subject,
        year=payload.year,
        settings=settings,
    )


@router.post("/login", response_model=TokenPairResponse)
async def login(
    payload: LoginRequest,
    db: Database = Depends(get_db),
) -> TokenPairResponse:
    settings = get_settings()
    return AuthService.login(db, payload.email, payload.password, settings)


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_token(
    payload: RefreshRequest,
    db: Database = Depends(get_db),
) -> TokenPairResponse:
    settings = get_settings()
    return AuthService.refresh(db, payload.refresh_token, settings)


@router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)) -> UserPublic:
    return UserPublic(**AuthService.user_to_public(current_user))
