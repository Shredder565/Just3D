package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
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
	url += openArg(dir)
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

// openArg handles a file dropped on the program icon (or passed on the command line, or opened
// through a file association). The page cannot read an arbitrary path itself, so the file is
// written next to the page as open-<time>.js and the page is told to load it with #open=<name>.
func openArg(dir string) string {
	// tidy up files from earlier launches (keep recent ones: another window may still be starting)
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
	text, _ := json.Marshal(strings.ToValidUTF8(string(data), "\uFFFD"))
	js := fmt.Sprintf("window.__J3D_OPEN={name:%s,text:%s};\n", name, text)
	fn := fmt.Sprintf("open-%d.js", time.Now().UnixNano())
	if os.WriteFile(filepath.Join(dir, fn), []byte(js), 0o644) != nil {
		return ""
	}
	return "#open=" + fn
}
