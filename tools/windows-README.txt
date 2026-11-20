NOVA 3D @VER@
=============
NOVA3D-@VER@.exe is the native Windows app: its own window and taskbar icon, no browser window.
It uses the Microsoft WebView2 component built into Windows 11 and current Windows 10, and on laptops with NVIDIA/AMD plus built-in graphics
it asks Windows for the high-performance card. (If WebView2 is missing it falls back to an Edge or Chrome app window.)

Double-click NOVA3D-@VER@.exe. To open a model quickly, drag an .obj file onto the window or onto the .exe icon.
Big models (millions of faces) open and turn smoothly. Hover the "GPU: On" button in the program to see which graphics card is in use.
If it names the built-in graphics on a laptop with an NVIDIA card: Settings > System > Display > Graphics, add "msedgewebview2.exe"
(C:\Program Files (x86)\Microsoft\EdgeWebView\Application\<version>) and set it to High performance.

Desktop / Start menu / taskbar icon: right-click NOVA3D-@VER@.exe and choose "Pin to Start" or "Pin to taskbar",
or (Windows 11: Show more options >) Send to > Desktop (create shortcut). Make a new pin or shortcut after downloading a new version.

First launch: Windows may show "Windows protected your PC" because the file is not code-signed.
To clear it once: right-click the .exe > Properties > tick "Unblock" > OK.
(Or click "More info" > "Run anyway".) Unblock the .zip before extracting to avoid it on every file.

Nothing is installed. Settings are stored in %LOCALAPPDATA%\Just3D. Delete that folder and the .exe to remove everything.
Press Shift+? inside the program for the keyboard shortcut list.
