"""Photo upload: validate, resize, push original + medium + thumb to Drive."""

from __future__ import annotations

import logging
import secrets
import uuid

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool

from ..config import get_settings
from ..drive import DriveClient, DriveError
from ..images import ImageInfo, InvalidImage, inspect, make_variants
from ..index import Photo
from ..limits import limiter
from .public import photo_urls

log = logging.getLogger("diwali.upload")
router = APIRouter()

_settings_at_import = get_settings()
UPLOAD_LIMIT = _settings_at_import.upload_rate_limit
PASSCODE_LIMIT = "20/minute"


def passcode_ok(request: Request) -> bool:
    expected = request.app.state.settings.event_passcode
    if not expected:
        return True
    given = request.headers.get("x-event-passcode", "")
    return secrets.compare_digest(given.strip().encode(), expected.encode())


def require_passcode(request: Request) -> None:
    if not passcode_ok(request):
        raise HTTPException(status_code=401, detail="Wrong event passcode")


@router.post("/api/passcode/verify")
@limiter.limit(PASSCODE_LIMIT)
async def verify_passcode(request: Request, response: Response):
    require_passcode(request)
    return {"ok": True}


async def _read_limited(file: UploadFile, max_bytes: int) -> bytes:
    data = bytearray()
    while chunk := await file.read(1024 * 1024):
        data += chunk
        if len(data) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File is larger than {max_bytes // (1024 * 1024)} MB",
            )
    return bytes(data)


def process_and_upload(
    drive: DriveClient, data: bytes, info: ImageInfo, photo_id: str, original_name: str
) -> Photo:
    """Blocking: create variants and upload all three files. Cleans up on partial failure."""
    folders = drive.ensure_subfolders()
    variants = make_variants(data)
    uploaded: list[str] = []
    try:
        base = {"photo_id": photo_id, "original_name": original_name[:200]}
        original = drive.upload_bytes(
            data, f"{photo_id}.{info.extension}", info.mime, drive.folder_id,
            {**base, "variant": "original"},
        )
        uploaded.append(original.id)
        medium = drive.upload_bytes(
            variants.medium, f"{photo_id}.jpg", "image/jpeg", folders["medium"],
            {**base, "variant": "medium"},
        )
        uploaded.append(medium.id)
        thumb = drive.upload_bytes(
            variants.thumb, f"{photo_id}.jpg", "image/jpeg", folders["thumbs"],
            {**base, "variant": "thumb"},
        )
    except DriveError:
        for file_id in uploaded:
            try:
                drive.delete_file(file_id)
            except DriveError:
                log.warning("Could not clean up partial upload %s", file_id)
        raise
    finally:
        del variants
    return Photo(
        id=photo_id,
        original_file_id=original.id,
        medium_file_id=medium.id,
        thumb_file_id=thumb.id,
        created_time=original.created_time,
        original_name=original_name,
    )


@router.post("/api/upload", status_code=201)
@limiter.limit(UPLOAD_LIMIT)
async def upload_photo(request: Request, response: Response, file: UploadFile = File(...)):
    state = request.app.state
    require_passcode(request)
    if state.drive is None:
        raise HTTPException(status_code=503, detail="Photo storage is not configured yet")

    data = await _read_limited(file, state.settings.max_upload_bytes)
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        info = await run_in_threadpool(inspect, data)
    except InvalidImage as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    photo_id = uuid.uuid4().hex
    original_name = file.filename or f"photo.{info.extension}"

    # One image at a time keeps peak memory low on a 512 MB host.
    async with state.upload_semaphore:
        try:
            photo = await run_in_threadpool(
                process_and_upload, state.drive, data, info, photo_id, original_name
            )
        except InvalidImage as exc:
            raise HTTPException(status_code=415, detail=str(exc)) from exc
        except DriveError as exc:
            raise HTTPException(status_code=exc.status, detail=str(exc)) from exc
    del data
    state.index.add(photo)
    state.cache.drop(f"{photo_id}:thumb", f"{photo_id}:medium")
    log.info("Uploaded %s (%s, %dx%d)", photo_id, info.format, info.width, info.height)
    return {**photo.to_public(), **photo_urls(photo.id), "format": info.format}
