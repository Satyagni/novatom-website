@echo off
REM Double-click this to build and open the NovAtom Labs website.
REM The site must be served over http (it cannot run by opening index.html from disk).
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install --no-audit --no-fund
)

echo Building...
call node node_modules\vite\bin\vite.js build
if errorlevel 1 (
  echo Build failed. See the messages above.
  pause
  exit /b 1
)

echo Stopping any older copy of the server...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue ^| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo Starting the local server on http://127.0.0.1:4173 ...
start "NovAtom website server (close this window to stop)" /min cmd /c "node node_modules\vite\bin\vite.js preview --port 4173 --host 127.0.0.1 --strictPort"
timeout /t 3 >nul
start "" "http://127.0.0.1:4173/"
echo.
echo The website is open in your browser at http://127.0.0.1:4173/
echo Close the minimized "NovAtom website server" window to stop it.
timeout /t 6 >nul
