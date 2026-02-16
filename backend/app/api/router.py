from fastapi import APIRouter

from app.api.routers import admin, auth, chat, health, notifications, student, teacher


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(teacher.router)
api_router.include_router(student.router)
api_router.include_router(notifications.router)
api_router.include_router(chat.router)
