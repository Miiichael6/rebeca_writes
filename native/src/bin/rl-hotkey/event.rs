//! Events written to stderr, one JSON object per line (stdout is unused).

use std::io::Write;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The line was not valid JSON or not a known command.
    BadCommand,
    /// Windows refused the keyboard hook; the sidecar exits right after.
    HookFailed,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    /// Answer to `watch`.
    Watching,
    /// Answer to `off`.
    Off,
    /// The combination is now fully held.
    Down,
    /// The combination is no longer fully held.
    Up,
    /// Another key went down together with the combination (or part of it).
    Other,
    Error {
        code: ErrorCode,
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
    use super::{ErrorCode, Event};

    #[test]
    fn tags_events_with_their_type() {
        assert_eq!(
            serde_json::to_value(Event::Down).unwrap(),
            serde_json::json!({"type": "down"})
        );
        assert_eq!(
            serde_json::to_value(Event::Error {
                code: ErrorCode::HookFailed,
                message: "nope".to_owned()
            })
            .unwrap(),
            serde_json::json!({"type": "error", "code": "hook_failed", "message": "nope"})
        );
    }
}
