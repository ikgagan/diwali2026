@echo off
rem Starts the Vite dev server using the user-level Node install (no PATH change needed).
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev
