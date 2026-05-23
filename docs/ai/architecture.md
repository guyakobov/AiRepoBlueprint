# Blueprint Architecture

This repo has four clear areas.

- `blueprint-files-for-new-repos/shared-files-for-every-repo/`: files every future repo inherits.
- `blueprint-files-for-new-repos/ai-tool-adapters/`: one adapter folder per AI tool.
- `.blueprint/`: metadata that tells scripts what to apply.
- `scripts/`: PowerShell automation for apply, validate, diff, and update.

Root `docs/ai/` is not part of the inherited output. It documents how to maintain this blueprint repo.
