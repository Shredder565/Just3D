Just3D @VER@ - native Windows app
=================================
Double-click Just3D-@VER@-native.exe. Just3D opens in its own window with its own taskbar icon (no browser window, no address bar).
It is the same program as the regular download, built into a Windows application.

- Needs the Microsoft WebView2 runtime, which is already part of Windows 11 and up-to-date Windows 10. If it is missing, Just3D falls back to an Edge or Chrome app window.
- Graphics card: on a laptop with both NVIDIA (or AMD) and built-in graphics, Just3D asks Windows to use the high-performance card (it sets the same per-app "High performance" switch as Settings > System > Display > Graphics, for Just3D and the WebView2 renderer, for your user only). Hover the "GPU: On" button in the program to see which card is in use. If it still shows the built-in graphics, open Settings > System > Display > Graphics, add "msedgewebview2.exe" (C:\Program Files (x86)\Microsoft\EdgeWebView\Application\<version>) and set it to High performance.
- Open a file: drag an .obj file onto the window or onto the .exe icon.
- Big models: files with millions of faces open and turn smoothly.

First launch: Windows may show "Windows protected your PC" because the file is not code-signed.
To clear it once: right-click the .exe > Properties > tick "Unblock" > OK. (Or click "More info" > "Run anyway".)

Nothing is installed. Settings are stored in %LOCALAPPDATA%\Just3D. Delete that folder and the .exe to remove everything.
Press Shift+? inside the program for the keyboard shortcut list.
