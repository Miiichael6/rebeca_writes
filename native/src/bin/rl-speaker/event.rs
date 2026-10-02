//! Events written to stderr, one JSON object per line (stdout is unused).

use std::io::Write;

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The line is not valid JSON or `cmd` does not exist.
    BadCommand,
    /// `embed` before a successful `load`.
    NotLoaded,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Event {
    /// The model is ready; `dim` is the length of its voice prints.
    Loaded {
        dim: usize,
    },
    LoadFailed {
        message: String,
    },
    Embedding {
        id: u32,
        vector: Vec<f32>,
    },
    EmbedFailed {
        id: u32,
        message: String,
    },
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
    use super::Event;

    #[test]
    fn tags_events_with_their_type() {
        assert_eq!(
            serde_json::to_value(Event::Embedding {
                id: 3,
                vector: vec![0.5]
            })
            .unwrap(),
            serde_json::json!({"type": "embedding", "id": 3, "vector": [0.5]})
        );
        assert_eq!(
            serde_json::to_value(Event::EmbedFailed {
                id: 3,
                message: "x".to_owned()
            })
            .unwrap(),
            serde_json::json!({"type": "embed_failed", "id": 3, "message": "x"})
        );
    }
}
