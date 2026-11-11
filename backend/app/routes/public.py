"""Public, read-only endpoints: health, config, gallery, image streaming."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool

from ..drive import DriveError

router = APIRouter()

IMMUTABLE_CACHE = "public, max-age=31536000, immutable"


def photo_urls(photo_id: str) -> dict[str, str]:
    return {
        "thumb_url": f"/api/photos/{photo_id}/thumb",
        "medium_url": f"/api/photos/{photo_id}/medium",
    }


@router.get("/health")
async def health(request: Request):
    state = request.app.state
    return {
        "status": "ok",
        "photos": state.index.count(),
        "drive": "configured" if state.settings.drive_configured else "not configured",
        "last_rebuild": state.index.last_rebuild.isoformat() if state.index.last_rebuild else None,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/api/config")
async def public_config(request: Request):
    s = request.app.state.settings
    return {
        "passcode_required": bool(s.event_passcode),
        "admin_enabled": bool(s.admin_token),
        "max_upload_mb": s.max_upload_mb,
        "gallery_rotate_minutes": s.gallery_rotate_minutes,
        "gallery_page_size": s.gallery_page_size,
        "drive_folder_link": s.folder_link,
        "allowed_types": ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    }


@router.get("/api/gallery")
async def gallery(request: Request):
    state = request.app.state
    s = state.settings
    now = time.time()
    photos, ends_at, total = state.index.current_set(now, s.rotate_seconds, s.gallery_page_size)
    return {
        "photos": [{**p.to_public(), **photo_urls(p.id)} for p in photos],
        "total": total,
        "server_time": now,
        "rotation_ends_at": ends_at,
        "rotation_ends_at_iso": datetime.fromtimestamp(ends_at, timezone.utc).isoformat(),
        "rotate_minutes": s.gallery_rotate_minutes,
    }


async def _stream_variant(request: Request, photo_id: str, variant: str) -> Response:
    state = request.app.state
    photo = state.index.get(photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    file_id = photo.thumb_file_id if variant == "thumb" else photo.medium_file_id
    cache_key = f"{photo_id}:{variant}"
    data = state.cache.get(cache_key)
    if data is None:
        if state.drive is None:
            raise HTTPException(status_code=503, detail="Drive is not configured")
        try:
            data = await run_in_threadpool(state.drive.download_bytes, file_id)
        except DriveError as exc:
            raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
        state.cache.put(cache_key, data)
    return Response(
        content=data,
        media_type="image/jpeg",
        headers={"Cache-Control": IMMUTABLE_CACHE, "Content-Disposition": "inline"},
    )


@router.get("/api/photos/{photo_id}/thumb")
async def photo_thumb(request: Request, photo_id: str):
    return await _stream_variant(request, photo_id, "thumb")


@router.get("/api/photos/{photo_id}/medium")
async def photo_medium(request: Request, photo_id: str):
    return await _stream_variant(request, photo_id, "medium")
