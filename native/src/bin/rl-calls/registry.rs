//! Reads the microphone privacy store of Windows. Every app that ever asked for the microphone
//! has a key under `ConsentStore\microphone` (packaged apps directly, the rest under
//! `NonPackaged`); while an app holds the microphone its `LastUsedTimeStop` is 0.

use std::ptr::null_mut;

use windows_sys::Win32::Foundation::{ERROR_NO_MORE_ITEMS, ERROR_SUCCESS};
use windows_sys::Win32::System::Registry::{
    HKEY, KEY_READ, RRF_RT_REG_QWORD, RegCloseKey, RegEnumKeyExW, RegGetValueW, RegOpenKeyExW,
};

pub const MICROPHONE_KEY: &str =
    r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone";
const NON_PACKAGED: &str = "NonPackaged";
const LAST_USED_STOP: &str = "LastUsedTimeStop";
/// Registry key names are at most 255 characters.
const MAX_KEY_NAME: usize = 256;

/// UTF-16 with the terminating zero, as Win32 wants it.
pub fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain(Some(0)).collect()
}

/// Key names of the apps holding the microphone, sorted, once each. A key that cannot be read
/// counts as not in use.
pub fn apps_using_microphone(store: HKEY) -> Vec<String> {
    let mut apps = Vec::new();
    for name in subkeys(store) {
        if name == NON_PACKAGED {
            if let Some(non_packaged) = open(store, NON_PACKAGED) {
                apps.extend(in_use(non_packaged));
                // SAFETY: the key was opened above and is not used after this.
                unsafe { RegCloseKey(non_packaged) };
            }
        } else if is_in_use(store, &name) {
            apps.push(name);
        }
    }
    apps.sort();
    apps.dedup();
    apps
}

fn in_use(parent: HKEY) -> Vec<String> {
    subkeys(parent)
        .into_iter()
        .filter(|name| is_in_use(parent, name))
        .collect()
}

/// Opens `path` under `parent` for reading (and watching).
pub fn open(parent: HKEY, path: &str) -> Option<HKEY> {
    let mut key: HKEY = null_mut();
    // SAFETY: `path` is zero-terminated and `key` is a valid out pointer.
    let status = unsafe { RegOpenKeyExW(parent, wide(path).as_ptr(), 0, KEY_READ, &mut key) };
    (status == ERROR_SUCCESS).then_some(key)
}

fn subkeys(key: HKEY) -> Vec<String> {
    let mut names = Vec::new();
    let mut buffer = [0u16; MAX_KEY_NAME];
    for index in 0.. {
        let mut length = buffer.len() as u32;
        // SAFETY: `buffer` holds `length` characters; the optional out pointers are null.
        let status = unsafe {
            RegEnumKeyExW(
                key,
                index,
                buffer.as_mut_ptr(),
                &mut length,
                null_mut(),
                null_mut(),
                null_mut(),
                null_mut(),
            )
        };
        if status == ERROR_NO_MORE_ITEMS {
            break;
        }
        if status == ERROR_SUCCESS {
            names.push(String::from_utf16_lossy(&buffer[..length as usize]));
        }
    }
    names
}

/// `LastUsedTimeStop` of `parent\name` is 0. Apps that never used it have no value at all.
fn is_in_use(parent: HKEY, name: &str) -> bool {
    let mut stop: u64 = u64::MAX;
    let mut size = std::mem::size_of::<u64>() as u32;
    // SAFETY: `stop` has room for the `size` bytes of a QWORD; the names are zero-terminated.
    let status = unsafe {
        RegGetValueW(
            parent,
            wide(name).as_ptr(),
            wide(LAST_USED_STOP).as_ptr(),
            RRF_RT_REG_QWORD,
            null_mut(),
            (&mut stop as *mut u64).cast(),
            &mut size,
        )
    };
    status == ERROR_SUCCESS && stop == 0
}

#[cfg(test)]
mod tests {
    use super::wide;

    #[test]
    fn wide_strings_end_in_zero() {
        assert_eq!(wide("ab"), vec![u16::from(b'a'), u16::from(b'b'), 0]);
    }
}
