//! Per-application audio: which programs have an audio session, and loopback capture of one
//! program (and its child processes) through the Windows 11 "process loopback" API.
//!
//! Process loopback does not offer a mix format: the stream is always asked for 48 kHz stereo
//! f32 and Windows converts. Like device loopback it may deliver nothing while the app is
//! silent; main fills those gaps with silence.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use serde::Serialize;
use windows::Win32::Foundation::{CloseHandle, HANDLE, WAIT_OBJECT_0};
use windows::Win32::Media::Audio::{
    ActivateAudioInterfaceAsync, AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED,
    AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM, AUDCLNT_STREAMFLAGS_EVENTCALLBACK,
    AUDCLNT_STREAMFLAGS_LOOPBACK, AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,
    AUDIOCLIENT_ACTIVATION_PARAMS, AUDIOCLIENT_ACTIVATION_PARAMS_0,
    AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK, AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS,
    DEVICE_STATE_ACTIVE, IActivateAudioInterfaceAsyncOperation,
    IActivateAudioInterfaceCompletionHandler, IActivateAudioInterfaceCompletionHandler_Impl,
    IAudioCaptureClient, IAudioClient, IAudioSessionControl2, IAudioSessionManager2,
    IMMDeviceEnumerator, MMDeviceEnumerator, PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
    VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, WAVEFORMATEX, eRender,
};
use windows::Win32::System::Com::StructuredStorage::{PROPVARIANT, PROPVARIANT_0, PROPVARIANT_0_0};
use windows::Win32::System::Com::{
    BLOB, CLSCTX_ALL, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoUninitialize,
};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Threading::{CreateEventW, WaitForSingleObject};
use windows::Win32::System::Variant::VT_BLOB;
use windows::core::{Interface, implement};

use crate::pcm::{encode_block, write_block};

pub const SAMPLE_RATE: u32 = 48_000;
pub const CHANNELS: u16 = 2;
const ACTIVATE_TIMEOUT: Duration = Duration::from_secs(5);
const WAIT_MS: u32 = 100;

/// A program with an audio session. `exe` is what `openapp` takes; `name` is for people.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AudioApp {
    pub exe: String,
    pub name: String,
}

struct Process {
    pid: u32,
    parent: u32,
    exe: String,
}

fn processes() -> Vec<Process> {
    let mut out = Vec::new();
    // SAFETY: plain Win32 snapshot walk; the entry is initialized with its size as required.
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return out;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut more = Process32FirstW(snapshot, &mut entry).is_ok();
        while more {
            let len = entry
                .szExeFile
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(entry.szExeFile.len());
            out.push(Process {
                pid: entry.th32ProcessID,
                parent: entry.th32ParentProcessID,
                exe: String::from_utf16_lossy(&entry.szExeFile[..len]),
            });
            more = Process32NextW(snapshot, &mut entry).is_ok();
        }
        let _ = CloseHandle(snapshot);
    }
    out
}

/// `Spotify.exe` → `Spotify`; Webex plays its calls from a helper, so it gets the product name.
fn display_name(exe: &str) -> String {
    if exe.eq_ignore_ascii_case("CiscoCollabHost.exe") {
        return "Webex".to_owned();
    }
    exe.strip_suffix(".exe")
        .or_else(|| exe.strip_suffix(".EXE"))
        .unwrap_or(exe)
        .to_owned()
}

struct ComGuard;

impl ComGuard {
    fn new() -> Self {
        // SAFETY: balanced by the `CoUninitialize` in `Drop`. An already-initialized apartment
        // (S_FALSE) also needs the balancing call, so the result is ignored.
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        ComGuard
    }
}

impl Drop for ComGuard {
    fn drop(&mut self) {
        // SAFETY: pairs with the `CoInitializeEx` in `new`.
        unsafe { CoUninitialize() }
    }
}

