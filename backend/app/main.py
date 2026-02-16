from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings, get_settings



def create_app() -> FastAPI:
    settings: Settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        client = getattr(app.state, "mongo_client", None)
        if client is not None:
            client.close()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        version="0.1.0",
        lifespan=lifespan,
    )

    from fastapi import Request
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        if request.method == "OPTIONS":
            print(f"DEBUG: OPTIONS request to {request.url}")
            print(f"DEBUG: Headers: {dict(request.headers)}")
        response = await call_next(request)
        if response.status_code >= 400:
            print(f"DEBUG: Response status: {response.status_code} for {request.method} {request.url}")
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Must be False if origins is "*"
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/")
    async def root() -> dict:
        return {
            "service": settings.app_name,
            "docs": "/docs",
            "openapi": "/openapi.json",
        }

    return app


app = create_app()
