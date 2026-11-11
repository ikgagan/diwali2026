@echo off
rem Starts the API with the in-memory fake Drive using the project venv (passcode: diya, admin: admin).
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  python -m venv .venv
  .venv\Scripts\python -m pip install -r requirements.txt
)
.venv\Scripts\python scripts\run_with_fake_drive.py
