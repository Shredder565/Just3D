@echo off
rem Starts the TripoSR service for Just3D AI on http://127.0.0.1:8787/generate  (run setup_triposr.bat once first)
rem Extra options can be added after the name, e.g.  start_triposr.bat --device cpu   or   --mc-resolution 192
cd /d "%~dp0"
if not exist venv\Scripts\activate.bat (
  echo Run setup_triposr.bat first.
  pause
  exit /b 1
)
call venv\Scripts\activate.bat
echo Leave this window open while you use Just3D AI. Close it to stop the service.
python just3d_ai_server_triposr.py --async %*
pause
