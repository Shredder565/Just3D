//go:build windows

// Just3D, native Windows build: the same program (Just3D.html, embedded) shown in its own Windows window
// by the Microsoft WebView2 component that ships with Windows 10/11. No browser window, no address bar,
// its own taskbar icon, and files dropped on the exe or on the window open straight away.
package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

//go:embed app.html
var page []byte

func main() {
	runtime.LockOSThread()
	local := os.Getenv("LOCALAPPDATA")
	if local == "" {
		local = os.TempDir()
	}
	dir := filepath.Join(local, "Just3D")
	_ = os.MkdirAll(dir, 0o755)
	html := filepath.Join(dir, "Just3D.html")
	_ = os.WriteFile(html, page, 0o644)
	url := "file:///" + filepath.ToSlash(html) + openArg(dir)

	if !hasWebView2() {
		fallback(url, dir)
		return
	}
	// use the NVIDIA / AMD graphics card, not the processor's built-in graphics, on laptops that have both
	preferHighPerformanceGPU(dir)
	// drag and drop of files into the window needs OLE on this thread
	_, _, _ = windows.NewLazySystemDLL("ole32.dll").NewProc("OleInitialize").Call(0)

	user32 := windows.NewLazySystemDLL("user32.dll")
	sw, _, _ := user32.NewProc("GetSystemMetrics").Call(0)
	sh, _, _ := user32.NewProc("GetSystemMetrics").Call(1)
	w, h := uint(1700), uint(1000)
	if sw > 0 && uint(sw)*88/100 < w {
		w = uint(sw) * 88 / 100
	}
	if sh > 0 && uint(sh)*88/100 < h {
		h = uint(sh) * 88 / 100
	}

	wv := webview2.NewWithOptions(webview2.WebViewOptions{
		AutoFocus: true,
		DataPath:  filepath.Join(dir, "WebView2"),
		WindowOptions: webview2.WindowOptions{
			Title: "Just3D", Width: w, Height: h, IconId: 1, Center: true,
		},
	})
	if wv == nil {
		fallback(url, dir)
		return
	}
	defer wv.Destroy()
	// the page tells us its title (file name, unsaved mark) so the window title follows it
	_ = wv.Bind("j3dTitle", func(t string) { wv.Dispatch(func() { wv.SetTitle(t) }) })
	wv.Navigate(url)
	wv.Run()
}

// preferHighPerformanceGPU makes Windows run this program and the WebView2 renderer (msedgewebview2.exe, which does
// all the drawing) on the high-performance graphics card. It is the same switch as Settings > System > Display >
// Graphics > "High performance", written per user (no admin rights needed). The WebView2 flags are belt and braces.
func preferHighPerformanceGPU(dir string) {
	paths := []string{}
	if exe, err := os.Executable(); err == nil {
		paths = append(paths, exe)
	}
	for _, base := range []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), os.Getenv("LOCALAPPDATA")} {
		if base == "" {
			continue
		}
		m, _ := filepath.Glob(filepath.Join(base, `Microsoft\EdgeWebView\Application\*\msedgewebview2.exe`))
		paths = append(paths, m...)
	}
	if k, _, err := registry.CreateKey(registry.CURRENT_USER, `Software\Microsoft\DirectX\UserGpuPreferences`, registry.QUERY_VALUE|registry.SET_VALUE); err == nil {
		for _, p := range paths {
			if cur, _, err := k.GetStringValue(p); err == nil && strings.Contains(cur, "GpuPreference=2") {
				continue
			}
			_ = k.SetStringValue(p, "GpuPreference=2;")
		}
		k.Close()
	}
	if os.Getenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS") == "" {
		_ = os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--force_high_performance_gpu --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy")
	}
}

// hasWebView2 reports whether the Microsoft Edge WebView2 runtime is installed.
func hasWebView2() bool {
	const id = `{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`
	for _, k := range []struct {
		root registry.Key
		path string
	}{
		{registry.LOCAL_MACHINE, `SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\` + id},
		{registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\EdgeUpdate\Clients\` + id},
		{registry.CURRENT_USER, `Software\Microsoft\EdgeUpdate\Clients\` + id},
	} {
		key, err := registry.OpenKey(k.root, k.path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		v, _, err := key.GetStringValue("pv")
		key.Close()
		if err == nil && v != "" && v != "0.0.0.0" {
			return true
		}
	}
	return false
}

// fallback: no WebView2 runtime, so show the page in an Edge/Chrome app window instead (same as Just3D.exe).
func fallback(url, dir string) {
	prof := filepath.Join(dir, "profile")
	_ = os.MkdirAll(prof, 0o755)
	pf, pf86, local := os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)"), os.Getenv("LOCALAPPDATA")
	for _, b := range []string{
		filepath.Join(pf86, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(pf86, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(local, `Google\Chrome\Application\chrome.exe`),
	} {
		if _, err := os.Stat(b); err == nil {
			c := exec.Command(b, "--app="+url, "--user-data-dir="+prof, "--window-size=1500,900", "--no-first-run", "--disable-features=msEdgeSignIn", "--force_high_performance_gpu", "--ignore-gpu-blocklist")
			c.SysProcAttr = &syscall.SysProcAttr{HideWindow: false}
			if c.Start() == nil {
				return
			}
		}
	}
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}

// openArg handles a file dropped on the exe icon (or opened with it): the file is written next to the page as
// open-<time>.js and the page is told to load it with #open=<name>.
func openArg(dir string) string {
	if old, _ := filepath.Glob(filepath.Join(dir, "open-*.js")); old != nil {
		for _, f := range old {
			if st, err := os.Stat(f); err == nil && time.Since(st.ModTime()) > 10*time.Minute {
				_ = os.Remove(f)
			}
		}
	}
	if len(os.Args) < 2 {
		return ""
	}
	path := os.Args[1]
	data, err := os.ReadFile(path)
	if err != nil || len(data) == 0 {
		return ""
	}
	name, _ := json.Marshal(filepath.Base(path))
	text, _ := json.Marshal(strings.ToValidUTF8(string(data), "�"))
	js := fmt.Sprintf("window.__J3D_OPEN={name:%s,text:%s};\n", name, text)
	fn := fmt.Sprintf("open-%d.js", time.Now().UnixNano())
	if os.WriteFile(filepath.Join(dir, fn), []byte(js), 0o644) != nil {
		return ""
	}
	return "#open=" + fn
}
