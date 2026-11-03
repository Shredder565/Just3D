@echo off
rem One-time setup for the TripoSR service. Needs Python 3.9, 3.10 or 3.11 from python.org (tick "Add to PATH").
rem Git is NOT needed: TripoSR is downloaded as a zip. About 3-5 GB of disk with the GPU build of PyTorch.
setlocal
cd /d "%~dp0"

rem ---- 1. a Python of the right version
set PY=
for %%V in (3.11 3.10 3.9) do if not defined PY (py -%%V -c "print(1)" >nul 2>&1 && set "PY=py -%%V")
if not defined PY (python -c "import sys; sys.exit(0 if (3,9)<=sys.version_info[:2]<=(3,11) else 1)" >nul 2>&1 && set "PY=python")
if not defined PY (
  echo No Python 3.9, 3.10 or 3.11 found. Install Python 3.11 from https://www.python.org/downloads/ and run this again.
  echo Newer Pythons ^(3.12, 3.13^) do not have all the packages TripoSR needs.
  goto :err
)
echo Using %PY%
if not exist venv\Scripts\python.exe (%PY% -m venv venv || goto :err)
call venv\Scripts\activate.bat
python -m pip install --upgrade pip setuptools wheel || goto :err

rem ---- 2. PyTorch: the CUDA build when an NVIDIA card is present, otherwise the CPU build
where nvidia-smi >nul 2>&1
if %errorlevel%==0 (
  echo NVIDIA graphics card found: installing PyTorch with CUDA 12.1.
  pip install torch --index-url https://download.pytorch.org/whl/cu121 || goto :err
) else (
  echo No NVIDIA card found: installing the CPU build of PyTorch. It works, but each model takes a few minutes.
  pip install torch --index-url https://download.pytorch.org/whl/cpu || goto :err
)

rem ---- 3. TripoSR itself, as a zip so git is not needed
if not exist TripoSR\tsr (
  echo Downloading TripoSR...
  powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest https://github.com/VAST-AI-Research/TripoSR/archive/refs/heads/main.zip -OutFile TripoSR.zip; Expand-Archive TripoSR.zip -DestinationPath . -Force; if (Test-Path TripoSR) {Remove-Item TripoSR -Recurse -Force}; Rename-Item TripoSR-main TripoSR; Remove-Item TripoSR.zip" || goto :err
)
if not exist TripoSR\tsr (
  echo Could not unpack TripoSR.
  goto :err
)

rem ---- 4. the rest; no C++ compiler needed because torchmcubes is replaced by scikit-image
pip install -r requirements_triposr.txt || goto :err
echo.
echo Optional: background removal for pictures that are not cut out ^(Just3D AI always sends cut-outs^).
pip install "rembg[cpu]" || echo rembg could not be installed. That is fine for Just3D AI.

echo.
python just3d_ai_server_triposr.py --check
if errorlevel 1 goto :err
echo.
echo Setup finished. Start the service with start_triposr.bat, then in Just3D AI set the endpoint to http://127.0.0.1:8787/generate
echo The first picture downloads the TripoSR weights ^(about 1.7 GB from huggingface.co^) and takes longer.
pause
exit /b 0
:err
echo.
echo Something failed. Read the message above. You can run setup_triposr.bat again; finished steps are skipped.
pause
exit /b 1
