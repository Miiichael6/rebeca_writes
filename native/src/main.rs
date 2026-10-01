//! `rl-capture`: audio capture sidecar (shared with Rebecca Listen).
//!
//! Reads JSON commands from stdin, one per line, answers with JSON events on
//! stderr and streams PCM on stdout. The protocol is described in `PROTOCOL.md`.

mod capture;
mod command;
mod device;
mod endpoint_name;
mod enumerate;
mod event;
mod pcm;

use std::collections::HashMap;
use std::io::BufRead;

use command::{Command, parse_command};
use event::{ErrorCode, Event, StreamErrorReason, emit};

fn main() {
    // Streams stop when dropped, so they live here for as long as they run.
    let mut streams: HashMap<u8, cpal::Stream> = HashMap::new();
    for line in std::io::stdin().lock().lines() {
        // A broken stdin means main is gone: stop quietly.
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        match parse_command(&line) {
            Ok(command) => run(command, &mut streams),
            Err(message) => emit(&Event::Error {
                code: ErrorCode::BadCommand,
                message,
            }),
        }
    }
}

fn run(command: Command, streams: &mut HashMap<u8, cpal::Stream>) {
    match command {
        Command::List => list(),
        Command::Open {
            stream_id,
            device_id,
            kind,
        } => {
            // Reusing an id replaces the old stream instead of leaking it.
            streams.remove(&stream_id);
            match capture::open(stream_id, &device_id, kind) {
                Ok(open) => {
                    streams.insert(stream_id, open.stream);
                    emit(&Event::Opened {
                        stream_id,
                        sample_rate: open.sample_rate,
                        channels: open.channels,
                    });
                }
                Err(message) => emit(&Event::StreamError {
                    stream_id,
                    reason: StreamErrorReason::OpenFailed,
                    message,
                }),
            }
        }
        Command::Stop { stream_id } => {
            streams.remove(&stream_id);
            emit(&Event::Stopped { stream_id });
        }
    }
}

fn list() {
    match enumerate::list_devices() {
        Ok(enumeration) => {
            for message in enumeration.skipped {
                emit(&Event::Warning { message });
            }
            emit(&Event::Devices {
                devices: enumeration.devices,
            });
        }
        Err(error) => emit(&Event::Error {
            code: ErrorCode::EnumerationFailed,
            message: error.to_string(),
        }),
    }
}
