//! `rl-fullscreen`: full screen sidecar of RebeccaWrites (task 40).
//!
//! Tells main whether the window in front is full screen on the primary monitor (a game, a
//! video, a presentation), at start and every time it changes, so the dock can get out of the
//! way. Takes no commands: stdin only keeps it alive. The protocol is described in `PROTOCOL.md`.

mod event;
mod foreground;

use std::io::BufRead;
use std::time::Duration;

use event::{Event, emit};

/// How often the foreground window is checked. Going full screen (F11, a game starting) does
/// not change the foreground window, so there is no single event to wait for.
const CHECK_EVERY: Duration = Duration::from_millis(500);

fn main() {
    std::thread::spawn(|| {
        let mut last: Option<bool> = None;
        loop {
            let active = foreground::foreground_is_fullscreen();
            if last != Some(active) {
                emit(&Event::Fullscreen { active });
                last = Some(active);
            }
            std::thread::sleep(CHECK_EVERY);
        }
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
