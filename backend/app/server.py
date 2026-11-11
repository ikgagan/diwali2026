"""FastAPI application factory."""

from __future__ import annotations

import asyncio
import contextlib
import logging

from fastapi import FastAPI, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import Settings, get_settings
from .drive import DriveClient
from .index import ByteCache, PhotoIndex
from .limits import limiter
from .routes import admin, public, upload

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("diwali")


def create_app(settings: Settings | None = None, drive: DriveClient | None = None) -> FastAPI:
    settings = settings or get_settings()
    if drive is None and settings.drive_configured:
        drive = DriveClient(settings)
    if drive is None:
        log.warning("Google Drive is NOT configured: uploads and gallery will be empty.")

    @contextlib.asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings = settings
        app.state.drive = drive
        app.state.index = PhotoIndex(drive)
        app.state.cache = ByteCache()
        app.state.upload_semaphore = asyncio.Semaphore(1)

        if drive is not None:
            try:
                info = await run_in_threadpool(drive.verify_folder)
                log.info("Drive folder OK: %s (%s)", info.get("name"), info.get("id"))
                await run_in_threadpool(app.state.index.rebuild)
            except Exception as exc:  # noqa: BLE001 - do not crash the host on boot
                log.error("Drive startup check failed: %s", exc)

        async def refresh_loop():
            while True:
                await asyncio.sleep(settings.index_refresh_seconds)
                try:
                    await run_in_threadpool(app.state.index.rebuild)
                except Exception as exc:  # noqa: BLE001
                    log.warning("Periodic index refresh failed: %s", exc)

        task = asyncio.create_task(refresh_loop()) if drive is not None else None
        try:
            yield
        finally:
            if task:
                task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await task

    app = FastAPI(title="Gagan's Diwali Soirée Photos", version="1.0.0", lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "X-Event-Passcode", "X-Admin-Token"],
        max_age=86400,
    )

    app.include_router(public.router)
    app.include_router(upload.router)
    app.include_router(admin.router)

    @app.get("/", include_in_schema=False)
    async def root(request: Request):
        return JSONResponse({"service": "diwali-photos", "docs": "/docs", "health": "/health"})

    return app
