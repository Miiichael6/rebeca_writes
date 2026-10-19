//! Whether the foreground window is full screen on the primary monitor: its rectangle covers the
//! whole monitor, taskbar included. A maximized window only covers the work area, so it does
//! not count; the desktop (which also covers the monitor) is left out by its class name.

use std::mem::size_of;

use windows_sys::Win32::Foundation::{HWND, RECT};
use windows_sys::Win32::Graphics::Gdi::{
    GetMonitorInfoW, MONITOR_DEFAULTTONULL, MONITORINFO, MonitorFromWindow,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetClassNameW, GetForegroundWindow, GetWindowRect, IsIconic, IsWindowVisible,
    MONITORINFOF_PRIMARY,
};

/// Windows of the shell that cover the screen without being a full screen app.
const SHELL_CLASSES: [&str; 3] = ["Progman", "WorkerW", "Shell_TrayWnd"];
/// Window class names are at most 256 characters.
const MAX_CLASS_NAME: usize = 257;

pub fn foreground_is_fullscreen() -> bool {
    // SAFETY: no arguments; it may return null.
    let window = unsafe { GetForegroundWindow() };
    if window.is_null() || is_shell(window) {
        return false;
    }
    // SAFETY: `window` is a window handle (it may already be gone; then these return 0).
    if unsafe { IsWindowVisible(window) == 0 || IsIconic(window) != 0 } {
        return false;
    }
    let Some(monitor) = primary_monitor_of(window) else {
        return false;
    };
    let mut rect = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    // SAFETY: `rect` is a valid out pointer.
    if unsafe { GetWindowRect(window, &mut rect) } == 0 {
        return false;
    }
    covers(&rect, &monitor)
}

/// The monitor of `window` if it is the primary one (the dock lives there).
fn primary_monitor_of(window: HWND) -> Option<RECT> {
    // SAFETY: `window` is a window handle; null means it is on no monitor.
    let monitor = unsafe { MonitorFromWindow(window, MONITOR_DEFAULTTONULL) };
    if monitor.is_null() {
        return None;
    }
    let mut info = MONITORINFO {
        cbSize: size_of::<MONITORINFO>() as u32,
        rcMonitor: RECT {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        },
        rcWork: RECT {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        },
        dwFlags: 0,
    };
    // SAFETY: `info.cbSize` says how big the out struct is.
    if unsafe { GetMonitorInfoW(monitor, &mut info) } == 0 {
        return None;
    }
    (info.dwFlags & MONITORINFOF_PRIMARY != 0).then_some(info.rcMonitor)
}

fn is_shell(window: HWND) -> bool {
    let mut buffer = [0u16; MAX_CLASS_NAME];
    // SAFETY: `buffer` holds `buffer.len()` characters.
    let length = unsafe { GetClassNameW(window, buffer.as_mut_ptr(), buffer.len() as i32) };
    if length <= 0 {
        return false;
    }
    let class = String::from_utf16_lossy(&buffer[..length as usize]);
    SHELL_CLASSES.contains(&class.as_str())
}

/// `window` reaches every edge of `monitor` (games often go a few pixels beyond).
fn covers(window: &RECT, monitor: &RECT) -> bool {
    window.left <= monitor.left
        && window.top <= monitor.top
        && window.right >= monitor.right
        && window.bottom >= monitor.bottom
}

#[cfg(test)]
mod tests {
    use super::covers;
    use windows_sys::Win32::Foundation::RECT;

    fn rect(left: i32, top: i32, right: i32, bottom: i32) -> RECT {
        RECT {
            left,
            top,
            right,
            bottom,
        }
    }

    #[test]
    fn a_window_as_big_as_the_monitor_is_full_screen() {
        let monitor = rect(0, 0, 1920, 1080);
        assert!(covers(&rect(0, 0, 1920, 1080), &monitor));
        assert!(covers(&rect(-8, -8, 1928, 1088), &monitor));
    }

    #[test]
    fn a_maximized_window_leaves_the_taskbar_out() {
        assert!(!covers(&rect(0, 0, 1920, 1032), &rect(0, 0, 1920, 1080)));
    }
}
