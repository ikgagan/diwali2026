"""Run the API locally with an in-memory fake Drive (no Google credentials needed).

    python scripts/run_with_fake_drive.py            # http://localhost:8000

Uploads are kept in RAM only and vanish when you stop the server. Handy for trying
the frontend before OAuth is set up. Passcode: "diya" and admin token: "admin".
"""

from __future__ import annotations

import sys
from pathlib import Path

import uvicorn

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings  # noqa: E402
from app.server import create_app  # noqa: E402
from tests.conftest import FakeDrive  # noqa: E402

settings = Settings(
    _env_file=None,
    google_client_id="fake", google_client_secret="fake", google_refresh_token="fake",
    drive_folder_id="fake-folder",
    drive_folder_link="https://drive.google.com/drive/folders/1wV-77g0hQcs3SFf-OZYM1sZd---WQ3LS",
    cors_origins="http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173",
    event_passcode="diya", admin_token="admin",
    gallery_rotate_minutes=20,
)
drive = FakeDrive()
drive.folder_id = "fake-folder"
app = create_app(settings=settings, drive=drive)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
