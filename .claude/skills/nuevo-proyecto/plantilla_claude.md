# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

One paragraph: what the app does, the stack, and the current stage (e.g. "plan only, no code yet").

The full spec lives in [plans/about_this_project.md](plans/about_this_project.md). Reference images are in [plans/images/](plans/images/). Read the spec before implementing any feature.

## Task workflow

Work is split into numbered tasks in `plans/tasks/`, tracked on the board in [plans/tasks/00_README.md](plans/tasks/00_README.md). Use the `tasks` skill (`/tasks N`, `/tasks siguiente`, `/tasks estado`).

- Task files move between `pending/` → `in_progress/` → `done/`. Only one task family in `in_progress/` at a time.
- When working a task, tick its `- [ ]` steps, resolve its `[[VERIFICAR]]` marks first, update its **Estado** line, add notes to its **Bitácora**, and update the board.
- Open decisions (D1…) in 00_README block some tasks. Check them before starting a blocked task.
- Plans and task files are written in Spanish.
- Each phase must end with the app running under `<dev command>`, followed by a commit.

## Commands

```bash
<dev command>     # …
<test command>    # …
<lint command>    # …
```

## Architecture

Short description of the main modules/processes and the key constraints from the spec that shape the code (security, persistence, naming via `APP_NAME`, etc.). Fill in as tasks create the structure.
