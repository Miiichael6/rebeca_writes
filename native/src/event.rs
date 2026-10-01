//! Responses and events written to stderr, one JSON object per line.
//!
//! stdout is reserved for the binary PCM stream (see `pcm.rs`), so nothing
//! textual may ever be printed there.

use std::io::Write;

use serde::Serialize;

use crate::device::AudioDevice;

/// Machine-readable reason attached to every `error` event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The line was not valid JSON or not a known command.
    BadCommand,
    /// The audio host could not list its endpoints.
    EnumerationFailed,
}

/// Why a stream could not start or stopped on its own.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum StreamErrorReason {
    /// The device was not found or refused the stream.
    OpenFailed,
    /// The device was unplugged or disabled while streaming.
    DeviceLost,
    /// Any other runtime failure reported by the audio host.
    StreamFailed,
}

#[derive(Debug, Serialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum Event {
    Devices {
        devices: Vec<AudioDevice>,
    },
    Warning {
        message: String,
    },
    Error {
        code: ErrorCode,
        message: String,
    },
    /// The stream is running; its PCM blocks use this format.
    Opened {
        stream_id: u8,
        sample_rate: u32,
        channels: u16,
    },
    /// Answer to `stop`: no more blocks of this stream follow.
    Stopped {
        stream_id: u8,
    },
    StreamError {
        stream_id: u8,
        reason: StreamErrorReason,
        message: String,
    },
}

/// Writes one event as a single JSON line on stderr.
pub fn emit(event: &Event) {
    let line = serde_json::to_string(event).expect("events always serialize");
    let mut stderr = std::io::stderr().lock();
    // If main closed the pipe there is nobody left to tell, so errors are dropped.
    let _ = writeln!(stderr, "{line}");
    let _ = stderr.flush();
}

#[cfg(test)]
mod tests {
    use super::{ErrorCode, Event, StreamErrorReason};

    #[test]
    fn tags_events_with_their_type() {
        let event = Event::Error {
            code: ErrorCode::BadCommand,
            message: "nope".to_owned(),
        };
        assert_eq!(
            serde_json::to_value(&event).unwrap(),
            serde_json::json!({"type": "error", "code": "bad_command", "message": "nope"})
        );
    }

    #[test]
    fn serializes_stream_events_in_camel_case() {
        let opened = Event::Opened {
            stream_id: 1,
            sample_rate: 48_000,
            channels: 2,
        };
        assert_eq!(
            serde_json::to_value(&opened).unwrap(),
            serde_json::json!({"type": "opened", "streamId": 1, "sampleRate": 48000, "channels": 2})
        );
        let lost = Event::StreamError {
            stream_id: 1,
            reason: StreamErrorReason::DeviceLost,
            message: "gone".to_owned(),
        };
        assert_eq!(
            serde_json::to_value(&lost).unwrap(),
            serde_json::json!({"type": "stream_error", "streamId": 1, "reason": "device_lost", "message": "gone"})
        );
    }

    #[test]
    fn serializes_an_empty_device_list() {
        let event = Event::Devices { devices: vec![] };
        assert_eq!(
            serde_json::to_value(&event).unwrap(),
            serde_json::json!({"type": "devices", "devices": []})
        );
    }
}
