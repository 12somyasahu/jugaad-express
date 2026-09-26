@echo off
setlocal
cd /d "%~dp0"
title Jugaad Express
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.12 or newer from https://nodejs.org/
  echo Then reopen this launcher.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js with npm included, then try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing game dependencies. Internet access is needed the first time.
  call npm.cmd install
  if errorlevel 1 (
    echo Installation failed. Check the error above and your internet connection.
    pause
    exit /b 1
  )
)
echo Starting Jugaad Express. Your browser will open automatically.
echo Keep this window open while playing. Press Ctrl+C here to stop.
call npm.cmd run dev -- --open
if errorlevel 1 (
  echo The server could not start. Check the error above or README.md.
  pause
)
endlocal