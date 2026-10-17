package main

import (
	"syscall"
	"time"
	"unsafe"
)

// Edge/Chrome app windows opened from a file:// page often show the browser's generic globe in the
// taskbar instead of the page icon. The exe already carries the Just3D icon (resource id 1), so the
// launcher stays alive for as long as a Just3D window exists and puts that icon on the window itself.

var (
	user32      = syscall.NewLazyDLL("user32.dll")
	kernel32    = syscall.NewLazyDLL("kernel32.dll")
	pEnumWin    = user32.NewProc("EnumWindows")
	pGetTitle   = user32.NewProc("GetWindowTextW")
	pGetClass   = user32.NewProc("GetClassNameW")
	pVisible    = user32.NewProc("IsWindowVisible")
	pSendTO     = user32.NewProc("SendMessageTimeoutW")
	pLoadImage  = user32.NewProc("LoadImageW")
	pMetric     = user32.NewProc("GetSystemMetrics")
	pModule     = kernel32.NewProc("GetModuleHandleW")
	enumCB      = syscall.NewCallback(enumProc)
	curBig      uintptr
	curSmall    uintptr
	seenThisRun int
)

const (
	wmSetIcon   = 0x0080
	wmGetIcon   = 0x007F
	iconSmall   = 0
	iconBig     = 1
	imageIcon   = 1
	smCxSmIcon  = 49
	smtoAbort   = 0x0002
	classChrome = "Chrome_WidgetWin_1"
)

func utf16s(buf []uint16, n uintptr) string {
	return syscall.UTF16ToString(buf[:n])
}

func enumProc(hwnd uintptr, _ uintptr) uintptr {
	if v, _, _ := pVisible.Call(hwnd); v == 0 {
		return 1
	}
	cls := make([]uint16, 64)
	n, _, _ := pGetClass.Call(hwnd, uintptr(unsafe.Pointer(&cls[0])), uintptr(len(cls)))
	if utf16s(cls, n) != classChrome {
		return 1
	}
	title := make([]uint16, 256)
	n, _, _ = pGetTitle.Call(hwnd, uintptr(unsafe.Pointer(&title[0])), uintptr(len(title)))
	t := utf16s(title, n)
	if !containsJust3D(t) {
		return 1
	}
	seenThisRun++
	var res uintptr
	cur, _, _ := pSendTO.Call(hwnd, wmGetIcon, iconBig, 0, smtoAbort, 200, uintptr(unsafe.Pointer(&res)))
	if cur != 0 && res == curBig {
		return 1
	}
	pSendTO.Call(hwnd, wmSetIcon, iconBig, curBig, smtoAbort, 200, uintptr(unsafe.Pointer(&res)))
	pSendTO.Call(hwnd, wmSetIcon, iconSmall, curSmall, smtoAbort, 200, uintptr(unsafe.Pointer(&res)))
	return 1
}

func containsJust3D(s string) bool {
	const k = "Just3D"
	for i := 0; i+len(k) <= len(s); i++ {
		if s[i:i+len(k)] == k {
			return true
		}
	}
	return false
}

func loadIcon(size uintptr) uintptr {
	h, _, _ := pModule.Call(0)
	ic, _, _ := pLoadImage.Call(h, 1, imageIcon, size, size, 0)
	return ic
}

// keepIcon returns once the Just3D window has been closed (or none ever appeared).
func keepIcon() {
	curBig = loadIcon(64)
	sm, _, _ := pMetric.Call(smCxSmIcon)
	if sm < 16 {
		sm = 16
	}
	curSmall = loadIcon(sm)
	if curBig == 0 || curSmall == 0 {
		return
	}
	seen, missed := false, 0
	deadline := time.Now().Add(90 * time.Second)
	for time.Now().Before(deadline) || seen {
		seenThisRun = 0
		pEnumWin.Call(enumCB, 0)
		if seenThisRun > 0 {
			seen, missed = true, 0
		} else if seen {
			missed++
			if missed >= 8 {
				return
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
}
