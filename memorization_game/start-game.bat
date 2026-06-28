@echo off
set "SCRIPT=%~dp0start-game.ps1"
if not exist "%SCRIPT%" (
  echo start-game.ps1 が見つかりません。
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
