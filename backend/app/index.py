"""In-memory photo index, Drive rebuild, and the deterministic gallery rotation."""

from __future__ import annotations

import logging
import math
import random
import threading
from collections import OrderedDict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import PurePosixPath

from .drive import DriveClient, DriveFile

log = logging.getLogger("diwali.index")


@dataclass(frozen=True)
class Photo:
    id: str
    original_file_id: str
    medium_file_id: str
    thumb_file_id: str
    created_time: str  # ISO-8601 from Drive
    original_name: str = ""

    def to_public(self) -> dict:
        return {"id": self.id, "created_time": self.created_time}


def select_rotation(
    ids: list[str], now_epoch: float, rotate_seconds: int, page_size: int
) -> tuple[list[str], int]:
    """Pick the set of ids visible in the current time window.

    Every client calling at the same time gets the same answer. The photo list is
    shuffled once per full cycle (seeded by the cycle number) and then paged through,
    so every photo is shown before any repeats.
    """
    window = int(now_epoch // rotate_seconds)
    ends_at = (window + 1) * rotate_seconds
    n = len(ids)
    if n <= page_size:
        return list(ids), ends_at
    pages = math.ceil(n / page_size)
    cycle, page = divmod(window, pages)
    order = list(ids)
    random.Random(f"diwali-{cycle}").shuffle(order)
    return order[page * page_size : (page + 1) * page_size], ends_at


class ByteCache:
    """Tiny LRU byte cache so popular thumbnails do not hit Drive on every request."""

    def __init__(self, max_bytes: int = 64 * 1024 * 1024):
        self._max = max_bytes
        self._size = 0
        self._data: OrderedDict[str, bytes] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> bytes | None:
        with self._lock:
            value = self._data.get(key)
            if value is not None:
                self._data.move_to_end(key)
            return value

    def put(self, key: str, value: bytes) -> None:
        if len(value) > self._max // 4:
            return
        with self._lock:
            if key in self._data:
                self._size -= len(self._data.pop(key))
            self._data[key] = value
            self._size += len(value)
            while self._size > self._max and self._data:
                _, evicted = self._data.popitem(last=False)
                self._size -= len(evicted)

    def drop(self, *keys: str) -> None:
        with self._lock:
            for key in keys:
                value = self._data.pop(key, None)
                if value is not None:
                    self._size -= len(value)


class PhotoIndex:
    def __init__(self, drive: DriveClient | None):
        self._drive = drive
        self._photos: dict[str, Photo] = {}
        self._lock = threading.Lock()
        self.last_rebuild: datetime | None = None
        self.last_error: str | None = None

    # ----- queries --------------------------------------------------------
    def get(self, photo_id: str) -> Photo | None:
        with self._lock:
            return self._photos.get(photo_id)

    def all_sorted(self) -> list[Photo]:
        with self._lock:
            photos = list(self._photos.values())
        return sorted(photos, key=lambda p: (p.created_time, p.id))

    def count(self) -> int:
        with self._lock:
            return len(self._photos)

    def current_set(self, now_epoch: float, rotate_seconds: int, page_size: int):
        photos = self.all_sorted()
        by_id = {p.id: p for p in photos}
        ids, ends_at = select_rotation([p.id for p in photos], now_epoch, rotate_seconds, page_size)
        return [by_id[i] for i in ids], ends_at, len(photos)

    # ----- mutations ------------------------------------------------------
    def add(self, photo: Photo) -> None:
        with self._lock:
            self._photos[photo.id] = photo

    def remove(self, photo_id: str) -> Photo | None:
        with self._lock:
            return self._photos.pop(photo_id, None)

    # ----- Drive rebuild (blocking; run in a threadpool) -------------------
    def rebuild(self) -> int:
        if self._drive is None:
            return 0
        try:
            folders = self._drive.ensure_subfolders()
            originals = self._drive.list_folder(self._drive.folder_id)
            mediums = _by_stem(self._drive.list_folder(folders["medium"]))
            thumbs = _by_stem(self._drive.list_folder(folders["thumbs"]))
        except Exception as exc:  # noqa: BLE001 - keep serving the old index
            self.last_error = str(exc)
            log.warning("Index rebuild failed: %s", exc)
            raise

        photos: dict[str, Photo] = {}
        for original in originals:
            stem = _photo_id_of(original)
            medium = mediums.get(stem)
            thumb = thumbs.get(stem)
            if not stem or medium is None or thumb is None:
                continue  # incomplete upload or a stray file someone dropped in the folder
            photos[stem] = Photo(
                id=stem,
                original_file_id=original.id,
                medium_file_id=medium.id,
                thumb_file_id=thumb.id,
                created_time=original.created_time,
                original_name=original.app_properties.get("original_name", original.name),
            )
        with self._lock:
            # Keep photos added since the listing started (uploads that raced the rebuild).
            for pid, photo in self._photos.items():
                if pid not in photos and photo.created_time > _now_iso_minus(120):
                    photos[pid] = photo
            self._photos = photos
        self.last_rebuild = datetime.now(timezone.utc)
        self.last_error = None
        log.info("Index rebuilt: %d photos", len(photos))
        return len(photos)

    def snapshot(self) -> list[dict]:
        return [asdict(p) for p in self.all_sorted()]


def _photo_id_of(file: DriveFile) -> str:
    return file.app_properties.get("photo_id") or PurePosixPath(file.name).stem


def _by_stem(files: list[DriveFile]) -> dict[str, DriveFile]:
    return {_photo_id_of(f): f for f in files}


def _now_iso_minus(seconds: int) -> str:
    from datetime import timedelta

    return (datetime.now(timezone.utc) - timedelta(seconds=seconds)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
