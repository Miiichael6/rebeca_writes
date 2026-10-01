//! Commands read from stdin, one JSON object per line: `{"cmd": "list"}`.

use serde::Deserialize;

use crate::device::DeviceKind;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "cmd", rename_all = "lowercase", rename_all_fields = "camelCase")]
pub enum Command {
    List,
    /// Opens a device and starts streaming its PCM on stdout right away.
    Open {
        stream_id: u8,
        device_id: String,
        /// `render` is captured in loopback, `capture` as a normal input.
        kind: DeviceKind,
    },
    Stop {
        stream_id: u8,
    },
}

/// Parses one stdin line. The error is a human-readable message for main's log.
pub fn parse_command(line: &str) -> Result<Command, String> {
    serde_json::from_str(line).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{Command, parse_command};
    use crate::device::DeviceKind;

    #[test]
    fn parses_a_valid_command() {
        assert_eq!(parse_command(r#"{"cmd":"list"}"#), Ok(Command::List));
    }

    #[test]
    fn parses_open_with_camel_case_fields() {
        let line = r#"{"cmd":"open","streamId":1,"deviceId":"wasapi:abc","kind":"render"}"#;
        assert_eq!(
            parse_command(line),
            Ok(Command::Open {
                stream_id: 1,
                device_id: "wasapi:abc".to_owned(),
                kind: DeviceKind::Render
            })
        );
    }

    #[test]
    fn ignores_extra_fields() {
        let line = r#"{"cmd":"stop","streamId":2,"extra":true}"#;
        assert_eq!(parse_command(line), Ok(Command::Stop { stream_id: 2 }));
    }

    #[test]
    fn rejects_open_without_a_device() {
        assert!(parse_command(r#"{"cmd":"open","streamId":1,"kind":"render"}"#).is_err());
    }

    #[test]
    fn rejects_broken_json() {
        assert!(parse_command(r#"{"cmd":"list""#).is_err());
    }

    #[test]
    fn rejects_an_unknown_command() {
        let error = parse_command(r#"{"cmd":"explode"}"#).unwrap_err();
        assert!(error.contains("unknown variant"), "{error}");
    }

    #[test]
    fn rejects_a_line_without_cmd() {
        assert!(parse_command(r#"{"list":true}"#).is_err());
    }
}
