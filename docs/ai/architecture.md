# Blueprint Architecture

This repo has four clear areas.

- `templates/shared/`: files every future repo inherits.
- `templates/tools/`: one adapter folder per AI tool.
- `.blueprint/`: metadata that tells scripts what to apply.
- `scripts/`: PowerShell automation for apply, validate, diff, and update.

Root `docs/ai/` is not part of the inherited output. It documents how to maintain this blueprint repo.
