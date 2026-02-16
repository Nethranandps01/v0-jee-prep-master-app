from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.schemas.auth import TokenPairResponse
from app.utils.mongo import serialize_id


class AuthService:
    @staticmethod
    def authenticate_user(db: Database, email: str, password: str) -> dict:
        user = db.users.find_one({"email": email.lower()})
        if not user or not verify_password(password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is inactive",
            )
        return user

    @staticmethod
    def issue_token_pair(db: Database, user: dict, settings: Settings) -> TokenPairResponse:
        user_id = str(user["_id"])
        access_token = create_access_token(
            subject=user_id,
            role=user["role"],
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
            expires_minutes=settings.access_token_expire_minutes,
        )

        refresh_token = create_refresh_token()
        db.refresh_tokens.insert_one(
            {
                "user_id": ObjectId(user_id),
                "token_hash": hash_token(refresh_token),
                "expires_at": datetime.now(timezone.utc)
                + timedelta(days=settings.refresh_token_expire_days),
                "revoked_at": None,
                "created_at": datetime.now(timezone.utc),
            }
        )

        return TokenPairResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    @staticmethod
    def login(db: Database, email: str, password: str, settings: Settings) -> TokenPairResponse:
        user = AuthService.authenticate_user(db, email, password)
        return AuthService.issue_token_pair(db, user, settings)

    @staticmethod
    def register(
        db: Database,
        *,
        name: str,
        email: str,
        password: str,
        role: str,
        subject: str | None,
        year: str | None,
        settings: Settings,
    ) -> TokenPairResponse:
        normalized_email = email.lower()
        existing = db.users.find_one({"email": normalized_email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists",
            )

        user = AuthService.create_user(
            db,
            name=name,
            email=normalized_email,
            password=password,
            role=role,
            status="active",
            subject=subject,
            year=year,
        )
        return AuthService.issue_token_pair(db, user, settings)

    @staticmethod
    def refresh(db: Database, refresh_token: str, settings: Settings) -> TokenPairResponse:
        now = datetime.now(timezone.utc)
        token_hash = hash_token(refresh_token)

        token_doc = db.refresh_tokens.find_one(
            {
                "token_hash": token_hash,
                "revoked_at": None,
                "expires_at": {"$gt": now},
            }
        )
        if not token_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        user = db.users.find_one({"_id": token_doc["user_id"]})
        if not user or user.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user for refresh token",
            )

        db.refresh_tokens.update_one(
            {"_id": token_doc["_id"]},
            {"$set": {"revoked_at": now}},
        )

        return AuthService.issue_token_pair(db, user, settings)

    @staticmethod
    def user_to_public(user: dict) -> dict:
        payload = serialize_id(user)
        payload.pop("password_hash", None)
        return payload

    @staticmethod
    def create_user(
        db: Database,
        *,
        name: str,
        email: str,
        password: str,
        role: str,
        status: str = "active",
        subject: str | None = None,
        year: str | None = None,
    ) -> dict:
        now = datetime.now(timezone.utc)
        document = {
            "name": name,
            "email": email.lower(),
            "password_hash": get_password_hash(password),
            "role": role,
            "status": status,
            "subject": subject,
            "year": year,
            "created_at": now,
            "updated_at": now,
        }
        result = db.users.insert_one(document)
        document["_id"] = result.inserted_id
        return document
