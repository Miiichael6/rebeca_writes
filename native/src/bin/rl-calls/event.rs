//! Events written to stderr, one JSON object per line (stdout is unused).

use std::io::Write;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The microphone store could not be opened or watched; the sidecar exits right after.
    WatchFailed,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    /// The apps using the microphone right now, by registry key name: the package family name
    /// for packaged apps, the exe path with `#` for `\` for the rest.
    MicUsers { apps: Vec<String> },
    Error { code: ErrorCode, message: String },
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
            serde_json::to_value(Event::MicUsers {
                apps: vec!["MSTeams_8wekyb3d8bbwe".to_owned()]
            })
            .unwrap(),
            serde_json::json!({"type": "mic_users", "apps": ["MSTeams_8wekyb3d8bbwe"]})
        );
        assert_eq!(
            serde_json::to_value(Event::Error {
                code: ErrorCode::WatchFailed,
                message: "nope".to_owned()
            })
            .unwrap(),
            serde_json::json!({"type": "error", "code": "watch_failed", "message": "nope"})
        );
    }
}
