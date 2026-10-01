//! Commands read from stdin, one JSON object per line: `{"cmd": "off"}`.

use serde::Deserialize;

use crate::combo::Combo;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "cmd", rename_all = "lowercase")]
pub enum Command {
    /// Starts watching this combination, replacing the previous one.
    Watch(Combo),
    /// Stops watching: no more key events until the next `watch`.
    Off,
}

/// Parses one stdin line. The error is a human-readable message for main's log.
pub fn parse_command(line: &str) -> Result<Command, String> {
    serde_json::from_str(line).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{Command, parse_command};
    use crate::combo::{Combo, Modifier};

    #[test]
    fn parses_watch_with_only_modifiers() {
        assert_eq!(
            parse_command(r#"{"cmd":"watch","modifiers":["ctrl","win"],"key":null}"#),
            Ok(Command::Watch(Combo {
                modifiers: vec![Modifier::Ctrl, Modifier::Win],
                key: None
            }))
        );
    }

    #[test]
    fn parses_watch_with_a_key() {
        assert_eq!(
            parse_command(r#"{"cmd":"watch","modifiers":["alt"],"key":82}"#),
            Ok(Command::Watch(Combo {
                modifiers: vec![Modifier::Alt],
                key: Some(82)
            }))
        );
    }

    #[test]
    fn parses_off() {
        assert_eq!(parse_command(r#"{"cmd":"off"}"#), Ok(Command::Off));
    }

    #[test]
    fn rejects_an_unknown_modifier() {
        assert!(parse_command(r#"{"cmd":"watch","modifiers":["hyper"],"key":null}"#).is_err());
    }

    #[test]
    fn rejects_broken_json() {
        assert!(parse_command(r#"{"cmd":"off""#).is_err());
    }
}
