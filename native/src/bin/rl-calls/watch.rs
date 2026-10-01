//! Waits for changes in the microphone store with `RegNotifyChangeKeyValue`: the thread sleeps
//! until Windows writes to it, with no polling.

use std::ptr::null;

use windows_sys::Win32::Foundation::{CloseHandle, ERROR_SUCCESS, HANDLE};
use windows_sys::Win32::System::Registry::{
    HKEY, HKEY_CURRENT_USER, REG_NOTIFY_CHANGE_LAST_SET, REG_NOTIFY_CHANGE_NAME, RegCloseKey,
    RegNotifyChangeKeyValue,
};
use windows_sys::Win32::System::Threading::{CreateEventW, INFINITE, WaitForSingleObject};

use crate::registry::{MICROPHONE_KEY, open};

const TRUE: i32 = 1;
const FALSE: i32 = 0;
const WAIT_OBJECT_0: u32 = 0;

/// The opened store and the event Windows signals when anything under it changes.
pub struct MicStoreWatch {
    key: HKEY,
    changed: HANDLE,
}

impl MicStoreWatch {
    pub fn open() -> Result<Self, String> {
        let key = open(HKEY_CURRENT_USER, MICROPHONE_KEY)
            .ok_or_else(|| format!("cannot open HKCU\\{MICROPHONE_KEY}"))?;
        // SAFETY: an unnamed auto-reset event with default security.
        let changed = unsafe { CreateEventW(null(), FALSE, FALSE, null()) };
        if changed.is_null() {
            // SAFETY: the key was opened above and is not used after this.
            unsafe { RegCloseKey(key) };
            return Err(std::io::Error::last_os_error().to_string());
        }
        Ok(Self { key, changed })
    }

    pub fn key(&self) -> HKEY {
        self.key
    }

    /// Asks for one signal on the next change to the store, `NonPackaged` included. It must be
    /// called again after every `wait`, from the same thread.
    pub fn arm(&self) -> Result<(), String> {
        // SAFETY: `key` and `changed` stay open for the life of `self`.
        let status = unsafe {
            RegNotifyChangeKeyValue(
                self.key,
                TRUE,
                REG_NOTIFY_CHANGE_NAME | REG_NOTIFY_CHANGE_LAST_SET,
                self.changed,
                TRUE,
            )
        };
        if status == ERROR_SUCCESS {
            Ok(())
        } else {
            Err(format!("RegNotifyChangeKeyValue failed with {status}"))
        }
    }

    /// Sleeps until the store changes.
    pub fn wait(&self) -> Result<(), String> {
        // SAFETY: `changed` is a valid event handle.
        match unsafe { WaitForSingleObject(self.changed, INFINITE) } {
            WAIT_OBJECT_0 => Ok(()),
            _ => Err(std::io::Error::last_os_error().to_string()),
        }
    }
}

impl Drop for MicStoreWatch {
    fn drop(&mut self) {
        // SAFETY: both were opened in `open` and are not used after this.
        unsafe {
            CloseHandle(self.changed);
            RegCloseKey(self.key);
        }
    }
}
