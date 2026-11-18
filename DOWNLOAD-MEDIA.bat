@echo off
setlocal
cd /d "%~dp0"
echo.
echo   AIRWISE HVAC - downloading Pexels photos and videos into assets\media ...
echo   (takes 1-3 minutes depending on your connection)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\download-media.ps1"
echo.
pause
