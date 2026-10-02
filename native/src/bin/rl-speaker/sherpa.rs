//! The speaker embedding extractor of sherpa-onnx, loaded at run time from
//! `sherpa-onnx-c-api.dll` (next to the exe) so the crate needs no import library.

use std::ffi::{CString, c_char, c_void};
use std::path::PathBuf;

use libloading::{Library, Symbol};

use crate::wav::SAMPLE_RATE;

const LIBRARY: &str = "sherpa-onnx-c-api.dll";

/// `SherpaOnnxSpeakerEmbeddingExtractorConfig` of the C API.
#[repr(C)]
struct Config {
    model: *const c_char,
    num_threads: i32,
    debug: i32,
    provider: *const c_char,
}

type Create = unsafe extern "C" fn(*const Config) -> *const c_void;
type Destroy = unsafe extern "C" fn(*const c_void);
type Dim = unsafe extern "C" fn(*const c_void) -> i32;
type CreateStream = unsafe extern "C" fn(*const c_void) -> *const c_void;
type AcceptWaveform = unsafe extern "C" fn(*const c_void, i32, *const f32, i32);
type InputFinished = unsafe extern "C" fn(*const c_void);
type IsReady = unsafe extern "C" fn(*const c_void, *const c_void) -> i32;
type Compute = unsafe extern "C" fn(*const c_void, *const c_void) -> *const f32;
type DestroyEmbedding = unsafe extern "C" fn(*const f32);

pub struct Extractor {
    // Kept alive for as long as the handle below is used.
    library: Library,
    handle: *const c_void,
    dim: usize,
}

impl Extractor {
    /// Loads the model; the error is a human-readable message.
    pub fn load(model: &str, threads: u32) -> Result<Self, String> {
        let path = library_path()?;
        // SAFETY: loading a DLL runs its initializers; this one is shipped with the app.
        let library = unsafe { Library::new(&path) }
            .map_err(|error| format!("{}: {error}", path.display()))?;
        let model = CString::new(model).map_err(|_| "the model path has a NUL".to_owned())?;
        let provider = CString::new("cpu").expect("no NUL");
        let config = Config {
            model: model.as_ptr(),
            num_threads: threads.max(1) as i32,
            debug: 0,
            provider: provider.as_ptr(),
        };
        // SAFETY: the symbols and signatures follow `sherpa-onnx/c-api/c-api.h`; `config` and its
        // strings outlive the call.
        let (handle, dim) = unsafe {
            let create: Symbol<Create> =
                symbol(&library, b"SherpaOnnxCreateSpeakerEmbeddingExtractor")?;
            let dim: Symbol<Dim> = symbol(&library, b"SherpaOnnxSpeakerEmbeddingExtractorDim")?;
            let handle = create(&config);
            if handle.is_null() {
                return Err("sherpa-onnx could not load the model".to_owned());
            }
            (handle, dim(handle) as usize)
        };
        Ok(Self {
            library,
            handle,
            dim,
        })
    }

    pub fn dim(&self) -> usize {
        self.dim
    }

    /// The voice print of mono 16 kHz samples.
    pub fn embed(&self, samples: &[f32]) -> Result<Vec<f32>, String> {
        if samples.is_empty() {
            return Err("no audio in that range".to_owned());
        }
        // SAFETY: same contract as `load`; every pointer comes from the C API and is released
        // before returning.
        unsafe {
            let create_stream: Symbol<CreateStream> = symbol(
                &self.library,
                b"SherpaOnnxSpeakerEmbeddingExtractorCreateStream",
            )?;
            let accept: Symbol<AcceptWaveform> =
                symbol(&self.library, b"SherpaOnnxOnlineStreamAcceptWaveform")?;
            let finished: Symbol<InputFinished> =
                symbol(&self.library, b"SherpaOnnxOnlineStreamInputFinished")?;
            let ready: Symbol<IsReady> =
                symbol(&self.library, b"SherpaOnnxSpeakerEmbeddingExtractorIsReady")?;
            let compute: Symbol<Compute> = symbol(
                &self.library,
                b"SherpaOnnxSpeakerEmbeddingExtractorComputeEmbedding",
            )?;
            let free_embedding: Symbol<DestroyEmbedding> = symbol(
                &self.library,
                b"SherpaOnnxSpeakerEmbeddingExtractorDestroyEmbedding",
            )?;
            let destroy_stream: Symbol<Destroy> =
                symbol(&self.library, b"SherpaOnnxDestroyOnlineStream")?;

            let stream = create_stream(self.handle);
            if stream.is_null() {
                return Err("sherpa-onnx could not create a stream".to_owned());
            }
            accept(
                stream,
                SAMPLE_RATE as i32,
                samples.as_ptr(),
                samples.len() as i32,
            );
            finished(stream);
            let result = if ready(self.handle, stream) == 0 {
                Err("the audio is too short to describe a voice".to_owned())
            } else {
                let vector = compute(self.handle, stream);
                if vector.is_null() {
                    Err("sherpa-onnx returned no voice print".to_owned())
                } else {
                    let copy = std::slice::from_raw_parts(vector, self.dim).to_vec();
                    free_embedding(vector);
                    Ok(copy)
                }
            };
            destroy_stream(stream);
            result
        }
    }
}

impl Drop for Extractor {
    fn drop(&mut self) {
        // SAFETY: `handle` came from the create function of this same library.
        unsafe {
            if let Ok(destroy) =
                symbol::<Destroy>(&self.library, b"SherpaOnnxDestroySpeakerEmbeddingExtractor")
            {
                destroy(self.handle);
            }
        }
    }
}

/// # Safety
/// `T` must be the real signature of the exported function `name`.
unsafe fn symbol<'a, T>(library: &'a Library, name: &[u8]) -> Result<Symbol<'a, T>, String> {
    unsafe { library.get(name) }.map_err(|error| error.to_string())
}

fn library_path() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|error| error.to_string())?;
    let dir = exe.parent().ok_or("the exe has no folder")?;
    Ok(dir.join(LIBRARY))
}
