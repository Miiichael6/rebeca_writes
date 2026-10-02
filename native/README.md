Sidecars (Rust) of RebeccaWrites:

- `rl-capture` (`src/main.rs`): enumerates devices and streams PCM to the main process (task 29). Copied from Rebecca Listen's `native/`; keep both in sync.
- `rl-hotkey` (`src/bin/rl-hotkey/`): watches the record shortcut with a low-level keyboard hook (task 31). Only in RebeccaWrites.
- `rl-calls` (`src/bin/rl-calls/`): lists the apps using the microphone (task 32).
- `rl-speaker` (`src/bin/rl-speaker/`): voice prints for "who is speaking" with sherpa-onnx (task 35). Its DLLs come from `npm run fetch:speaker`.

Protocols in `PROTOCOL.md`. `npm run build:native` builds them and copies them to `resources/bin/`.
