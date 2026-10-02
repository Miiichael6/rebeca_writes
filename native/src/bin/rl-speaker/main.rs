//! `rl-speaker`: voice print sidecar of RebeccaWrites (task 35).
//!
//! Tells main who is speaking in a stretch of audio by turning it into a speaker embedding
//! (sherpa-onnx); main compares those and groups them into people. Reads JSON commands from
//! stdin, answers with JSON events on stderr. The protocol is described in `PROTOCOL.md`.

mod command;
mod event;
mod sherpa;
mod wav;

use std::io::BufRead;

use command::{Command, parse_command};
use event::{ErrorCode, Event, emit};
use sherpa::Extractor;

fn main() {
    let mut extractor: Option<Extractor> = None;
    for line in std::io::stdin().lock().lines() {
        // A broken stdin means main is gone: stop quietly.
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        match parse_command(&line) {
            Ok(command) => run(command, &mut extractor),
            Err(message) => emit(&Event::Error {
                code: ErrorCode::BadCommand,
                message,
            }),
        }
    }
}

fn run(command: Command, extractor: &mut Option<Extractor>) {
    match command {
        Command::Load { model, threads } => match Extractor::load(&model, threads) {
            Ok(loaded) => {
                emit(&Event::Loaded { dim: loaded.dim() });
                *extractor = Some(loaded);
            }
            Err(message) => emit(&Event::LoadFailed { message }),
        },
        Command::Embed {
            id,
            wav,
            start,
            end,
        } => {
            let Some(extractor) = extractor else {
                return emit(&Event::Error {
                    code: ErrorCode::NotLoaded,
                    message: "embed before load".to_owned(),
                });
            };
            let result =
                wav::read_slice(&wav, start, end).and_then(|samples| extractor.embed(&samples));
            match result {
                Ok(vector) => emit(&Event::Embedding { id, vector }),
                Err(message) => emit(&Event::EmbedFailed { id, message }),
            }
        }
    }
}
