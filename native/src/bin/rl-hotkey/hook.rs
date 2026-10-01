//! The low-level keyboard hook (`WH_KEYBOARD_LL`) on its own thread with a message loop.
//!
//! The hook procedure must return fast or Windows drops it, so it only updates the tracker and
//! hands events to a channel; writing them to stderr happens on another thread.

use std::ptr::null_mut;
use std::sync::Mutex;
use std::sync::OnceLock;
use std::sync::mpsc::Sender;

use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, SendInput,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, GetMessageW, HC_ACTION, KBDLLHOOKSTRUCT, LLKHF_INJECTED, MSG,
    SetWindowsHookExW, WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

use crate::combo::{ComboTracker, KeyEvent};

/// Unassigned virtual key sent before Win is released (the same trick as AutoHotkey's
/// "mask key"): Windows only opens Start when Win goes up with no other key in between.
const VK_MASK: u16 = 0xE8;

/// The combination being watched; `None` while `off`.
pub static TRACKER: Mutex<Option<ComboTracker>> = Mutex::new(None);
static EVENTS: OnceLock<Sender<KeyEvent>> = OnceLock::new();

/// Installs the hook and pumps messages forever. Returns only if Windows refuses the hook.
pub fn run(events: Sender<KeyEvent>) -> String {
    let _ = EVENTS.set(events);
    // SAFETY: plain Win32 calls; `hook_proc` matches `HOOKPROC` and lives for the whole process.
    unsafe {
        let hook = SetWindowsHookExW(
            WH_KEYBOARD_LL,
            Some(hook_proc),
            GetModuleHandleW(null_mut()),
            0,
        );
        if hook.is_null() {
            return std::io::Error::last_os_error().to_string();
        }
        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {}
    }
    "the message loop ended".to_owned()
}

unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == HC_ACTION as i32 {
        // SAFETY: for `HC_ACTION`, `lparam` points to a `KBDLLHOOKSTRUCT`.
        let info = unsafe { &*(lparam as *const KBDLLHOOKSTRUCT) };
        if info.flags & LLKHF_INJECTED == 0 && handle_key(info.vkCode as u16, wparam as u32) {
            return 1;
        }
    }
    // SAFETY: passes the event on unchanged, as every hook must.
    unsafe { CallNextHookEx(null_mut(), code, wparam, lparam) }
}

/// Feeds one real key event to the tracker. `true` drops the event.
fn handle_key(vk: u16, message: u32) -> bool {
    let down = match message {
        WM_KEYDOWN | WM_SYSKEYDOWN => true,
        WM_KEYUP | WM_SYSKEYUP => false,
        _ => return false,
    };
    let mut guard = TRACKER
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let Some(tracker) = guard.as_mut() else {
        return false;
    };
    let reaction = tracker.on_key(vk, down, is_held);
    drop(guard);

    if let Some(events) = EVENTS.get() {
        for event in reaction.events {
            let _ = events.send(event);
        }
    }
    if reaction.mask_win_up {
        replay_win_up_masked(vk);
        return true;
    }
    reaction.swallow
}

fn is_held(vk: u16) -> bool {
    // SAFETY: no pointers involved; the high bit means "down right now".
    (unsafe { GetAsyncKeyState(i32::from(vk)) } as u16) & 0x8000 != 0
}

/// Mask key down and up, then the Win key-up that was dropped. Injected, so the hook skips them.
fn replay_win_up_masked(win: u16) {
    let inputs = [
        key_input(VK_MASK, false),
        key_input(VK_MASK, true),
        key_input(win, true),
    ];
    // SAFETY: `inputs` is a valid array of keyboard `INPUT`s for the duration of the call.
    unsafe {
        SendInput(
            inputs.len() as u32,
            inputs.as_ptr(),
            std::mem::size_of::<INPUT>() as i32,
        );
    }
}

fn key_input(vk: u16, up: bool) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk,
                wScan: 0,
                dwFlags: if up { KEYEVENTF_KEYUP } else { 0 },
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}
