from typing import Callable

from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.security import decode_token
from app.db.client import create_mongo_client
from app.db.indexes import ensure_indexes


bearer_scheme = HTTPBearer(auto_error=False)



async def get_db(request: Request) -> Database:
    db = getattr(request.app.state, "db", None)
    if db is None:
        # Fallback for tests or if startup failed
        settings = get_settings()
        try:
            client = create_mongo_client(settings.mongodb_uri)
            db = client[settings.mongodb_db]
            # DO NOT call ensure_indexes here in request path as it blocks
        except Exception as exc:
            print(f"FAILED TO CONNECT TO MONGODB: {exc}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database connection not available: {str(exc)}",
            ) from exc

        request.app.state.mongo_client = client
        request.app.state.db = db
    return db



async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Database = Depends(get_db),
) -> dict:
    settings: Settings = get_settings()
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        payload = decode_token(
            credentials.credentials,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    if payload.get("token_type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token",
        )

    try:
        user_oid = ObjectId(subject)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject",
        ) from exc

    user = db.users.find_one({"_id": user_oid})
    if not user or user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    user["id"] = str(user["_id"])
    return user



def require_roles(*roles: str) -> Callable:
    async def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency
