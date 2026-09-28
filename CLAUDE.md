# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Windows desktop app (working name **RebecaWrites**) that transcribes video/audio to text 100% locally with whisper.cpp. Built on electron-vite + React 19 + TypeScript. The repo is currently at the **scaffold stage**: `src/renderer` has a static layout (Sidebar, Toolbar, Player, TranscriptView, BottomBar) with no real logic; `src/main` and `src/preload` are still the electron-vite template.

The full spec lives in [plans/about_this_project.md](plans/about_this_project.md) (Spanish). Reference screenshots are in [plans/images/](plans/images/). Read the spec before implementing any feature. It defines the stack, the transcription pipeline, UI behavior, the persistence format and the acceptance criteria.

## Task workflow

Work is split into numbered subtasks in `plans/tasks/`, tracked on the board in [plans/tasks/00_README.md](plans/tasks/00_README.md):

- Task files move between `pending/` → `in_progress/` → `done/` as their state changes. Only one task should be in `in_progress/` at a time.
- When working a task, tick its `- [ ]` steps, update its **Estado** line, add notes to its **Bitácora**, and update the task's link and state on the 00_README board.
- Open decisions D1–D4 in 00_README block some tasks (e.g. D3 blocks 01–04). Check them before starting a blocked task.
- Plans and task files are written in Spanish.
- Each phase must end with the app running under `npm run dev`, followed by a commit.

## Commands

```bash
npm run dev          # electron-vite dev server with HMR
npm run typecheck    # tsc for both node (main/preload) and web (renderer) projects
npm run lint         # eslint (cached)
npm run format       # prettier --write
npm run build        # typecheck + electron-vite build (to out/)
npm run build:win    # build + electron-builder NSIS installer
npm start            # preview the built app
```

No test runner is installed yet. Task 01 adds Vitest (`npm run test` = `vitest run`). To run a single test after that: `npx vitest run path/to/file.test.ts` or `npx vitest run -t "test name"`.

Prettier style: single quotes, no semicolons, `printWidth: 100`, no trailing commas.

## Architecture

**Three Electron processes, three tsconfigs:**
- `src/main/` is the main process (`tsconfig.node.json`). It owns all heavy work: spawning `ffmpeg`/`ffprobe`/`whisper-cli` child processes, file I/O, the queue and history services, the `media://` protocol.
- `src/preload/` exposes a typed `window.api` through `contextBridge` (`tsconfig.node.json`). The renderer must never get raw `ipcRenderer`; add a specific function per operation and type it in `src/preload/index.d.ts`.
- `src/renderer/` is the React UI (`tsconfig.web.json`), with alias `@renderer` → `src/renderer/src`.

**Target structure (spec §7, not yet created):** `src/main/engine/` (TranscriptionEngine, stdout/progress parsers, backend detection), `src/main/services/` (history, queue, settings, models, ffmpeg), `src/shared/` (shared types, IPC channel constants, `APP_NAME`, under a planned `@shared` alias), `src/renderer/src/store/` (Zustand), `src/renderer/src/i18n/` (i18next: es, en, pt-BR), `resources/bin/{cuda,vulkan,cpu}/whisper-cli.exe`, `scripts/fetch-binaries.mjs`.

**Key constraints from the spec that shape the code:**
- Electron security is mandatory: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. `src/main/index.ts` currently has `sandbox: false` from the template; task 01 changes it.
- The app name must come from a single constant (`APP_NAME`). Don't hardcode "Transcriba", and never use the reference app's name, logo or brand text.
- Transcription pipeline: ffprobe → ffmpeg to a 16 kHz mono WAV (optional `loudnorm`) → `whisper-cli -pp`. Segments are parsed from stdout (`[hh:mm:ss.mmm --> hh:mm:ss.mmm]  text`) and progress from stderr (`progress = N%`), then streamed to the renderer live. On Windows, cancel with `taskkill /PID <pid> /T /F`.
- Backend fallback order: CUDA → Vulkan → CPU, auto-detected on first run.
- Local media is served through a custom `media://` protocol (`protocol.handle`) with hand-written `Range` support. Codecs Chromium can't play get an ffmpeg H.264 preview cached in `userData/preview-cache/`.
- Persistence is JSON only in `userData` (no native modules), always written atomically (temp file + rename). Clearing history must never touch original media or exported `.srt` files.
- Binaries in `resources/` must stay outside the asar (`asarUnpack: resources/**` is already set in `electron-builder.yml`).
- Styling is plain CSS with design tokens in `src/renderer/src/styles/tokens.css` (accent `#E8432D`, Windows 11 Fluent look, light and dark). No UI frameworks; icons come from `lucide-react`.
- The transcript list must be virtualized (`@tanstack/react-virtual`) to handle multi-hour files.
