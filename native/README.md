Sidecars (Rust) of RebeccaWrites:

- `rl-capture` (`src/main.rs`): enumerates devices and streams PCM to the main process (task 29). Copied from Rebecca Listen's `native/`; keep both in sync.
- `rl-hotkey` (`src/bin/rl-hotkey/`): watches the record shortcut with a low-level keyboard hook (task 31). Only in RebeccaWrites.

Protocols in `PROTOCOL.md`. `npm run build:native` builds both and copies them to `resources/bin/`.
