//! Opening a device and streaming its samples to stdout as f32.
//!
//! A `render` endpoint opened as input is captured in WASAPI loopback by cpal.
//! Loopback delivers nothing while no sound is playing: main fills those gaps
//! with silence, since only it knows the wall clock of the recording.

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{
    Device, DeviceId, ErrorKind, FromSample, Sample, SampleFormat, SizedSample, Stream,
    StreamConfig,
};

use crate::device::DeviceKind;
use crate::event::{Event, StreamErrorReason, emit};
use crate::pcm::{encode_block, write_block};

/// A running stream and the format of its blocks.
pub struct OpenStream {
    pub stream: Stream,
    pub sample_rate: u32,
    pub channels: u16,
}

pub fn open(stream_id: u8, device_id: &str, kind: DeviceKind) -> Result<OpenStream, String> {
    let device = find_device(device_id)?;
    let supported = match kind {
        DeviceKind::Render => device.default_output_config(),
        DeviceKind::Capture => device.default_input_config(),
    }
    .map_err(|error| error.to_string())?;

    let config: StreamConfig = supported.config();
    let channels = config.channels;
    let sample_rate = config.sample_rate;
    let stream = match supported.sample_format() {
        SampleFormat::F32 => build::<f32>(&device, &config, stream_id),
        SampleFormat::I16 => build::<i16>(&device, &config, stream_id),
        SampleFormat::I32 => build::<i32>(&device, &config, stream_id),
        SampleFormat::U8 => build::<u8>(&device, &config, stream_id),
        other => return Err(format!("unsupported sample format {other}")),
    }?;
    stream.play().map_err(|error| error.to_string())?;
    Ok(OpenStream {
        stream,
        sample_rate,
        channels,
    })
}

fn find_device(device_id: &str) -> Result<Device, String> {
    let id: DeviceId = device_id
        .parse()
        .map_err(|_| format!("invalid device id {device_id}"))?;
    cpal::default_host()
        .device_by_id(&id)
        .ok_or_else(|| format!("device not found: {device_id}"))
}

fn build<T>(device: &Device, config: &StreamConfig, stream_id: u8) -> Result<Stream, String>
where
    T: SizedSample,
    f32: FromSample<T>,
{
    let channels = config.channels;
    let mut samples: Vec<f32> = Vec::new();
    device
        .build_input_stream::<T, _, _>(
            *config,
            move |data: &[T], _| {
                samples.clear();
                samples.extend(data.iter().map(|&sample| f32::from_sample(sample)));
                write_block(&encode_block(stream_id, channels, &samples));
            },
            move |error| {
                let reason = match error.kind() {
                    // Glitches the stream survives: loopback reports an xrun on
                    // every discontinuity, e.g. when playback starts or stops.
                    ErrorKind::Xrun | ErrorKind::DeviceChanged | ErrorKind::RealtimeDenied => {
                        emit(&Event::Warning {
                            message: format!("stream {stream_id}: {error}"),
                        });
                        return;
                    }
                    ErrorKind::DeviceNotAvailable => StreamErrorReason::DeviceLost,
                    _ => StreamErrorReason::StreamFailed,
                };
                emit(&Event::StreamError {
                    stream_id,
                    reason,
                    message: error.to_string(),
                });
            },
            None,
        )
        .map_err(|error| error.to_string())
}
