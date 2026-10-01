//! `rl-calls`: microphone usage sidecar of RebeccaWrites (task 32).
//!
//! Tells main which apps are using the microphone right now, read from the microphone privacy
//! store of Windows, at start and every time it changes. Main decides which of them are calls.
//! Takes no commands: stdin only keeps it alive. The protocol is described in `PROTOCOL.md`.

mod event;
mod registry;
mod watch;

use std::io::BufRead;

use event::{ErrorCode, Event, emit};
use watch::MicStoreWatch;

fn main() {
    std::thread::spawn(|| {
        let message = watch_forever();
        emit(&Event::Error {
            code: ErrorCode::WatchFailed,
            message,
        });
        std::process::exit(1);
    });

    // Main is gone once stdin breaks or closes; lines are ignored.
    for line in std::io::stdin().lock().lines() {
        if line.is_err() {
            break;
        }
    }
    // The watch thread never returns on its own, so leaving `main` is not enough.
    std::process::exit(0);
}

/// Reports the microphone users now and after every change. Returns only on a registry error.
fn watch_forever() -> String {
    let watch = match MicStoreWatch::open() {
        Ok(watch) => watch,
        Err(message) => return message,
    };
    let mut last: Option<Vec<String>> = None;
    loop {
        // Armed before reading, so a change made while reading is not missed.
        if let Err(message) = watch.arm() {
            return message;
        }
        let apps = registry::apps_using_microphone(watch.key());
        if last.as_ref() != Some(&apps) {
            emit(&Event::MicUsers { apps: apps.clone() });
            last = Some(apps);
        }
        if let Err(message) = watch.wait() {
            return message;
        }
    }
}
