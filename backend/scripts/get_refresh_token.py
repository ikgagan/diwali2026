"""One-time Google Drive authorisation for the party photo site.

Run from the backend folder with the venv active:

    python scripts/get_refresh_token.py --folder-id 1wV-77g0hQcs3SFf-OZYM1sZd---WQ3LS

or, to let the script create a brand-new folder with the least-privilege scope:

    python scripts/get_refresh_token.py --create-folder "Gagan Diwali Soiree 2026"

It opens a browser, you sign in with the Google account that owns the Drive folder,
and it prints the environment variables to paste into backend/.env and into Render.

Requires backend/client_secret.json (OAuth client of type "Desktop app"), git-ignored.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

BACKEND_DIR = Path(__file__).resolve().parent.parent
FOLDER_MIME = "application/vnd.google-apps.folder"
SCOPE_FULL = "https://www.googleapis.com/auth/drive"
SCOPE_FILE = "https://www.googleapis.com/auth/drive.file"


def ensure_subfolder(service, parent_id: str, name: str) -> str:
    q = f"name = '{name}' and '{parent_id}' in parents and mimeType = '{FOLDER_MIME}' and trashed = false"
    found = service.files().list(q=q, fields="files(id)", pageSize=1).execute().get("files", [])
    if found:
        return found[0]["id"]
    created = (
        service.files()
        .create(body={"name": name, "mimeType": FOLDER_MIME, "parents": [parent_id]}, fields="id")
        .execute()
    )
    return created["id"]


def write_env(env_path: Path, values: dict[str, str]) -> None:
    """Update KEY=value lines in a .env file in place (keeps comments and other keys), appending any missing keys."""
    lines = env_path.read_text(encoding="utf-8-sig").splitlines() if env_path.exists() else []
    remaining = dict(values)
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        key = stripped.split("=", 1)[0].strip() if "=" in stripped and not stripped.startswith("#") else None
        if key in remaining:
            out.append(f"{key}={remaining.pop(key)}")
        else:
            out.append(line)
    for key, value in remaining.items():
        out.append(f"{key}={value}")
    env_path.write_text("\n".join(out) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--client-secret", default=str(BACKEND_DIR / "client_secret.json"))
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--folder-id", help="Existing Drive folder ID (uses the full 'drive' scope)")
    group.add_argument("--create-folder", metavar="NAME", help="Create a new folder (uses 'drive.file' scope)")
    parser.add_argument("--write-env", action="store_true",
                        help="Write the values straight into backend/.env instead of printing the secrets")
    args = parser.parse_args()

    secret_path = Path(args.client_secret)
    if not secret_path.exists():
        print(f"ERROR: {secret_path} not found.\n"
              "Google Cloud Console > APIs & Services > Credentials > Create credentials > "
              "OAuth client ID > Desktop app > Download JSON, save as backend/client_secret.json")
        return 1

    scope = SCOPE_FULL if args.folder_id else SCOPE_FILE
    print(f"Using scope: {scope}")
    if scope == SCOPE_FULL:
        print("  (Full Drive access is needed to write into a folder the app did not create.\n"
              "   The token only lives on your machine and on Render; guests never see it.)")

    flow = InstalledAppFlow.from_client_secrets_file(str(secret_path), scopes=[scope])
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    if not creds.refresh_token:
        print("ERROR: Google did not return a refresh token. Revoke the app at "
              "https://myaccount.google.com/permissions and run this script again.")
        return 1

    service = build("drive", "v3", credentials=creds, cache_discovery=False)
    try:
        if args.folder_id:
            folder = service.files().get(fileId=args.folder_id, fields="id,name,mimeType,webViewLink").execute()
            if folder.get("mimeType") != FOLDER_MIME:
                print("ERROR: that ID is not a folder.")
                return 1
        else:
            folder = (
                service.files()
                .create(body={"name": args.create_folder, "mimeType": FOLDER_MIME},
                        fields="id,name,webViewLink")
                .execute()
            )
        folder_id = folder["id"]
        medium_id = ensure_subfolder(service, folder_id, "medium")
        thumbs_id = ensure_subfolder(service, folder_id, "thumbs")
    except HttpError as exc:
        print(f"ERROR talking to Drive: {exc}")
        return 1

    link = folder.get("webViewLink") or f"https://drive.google.com/drive/folders/{folder_id}"
    print("\nDrive folder:", folder.get("name"), f"({folder_id})")
    print("  medium/ ->", medium_id)
    print("  thumbs/ ->", thumbs_id)
    values = {
        "GOOGLE_CLIENT_ID": creds.client_id,
        "GOOGLE_CLIENT_SECRET": creds.client_secret,
        "GOOGLE_REFRESH_TOKEN": creds.refresh_token,
        "DRIVE_FOLDER_ID": folder_id,
        "DRIVE_FOLDER_LINK": link,
    }
    if args.write_env:
        env_path = BACKEND_DIR / ".env"
        write_env(env_path, values)
        print(f"\nWritten to {env_path} (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, "
              "DRIVE_FOLDER_ID, DRIVE_FOLDER_LINK).")
        print("Restart the backend to pick them up. For Render, copy the same five lines from that file.")
    else:
        print("\nPaste these into backend/.env and into Render > Environment (keep them secret):\n")
        for key, value in values.items():
            print(f"{key}={value}")
    print("\nReminder: while the OAuth consent screen is in 'Testing', this token expires in 7 days.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
