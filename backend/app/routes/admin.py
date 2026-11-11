"""Host-only endpoints guarded by the X-Admin-Token header."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

from ..drive import DriveError
from .public import photo_urls

router = APIRouter(prefix="/api/admin")


def require_admin(request: Request) -> None:
    expected = request.app.state.settings.admin_token
    if not expected:
        raise HTTPException(status_code=404, detail="Not found")
    given = request.headers.get("x-admin-token", "")
    if not secrets.compare_digest(given.strip().encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Invalid admin token")


@router.get("/verify", dependencies=[Depends(require_admin)])
async def verify():
    return {"ok": True}


@router.get("/photos", dependencies=[Depends(require_admin)])
async def list_photos(request: Request):
    index = request.app.state.index
    photos = list(reversed(index.all_sorted()))
    return {
        "total": len(photos),
        "last_rebuild": index.last_rebuild.isoformat() if index.last_rebuild else None,
        "last_error": index.last_error,
        "photos": [
            {**p.to_public(), **photo_urls(p.id), "original_name": p.original_name,
             "original_file_id": p.original_file_id}
            for p in photos
        ],
    }


@router.post("/reindex", dependencies=[Depends(require_admin)])
async def reindex(request: Request):
    index = request.app.state.index
    try:
        count = await run_in_threadpool(index.rebuild)
    except DriveError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    return {"ok": True, "photos": count}


@router.delete("/photos/{photo_id}", dependencies=[Depends(require_admin)])
async def delete_photo(request: Request, photo_id: str):
    state = request.app.state
    photo = state.index.get(photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    if state.drive is None:
        raise HTTPException(status_code=503, detail="Drive is not configured")
    errors = []
    for file_id in (photo.thumb_file_id, photo.medium_file_id, photo.original_file_id):
        try:
            await run_in_threadpool(state.drive.delete_file, file_id)
        except DriveError as exc:
            errors.append(str(exc))
    if errors:
        raise HTTPException(status_code=502, detail="; ".join(errors))
    state.index.remove(photo_id)
    state.cache.drop(f"{photo_id}:thumb", f"{photo_id}:medium")
    return {"ok": True, "deleted": photo_id}
