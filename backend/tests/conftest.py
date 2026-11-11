"""Test fixtures: an in-memory fake Drive so the API can be exercised without Google."""

from __future__ import annotations

import io
import itertools
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Settings  # noqa: E402
from app.drive import DriveFile  # noqa: E402
from app.server import create_app  # noqa: E402


class FakeDrive:
    folder_id = "root-folder"

    def __init__(self):
        self.files: dict[str, dict] = {}
        self._ids = itertools.count(1)
        self._clock = datetime(2026, 11, 14, 13, 30, tzinfo=timezone.utc)
        self.fail_next_upload = False

    def _next(self, prefix):
        return f"{prefix}-{next(self._ids)}"

    def verify_folder(self):
        return {"id": self.folder_id, "name": "Party", "mimeType": "application/vnd.google-apps.folder"}

    def ensure_subfolders(self):
        return {"medium": "medium-folder", "thumbs": "thumbs-folder"}

    def subfolder_id(self, name):
        return f"{name}-folder"

    def upload_bytes(self, data, name, mime, parent_id, app_properties=None):
        if self.fail_next_upload:
            self.fail_next_upload = False
            from app.drive import DriveError

            raise DriveError("boom", status=502)
        self._clock += timedelta(seconds=1)
        fid = self._next("f")
        self.files[fid] = {
            "data": data, "name": name, "mime": mime, "parent": parent_id,
            "props": dict(app_properties or {}),
            "created": self._clock.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        }
        return DriveFile(fid, name, self.files[fid]["created"], mime, len(data), self.files[fid]["props"])

    def list_folder(self, folder_id):
        return [
            DriveFile(fid, f["name"], f["created"], f["mime"], len(f["data"]), f["props"])
            for fid, f in self.files.items()
            if f["parent"] == folder_id
        ]

    def download_bytes(self, file_id):
        return self.files[file_id]["data"]

    def delete_file(self, file_id):
        self.files.pop(file_id, None)


def make_jpeg(width=2400, height=1600, color=(200, 40, 60)) -> bytes:
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_heic(width=1200, height=1800) -> bytes:
    import pillow_heif

    heif = pillow_heif.from_pillow(Image.new("RGB", (width, height), (255, 140, 0)))
    buf = io.BytesIO()
    heif.save(buf, quality=80)
    return buf.getvalue()


@pytest.fixture
def settings():
    return Settings(
        _env_file=None,
        google_client_id="x", google_client_secret="y", google_refresh_token="z",
        drive_folder_id="root-folder",
        event_passcode="diya123", admin_token="admin-secret",
        gallery_rotate_minutes=20, gallery_page_size=10,
        cors_origins="http://localhost:5173",
    )


@pytest.fixture
def fake_drive():
    return FakeDrive()


@pytest.fixture
def client(settings, fake_drive):
    app = create_app(settings=settings, drive=fake_drive)
    with TestClient(app) as c:
        yield c
