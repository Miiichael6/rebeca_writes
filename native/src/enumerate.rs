//! Lists the endpoints usable right now through cpal (WASAPI on Windows).
//!
//! cpal only enumerates active endpoints, so unplugged or disabled ones never
//! show up: that is the intended behaviour.

use cpal::traits::{DeviceTrait, HostTrait};
use cpal::{Device, DeviceId, Host, SupportedStreamConfig};

use crate::device::{AudioDevice, DeviceKind};
use crate::endpoint_name::parse_endpoint_name;

/// Every usable device, outputs first, plus a message per endpoint that had to
/// be skipped because it could not be described.
pub struct Enumeration {
    pub devices: Vec<AudioDevice>,
    pub skipped: Vec<String>,
}

pub fn list_devices() -> Result<Enumeration, cpal::Error> {
    let host = cpal::default_host();
    let mut enumeration = Enumeration {
        devices: Vec::new(),
        skipped: Vec::new(),
    };
    for kind in [DeviceKind::Render, DeviceKind::Capture] {
        let default_id = default_device(&host, kind).and_then(|device| device.id().ok());
        for device in devices_of_kind(&host, kind)? {
            match describe(&device, kind, default_id.as_ref()) {
                Ok(described) => enumeration.devices.push(described),
                Err(error) => enumeration
                    .skipped
                    .push(format!("skipped a {kind:?} endpoint: {error}")),
            }
        }
    }
    Ok(enumeration)
}

fn devices_of_kind(host: &Host, kind: DeviceKind) -> Result<Vec<Device>, cpal::Error> {
    Ok(match kind {
        DeviceKind::Render => host.output_devices()?.collect(),
        DeviceKind::Capture => host.input_devices()?.collect(),
    })
}

fn default_device(host: &Host, kind: DeviceKind) -> Option<Device> {
    match kind {
        DeviceKind::Render => host.default_output_device(),
        DeviceKind::Capture => host.default_input_device(),
    }
}

fn default_config(device: &Device, kind: DeviceKind) -> Result<SupportedStreamConfig, cpal::Error> {
    match kind {
        DeviceKind::Render => device.default_output_config(),
        DeviceKind::Capture => device.default_input_config(),
    }
}

fn describe(
    device: &Device,
    kind: DeviceKind,
    default_id: Option<&DeviceId>,
) -> Result<AudioDevice, cpal::Error> {
    let id = device.id()?;
    let description = device.description()?;
    let config = default_config(device, kind)?;
    let (name, group_name) = parse_endpoint_name(description.name());
    Ok(AudioDevice {
        is_default: default_id == Some(&id),
        id: id.to_string(),
        name,
        group_name,
        kind,
        channels: config.channels(),
        sample_rate: config.sample_rate(),
    })
}
