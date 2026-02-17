from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings, get_settings


from app.db.client import create_mongo_client
from app.db.indexes import ensure_indexes  # Added import

def create_app() -> FastAPI:
    settings: Settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup: Connect to DB
        try:
            client = create_mongo_client(settings.mongodb_uri)
            db = client[settings.mongodb_db]
            
            # Assign to state IMMEDIATELY so requests can use the pool
            app.state.mongo_client = client
            app.state.db = db
            
            print("Successfully connected to MongoDB.")
            
            # Run index creation safely
            try:
                ensure_indexes(db)
                print("Indexes ensured.")
            except Exception as idx_err:
                print(f"Warning: Index creation failed (non-critical): {idx_err}")
                
        except Exception as e:
            print(f"Failed to connect to MongoDB during startup: {e}")
            # we don't raise here to allow app to start, but requests will fail if db is None
        
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

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # OPTIONS logging removed to reduce noise
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
        max_age=86400,  # Cache preflight requests for 24 hours
    )

    from starlette.types import ASGIApp, Scope, Receive, Send
    from fastapi.middleware.gzip import GZipMiddleware

    class SelectiveGZipMiddleware:
        def __init__(self, app: ASGIApp, minimum_size: int = 1000, excluded_paths: list[str] = None):
            self.app = app
            self.gzip_app = GZipMiddleware(app, minimum_size=minimum_size)
            self.excluded_paths = excluded_paths or []

        async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
            if scope["type"] == "http":
                path = scope.get("path", "")
                for excluded in self.excluded_paths:
                    if excluded in path:
                        await self.app(scope, receive, send)
                        return
            
            await self.gzip_app(scope, receive, send)

    # Exclude AI streaming endpoints from GZip to prevent buffering
    app.add_middleware(
        SelectiveGZipMiddleware, 
        minimum_size=1000, 
        excluded_paths=["/chat/ask", "/doubts/ask"]
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
