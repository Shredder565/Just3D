NOVA 3D @VER@
=============
This download has two versions of the same program. Use either one:

  NOVA3D-@VER@-native.exe   Native Windows app (recommended). Its own window and taskbar icon, no browser window.
                           Uses the Microsoft WebView2 component built into Windows 11 and current Windows 10.
                           On laptops with NVIDIA/AMD plus built-in graphics it asks Windows for the high-performance card.
                           (If WebView2 is missing it falls back to an Edge or Chrome app window.)
  NOVA3D-@VER@.exe          Original: opens NOVA 3D in an Edge (or Chrome) app window.

Double-click either .exe. To open a model quickly, drag an .obj file onto the window or onto the .exe icon.
Big models (millions of faces) open and turn smoothly. Hover the "GPU: On" button in the program to see which graphics card is in use.
If it names the built-in graphics on a laptop with an NVIDIA card: Settings > System > Display > Graphics, add "msedgewebview2.exe"
(C:\Program Files (x86)\Microsoft\EdgeWebView\Application\<version>) and set it to High performance.

Desktop / Start menu / Quick Launch icon: double-click Create-NOVA3D-shortcuts.cmd. It makes a "NOVA 3D" shortcut in each of those places,
pointing at the native .exe in this folder and using the current icon (NOVA3D.ico is the same picture). Run it again after moving the folder
or downloading a new version. A shortcut or taskbar pin made from an older version keeps the older picture: delete it and make a new one.

First launch: Windows may show "Windows protected your PC" because the files are not code-signed.
To clear it once: right-click each .exe > Properties > tick "Unblock" > OK.
(Or click "More info" > "Run anyway".) Unblock the .zip before extracting to avoid it on every file.

Nothing is installed. Settings are stored in %LOCALAPPDATA%\Just3D. Delete that folder and the .exe files to remove everything.
Press Shift+? inside the program for the keyboard shortcut list.
