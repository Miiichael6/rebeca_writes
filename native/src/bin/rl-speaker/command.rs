//! Commands read from stdin, one JSON object per line: `{"cmd": "embed", ...}`.

use serde::Deserialize;

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(tag = "cmd", rename_all = "lowercase")]
pub enum Command {
    /// Loads the speaker embedding model, replacing the previous one.
    Load { model: String, threads: u32 },
    /// Computes the voice print of `start..end` seconds of a 16 kHz mono 16-bit WAV file.
    #[serde(rename_all = "camelCase")]
    Embed {
        id: u32,
        wav: String,
        start: f64,
        end: f64,
    },
}

/// Parses one stdin line. The error is a human-readable message for main's log.
pub fn parse_command(line: &str) -> Result<Command, String> {
    serde_json::from_str(line).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{Command, parse_command};

    #[test]
    fn parses_load() {
        assert_eq!(
            parse_command(r#"{"cmd":"load","model":"m.onnx","threads":2}"#),
            Ok(Command::Load {
                model: "m.onnx".to_owned(),
                threads: 2
            })
        );
    }

    #[test]
    fn parses_embed() {
        assert_eq!(
            parse_command(r#"{"cmd":"embed","id":7,"wav":"a.wav","start":1.5,"end":4}"#),
            Ok(Command::Embed {
                id: 7,
                wav: "a.wav".to_owned(),
                start: 1.5,
                end: 4.0
            })
        );
    }

    #[test]
    fn rejects_unknown_commands_and_broken_json() {
        assert!(parse_command(r#"{"cmd":"dance"}"#).is_err());
        assert!(parse_command(r#"{"cmd":"embed""#).is_err());
    }
}
