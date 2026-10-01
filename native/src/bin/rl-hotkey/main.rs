//! `rl-hotkey`: keyboard shortcut sidecar of RebeccaWrites (task 31).
//!
//! Watches one key combination with a low-level keyboard hook and tells main when it is
//! pressed and released. Reads JSON commands from stdin, one per line, and answers with JSON
//! events on stderr. The protocol is described in `PROTOCOL.md`.

mod combo;
mod command;
mod event;
mod hook;

use std::io::BufRead;
use std::sync::mpsc;

use combo::{ComboTracker, KeyEvent};
use command::{Command, parse_command};
use event::{ErrorCode, Event, emit};

fn main() {
    let (sender, receiver) = mpsc::channel();
    std::thread::spawn(move || {
        let message = hook::run(sender);
        emit(&Event::Error {
            code: ErrorCode::HookFailed,
            message,
        });
        std::process::exit(1);
    });
    std::thread::spawn(move || {
        for key_event in receiver {
            emit(&match key_event {
                KeyEvent::Down => Event::Down,
                KeyEvent::Up => Event::Up,
                KeyEvent::Other => Event::Other,
            });
        }
    });

    for line in std::io::stdin().lock().lines() {
        // A broken stdin means main is gone: stop quietly.
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        match parse_command(&line) {
            Ok(command) => run(command),
            Err(message) => emit(&Event::Error {
                code: ErrorCode::BadCommand,
                message,
            }),
        }
    }
    // The hook thread never returns on its own, so leaving `main` is not enough.
    std::process::exit(0);
}

fn run(command: Command) {
    let mut tracker = hook::TRACKER
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    match command {
        Command::Watch(combo) => {
            *tracker = Some(ComboTracker::new(combo));
            emit(&Event::Watching);
        }
        Command::Off => {
            *tracker = None;
            emit(&Event::Off);
        }
    }
}
