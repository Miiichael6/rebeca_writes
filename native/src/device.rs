//! The device record sent to main, mirroring `AudioDevice` in
//! `src/shared/types.ts`: field names must stay in sync with it.

use serde::{Deserialize, Serialize};

/// `render` endpoints are captured in loopback; `capture` ones are microphones.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceKind {
    Render,
    Capture,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    /// Stable WASAPI endpoint id as printed by cpal (`wasapi:{...}.{...}`).
    pub id: String,
    pub name: String,
    pub group_name: String,
    pub kind: DeviceKind,
    pub is_default: bool,
    pub channels: u16,
    pub sample_rate: u32,
}

#[cfg(test)]
mod tests {
    use super::{AudioDevice, DeviceKind};

    #[test]
    fn serializes_with_the_field_names_of_the_typescript_type() {
        let device = AudioDevice {
            id: "wasapi:abc".to_owned(),
            name: "Altavoces".to_owned(),
            group_name: "Realtek(R) Audio".to_owned(),
            kind: DeviceKind::Render,
            is_default: true,
            channels: 2,
            sample_rate: 48_000,
        };
        let json = serde_json::to_value(&device).unwrap();
        assert_eq!(
            json,
            serde_json::json!({
                "id": "wasapi:abc",
                "name": "Altavoces",
                "groupName": "Realtek(R) Audio",
                "kind": "render",
                "isDefault": true,
                "channels": 2,
                "sampleRate": 48000
            })
        );
    }

    #[test]
    fn serializes_the_capture_kind_in_lowercase() {
        assert_eq!(
            serde_json::to_value(DeviceKind::Capture).unwrap(),
            "capture"
        );
    }
}
