package main

import (
	_ "embed"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

//go:embed app.html
var page []byte

func main() {
	local := os.Getenv("LOCALAPPDATA")
	if local == "" {
		local = os.TempDir()
	}
	dir := filepath.Join(local, "Just3D")
	prof := filepath.Join(dir, "profile")
	_ = os.MkdirAll(prof, 0o755)
	html := filepath.Join(dir, "Just3D.html")
	_ = os.WriteFile(html, page, 0o644)
	url := "file:///" + filepath.ToSlash(html)
	pf, pf86 := os.Getenv("ProgramFiles"), os.Getenv("ProgramFiles(x86)")
	cands := []string{
		filepath.Join(pf86, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Microsoft\Edge\Application\msedge.exe`),
		filepath.Join(pf, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(pf86, `Google\Chrome\Application\chrome.exe`),
		filepath.Join(local, `Google\Chrome\Application\chrome.exe`),
	}
	for _, b := range cands {
		if _, err := os.Stat(b); err == nil {
			c := exec.Command(b, "--app="+url, "--user-data-dir="+prof, "--window-size=1500,900", "--no-first-run", "--disable-features=msEdgeSignIn")
			c.SysProcAttr = &syscall.SysProcAttr{HideWindow: false}
			if c.Start() == nil {
				return
			}
		}
	}
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
