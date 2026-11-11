"""Thin Google Drive v3 wrapper using an OAuth refresh token for the host's account.

Blocking calls only. Callers run these in a threadpool.
"""

from __future__ import annotations

import io
import logging
import random
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from .config import Settings

log = logging.getLogger("diwali.drive")

SCOPE_FULL = "https://www.googleapis.com/auth/drive"
SCOPE_FILE = "https://www.googleapis.com/auth/drive.file"
FOLDER_MIME = "application/vnd.google-apps.folder"
SUBFOLDERS = ("medium", "thumbs")
RETRYABLE_STATUS = {429, 500, 502, 503, 504}
T = TypeVar("T")


class DriveError(Exception):
    """A Drive operation failed after retries. `status` is an HTTP-ish code for the API."""

    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class DriveFile:
    id: str
    name: str
    created_time: str
    mime: str
    size: int
    app_properties: dict[str, str]


class DriveClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._creds = Credentials(
            token=None,
            refresh_token=settings.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
        )
        self.folder_id = settings.drive_folder_id
        self._subfolder_ids: dict[str, str] = {}
        self._lock = threading.Lock()

    # ----- plumbing -------------------------------------------------------
    def _service(self):
        # A fresh service object per call keeps httplib2 (not thread-safe) out of trouble.
        return build("drive", "v3", credentials=self._creds, cache_discovery=False)

    def _retry(self, fn: Callable[[], T], what: str, attempts: int = 4) -> T:
        for attempt in range(attempts):
            try:
                return fn()
            except RefreshError as exc:
                raise DriveError(
                    "Google refused the refresh token. Re-run scripts/get_refresh_token.py "
                    "and update GOOGLE_REFRESH_TOKEN (Testing-mode tokens expire after 7 days).",
                    status=503,
                ) from exc
            except HttpError as exc:
                status = exc.resp.status if exc.resp is not None else 0
                if status in RETRYABLE_STATUS and attempt < attempts - 1:
                    delay = min(8.0, 0.6 * (2**attempt)) + random.random() * 0.4
                    log.warning("Drive %s failed with %s, retrying in %.1fs", what, status, delay)
                    time.sleep(delay)
                    continue
                if status == 403 and "storageQuotaExceeded" in str(exc):
                    raise DriveError("Google Drive storage is full.", status=507) from exc
                if status == 404:
                    raise DriveError(f"Drive {what}: file or folder not found.", status=404) from exc
                raise DriveError(f"Drive {what} failed (HTTP {status}).", status=502) from exc
            except (OSError, TimeoutError) as exc:
                if attempt < attempts - 1:
                    time.sleep(min(8.0, 0.6 * (2**attempt)))
                    continue
                raise DriveError(f"Drive {what} failed: network error.", status=502) from exc
        raise DriveError(f"Drive {what} failed.")  # pragma: no cover

    # ----- folders --------------------------------------------------------
    def verify_folder(self) -> dict[str, Any]:
        def _get():
            return (
                self._service()
                .files()
                .get(fileId=self.folder_id, fields="id,name,mimeType,webViewLink")
                .execute()
            )

        info = self._retry(_get, "folder lookup")
        if info.get("mimeType") != FOLDER_MIME:
            raise DriveError("DRIVE_FOLDER_ID does not point to a folder.", status=500)
        return info

    def subfolder_id(self, name: str) -> str:
        with self._lock:
            cached = self._subfolder_ids.get(name)
        if cached:
            return cached

        def _find():
            q = (
                f"name = '{name}' and '{self.folder_id}' in parents "
                f"and mimeType = '{FOLDER_MIME}' and trashed = false"
            )
            res = self._service().files().list(q=q, fields="files(id)", pageSize=1).execute()
            return res.get("files", [])

        found = self._retry(_find, f"find {name}/")
        if found:
            folder_id = found[0]["id"]
        else:
            def _create():
                body = {"name": name, "mimeType": FOLDER_MIME, "parents": [self.folder_id]}
                return self._service().files().create(body=body, fields="id").execute()

            folder_id = self._retry(_create, f"create {name}/")["id"]
            log.info("Created Drive subfolder %s (%s)", name, folder_id)
        with self._lock:
            self._subfolder_ids[name] = folder_id
        return folder_id

    def ensure_subfolders(self) -> dict[str, str]:
        return {name: self.subfolder_id(name) for name in SUBFOLDERS}

    # ----- files ----------------------------------------------------------
    def upload_bytes(
        self,
        data: bytes,
        name: str,
        mime: str,
        parent_id: str,
        app_properties: dict[str, str] | None = None,
    ) -> DriveFile:
        def _upload():
            media = MediaIoBaseUpload(
                io.BytesIO(data), mimetype=mime, resumable=True, chunksize=5 * 1024 * 1024
            )
            body: dict[str, Any] = {"name": name, "parents": [parent_id]}
            if app_properties:
                body["appProperties"] = app_properties
            return (
                self._service()
                .files()
                .create(
                    body=body,
                    media_body=media,
                    fields="id,name,createdTime,mimeType,size,appProperties",
                )
                .execute()
            )

        return _to_drive_file(self._retry(_upload, f"upload {name}"))

    def list_folder(self, folder_id: str) -> list[DriveFile]:
        files: list[DriveFile] = []
        page_token: str | None = None
        while True:
            def _page(token=page_token):
                return (
                    self._service()
                    .files()
                    .list(
                        q=f"'{folder_id}' in parents and trashed = false "
                        f"and mimeType != '{FOLDER_MIME}'",
                        fields="nextPageToken,files(id,name,createdTime,mimeType,size,appProperties)",
                        pageSize=1000,
                        orderBy="createdTime",
                        pageToken=token,
                    )
                    .execute()
                )

            res = self._retry(_page, "list")
            files.extend(_to_drive_file(f) for f in res.get("files", []))
            page_token = res.get("nextPageToken")
            if not page_token:
                return files

    def download_bytes(self, file_id: str) -> bytes:
        def _download():
            buf = io.BytesIO()
            request = self._service().files().get_media(fileId=file_id)
            downloader = MediaIoBaseDownload(buf, request, chunksize=4 * 1024 * 1024)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            return buf.getvalue()

        return self._retry(_download, "download")

    def delete_file(self, file_id: str) -> None:
        def _delete():
            self._service().files().delete(fileId=file_id).execute()

        try:
            self._retry(_delete, "delete")
        except DriveError as exc:
            if exc.status != 404:
                raise


def _to_drive_file(raw: dict[str, Any]) -> DriveFile:
    return DriveFile(
        id=raw["id"],
        name=raw.get("name", ""),
        created_time=raw.get("createdTime", ""),
        mime=raw.get("mimeType", ""),
        size=int(raw.get("size") or 0),
        app_properties=dict(raw.get("appProperties") or {}),
    )