/// The programs that have an audio session on any active output, one per executable.
pub fn list_apps() -> Result<Vec<AudioApp>, String> {
    let _com = ComGuard::new();
    let by_pid: HashMap<u32, String> = processes().into_iter().map(|p| (p.pid, p.exe)).collect();
    let mut apps: Vec<AudioApp> = Vec::new();
    // SAFETY: COM calls on interfaces we own, on a thread with COM initialized.
    unsafe {
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(|e| e.to_string())?;
        let devices = enumerator
            .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
            .map_err(|e| e.to_string())?;
        for index in 0..devices.GetCount().map_err(|e| e.to_string())? {
            let Ok(device) = devices.Item(index) else { continue };
            let Ok(manager) = device.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else {
                continue;
            };
            let Ok(sessions) = manager.GetSessionEnumerator() else { continue };
            for session in 0..sessions.GetCount().unwrap_or(0) {
                let Ok(control) = sessions.GetSession(session) else { continue };
                let Ok(control) = control.cast::<IAudioSessionControl2>() else { continue };
                if control.IsSystemSoundsSession().0 == 0 {
                    continue;
                }
                let Ok(pid) = control.GetProcessId() else { continue };
                let Some(exe) = by_pid.get(&pid) else { continue };
                if apps.iter().any(|a| a.exe.eq_ignore_ascii_case(exe)) {
                    continue;
                }
                apps.push(AudioApp {
                    exe: exe.clone(),
                    name: display_name(exe),
                });
            }
        }
    }
    apps.sort_by_key(|a| a.name.to_lowercase());
    Ok(apps)
}

/// The process to capture for `exe`: the one whose parent is not the same program (the browser's
/// main process, not each of its helpers), since the capture includes the whole process tree.
fn root_pid(exe: &str) -> Option<u32> {
    let all = processes();
    let same: Vec<&Process> = all.iter().filter(|p| p.exe.eq_ignore_ascii_case(exe)).collect();
    same.iter()
        .find(|p| !same.iter().any(|q| q.pid == p.parent))
        .or(same.first())
        .map(|p| p.pid)
}

/// Pointer-sized wrapper to move a free-threaded COM object across threads.
struct Agile<T>(T);
// SAFETY: only used for objects created in the multithreaded apartment, which are agile.
unsafe impl<T> Send for Agile<T> {}

#[implement(IActivateAudioInterfaceCompletionHandler)]
struct Completion(Mutex<Option<Sender<Agile<IActivateAudioInterfaceAsyncOperation>>>>);

impl IActivateAudioInterfaceCompletionHandler_Impl for Completion_Impl {
    fn ActivateCompleted(
        &self,
        operation: windows::core::Ref<'_, IActivateAudioInterfaceAsyncOperation>,
    ) -> windows::core::Result<()> {
        if let (Some(operation), Some(tx)) = (operation.as_ref(), self.0.lock().unwrap().take()) {
            let _ = tx.send(Agile(operation.clone()));
        }
        Ok(())
    }
}

