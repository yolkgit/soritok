@echo off
REM Nightly cutout generator for aquado (Windows Task Scheduler).
REM The soritok server CPU (2011 AMD A6, no AVX) cannot run background removal,
REM so this PC makes the cutouts and uploads them. See scripts/cutout-daily.mjs.
REM
REM Register: schtasks /Create /TN "aquado-cutout" /TR "cmd /c <this file>" /SC DAILY /ST 05:30
REM Remove:   schtasks /Delete /TN "aquado-cutout" /F
REM Run now:  schtasks /Run /TN "aquado-cutout"

setlocal
cd /d "%~dp0.."

set "LOGDIR=%CD%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "STAMP=%DATE:~0,10%"
set "STAMP=%STAMP:/=-%"
set "LOG=%LOGDIR%\cutout_%STAMP%.log"

echo ==== %DATE% %TIME% ==== >> "%LOG%"

REM Deps are NOT in package.json on purpose: the app image is Alpine and
REM sharp/onnxruntime would break that build. Install here if missing.
if not exist "node_modules\@imgly\background-removal-node" (
  echo [setup] installing cutout deps >> "%LOG%"
  call npm i --no-save --silent @imgly/background-removal-node sharp >> "%LOG%" 2>&1
)

node scripts\cutout-daily.mjs >> "%LOG%" 2>&1
echo exit=%ERRORLEVEL% >> "%LOG%"

REM keep 30 days of logs
forfiles /p "%LOGDIR%" /m cutout_*.log /d -30 /c "cmd /c del @path" >nul 2>&1
endlocal
