import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.routes import router
from backend.services import ServiceNotConfiguredError


def create_app() -> FastAPI:
    app = FastAPI(
        title="ClassyFridge API",
        version="1.0.0",
        description="API contracts connecting the ClassyFridge frontend and ML pipeline.",
    )

    origins = os.getenv(
        "CLASSYFRIDGE_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    ).split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(ServiceNotConfiguredError)
    async def service_not_configured(
        request: object,
        error: ServiceNotConfiguredError,
    ) -> JSONResponse:
        del request
        return JSONResponse(status_code=501, content={"detail": str(error)})

    app.include_router(router)
    return app


app = create_app()