/// A running application capture; dropping it stops it.
pub struct AppStream {
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl Drop for AppStream {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

/// Starts capturing `exe` and its child processes. Blocks until the stream is running.
pub fn open_app(stream_id: u8, exe: &str) -> Result<AppStream, String> {
    let pid = root_pid(exe).ok_or_else(|| format!("{exe} is not running"))?;
    let stop = Arc::new(AtomicBool::new(false));
    let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();
    let thread_stop = Arc::clone(&stop);
    let thread = std::thread::spawn(move || {
        let _com = ComGuard::new();
        match start(pid) {
            Ok((client, capture, event)) => {
                let _ = ready_tx.send(Ok(()));
                pump(stream_id, &client, &capture, event, &thread_stop);
                // SAFETY: the client and the event are ours and no longer used after this.
                unsafe {
                    let _ = client.Stop();
                    let _ = CloseHandle(event);
                }
            }
            Err(message) => {
                let _ = ready_tx.send(Err(message));
            }
        }
    });
    match ready_rx.recv_timeout(ACTIVATE_TIMEOUT + Duration::from_secs(1)) {
        Ok(Ok(())) => Ok(AppStream {
            stop,
            thread: Some(thread),
        }),
        Ok(Err(message)) => {
            let _ = thread.join();
            Err(message)
        }
        Err(_) => {
            stop.store(true, Ordering::SeqCst);
            Err("timed out opening the application stream".to_owned())
        }
    }
}

fn start(pid: u32) -> Result<(IAudioClient, IAudioCaptureClient, HANDLE), String> {
    let mut params = AUDIOCLIENT_ACTIVATION_PARAMS {
        ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
        Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 {
            ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
                TargetProcessId: pid,
                ProcessLoopbackMode: PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
            },
        },
    };
    // The blob points at `params` on the stack: dropping a PROPVARIANT would free it, so it is
    // never dropped.
    let variant = std::mem::ManuallyDrop::new(PROPVARIANT {
        Anonymous: PROPVARIANT_0 {
            Anonymous: std::mem::ManuallyDrop::new(PROPVARIANT_0_0 {
                vt: VT_BLOB,
                wReserved1: 0,
                wReserved2: 0,
                wReserved3: 0,
                Anonymous: windows::Win32::System::Com::StructuredStorage::PROPVARIANT_0_0_0 {
                    blob: BLOB {
                        cbSize: size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>() as u32,
                        pBlobData: (&mut params as *mut AUDIOCLIENT_ACTIVATION_PARAMS).cast(),
                    },
                },
            }),
        },
    });

    let (tx, rx) = mpsc::channel();
    let handler: IActivateAudioInterfaceCompletionHandler = Completion(Mutex::new(Some(tx))).into();
    // SAFETY: `variant` points at `params`, both alive until the activation result is read.
    let client: IAudioClient = unsafe {
        let _operation = ActivateAudioInterfaceAsync(
            VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
            &IAudioClient::IID,
            Some(&*variant),
            &handler,
        )
        .map_err(|e| e.to_string())?;
        let operation = rx
            .recv_timeout(ACTIVATE_TIMEOUT)
            .map_err(|_| "timed out activating process loopback".to_owned())?
            .0;
        let mut result = windows::core::HRESULT(0);
        let mut unknown = None;
        operation
            .GetActivateResult(&mut result, &mut unknown)
            .map_err(|e| e.to_string())?;
        result.ok().map_err(|e| e.to_string())?;
        unknown
            .ok_or_else(|| "no audio client was returned".to_owned())?
            .cast()
            .map_err(|e: windows::core::Error| e.to_string())?
    };

    let block_align = CHANNELS * 4;
    let format = WAVEFORMATEX {
        wFormatTag: 3, // WAVE_FORMAT_IEEE_FLOAT
        nChannels: CHANNELS,
        nSamplesPerSec: SAMPLE_RATE,
        nAvgBytesPerSec: SAMPLE_RATE * u32::from(block_align),
        nBlockAlign: block_align,
        wBitsPerSample: 32,
        cbSize: 0,
    };
    // SAFETY: `format` outlives the call; the event is closed by the capture thread.
    unsafe {
        client
            .Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK
                    | AUDCLNT_STREAMFLAGS_EVENTCALLBACK
                    | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM
                    | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY,
                200_000,
                0,
                &format,
                None,
            )
            .map_err(|e| e.to_string())?;
        let event = CreateEventW(None, false, false, None).map_err(|e| e.to_string())?;
        client.SetEventHandle(event).map_err(|e| e.to_string())?;
        let capture: IAudioCaptureClient = client.GetService().map_err(|e| e.to_string())?;
        client.Start().map_err(|e| e.to_string())?;
        Ok((client, capture, event))
    }
}

/// Reads packets as they arrive and writes them to stdout until asked to stop.
fn pump(
    stream_id: u8,
    _client: &IAudioClient,
    capture: &IAudioCaptureClient,
    event: HANDLE,
    stop: &AtomicBool,
) {
    let mut samples: Vec<f32> = Vec::new();
    while !stop.load(Ordering::SeqCst) {
        // SAFETY: `event` is the valid handle registered with the client.
        if unsafe { WaitForSingleObject(event, WAIT_MS) } != WAIT_OBJECT_0 {
            continue;
        }
        // SAFETY: the buffer pointer is only read between `GetBuffer` and `ReleaseBuffer`.
        unsafe {
            while capture.GetNextPacketSize().unwrap_or(0) > 0 {
                let mut data = std::ptr::null_mut();
                let mut frames = 0u32;
                let mut flags = 0u32;
                if capture
                    .GetBuffer(&mut data, &mut frames, &mut flags, None, None)
                    .is_err()
                {
                    return;
                }
                let count = frames as usize * usize::from(CHANNELS);
                samples.clear();
                if flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0 || data.is_null() {
                    samples.resize(count, 0.0);
                } else {
                    samples.extend_from_slice(std::slice::from_raw_parts(data.cast::<f32>(), count));
                }
                let _ = capture.ReleaseBuffer(frames);
                write_block(&encode_block(stream_id, CHANNELS, &samples));
            }
        }
    }
}
