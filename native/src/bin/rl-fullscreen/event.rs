//! Events written to stderr, one JSON object per line (stdout is unused).

use std::io::Write;

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    /// Whether the window in front covers the whole primary monitor (a game, a video, slides).
    Fullscreen { active: bool },
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
    use super::Event;

    #[test]
    fn tags_events_with_their_type() {
        assert_eq!(
            serde_json::to_value(Event::Fullscreen { active: true }).unwrap(),
            serde_json::json!({"type": "fullscreen", "active": true})
        );
    }
}
