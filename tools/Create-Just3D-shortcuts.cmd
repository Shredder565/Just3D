@echo off
rem Puts the Just3D icon (the lighter-clothed lady) on your Desktop, in the Start menu and in Quick Launch.
rem Run it by double-clicking. It points the shortcuts at the .exe in this folder, so run it again after you move the folder or download a new version.
setlocal
set "HERE=%~dp0"
set "EXE="
for %%F in ("%HERE%Just3D-*-native.exe") do set "EXE=%%~fF"
if not defined EXE for %%F in ("%HERE%Just3D-*.exe") do set "EXE=%%~fF"
if not defined EXE (
  echo No Just3D .exe was found next to this file.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$e=$env:EXE; $w=New-Object -ComObject WScript.Shell; $dirs=@([Environment]::GetFolderPath('Desktop'),(Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),(Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch')); foreach($d in $dirs){ if(Test-Path $d){ $s=$w.CreateShortcut((Join-Path $d 'Just3D.lnk')); $s.TargetPath=$e; $s.WorkingDirectory=(Split-Path $e); $s.IconLocation=($e+',0'); $s.Description='Just3D'; $s.Save(); Write-Host ('Shortcut made in '+$d) } }"
rem ask Windows to redraw cached icons so the new picture shows right away
ie4uinit.exe -show >nul 2>&1
echo.
echo Done. Pinned taskbar icons from an older version keep their old picture: unpin them, then pin the new window again.
pause
