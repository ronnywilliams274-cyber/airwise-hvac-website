@echo off
setlocal
cd /d "%~dp0"
echo.
echo   AIRWISE HVAC - local preview server
echo   Opening http://localhost:8080  (close this window to stop)
echo.
python --version >nul 2>nul
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:8080"
  python -m http.server 8080
  goto :eof
)
where npx >nul 2>nul
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 4 >nul & start http://localhost:8080"
  npx --yes serve -l 8080 .
  goto :eof
)
echo   Python or Node.js was not found.
echo   No problem: just double-click index.html to open the site.
pause
