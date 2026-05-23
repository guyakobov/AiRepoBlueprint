# Architecture

This repo has three blueprint layers.

## Template Layer

`templates/shared/` contains target-repo files every project receives. `templates/tools/` contains one adapter folder per AI tool. Template files may use double-brace placeholders for project name, primary language, commands, and other apply-time variables.

## Metadata Layer

`.blueprint/` contains:

- `manifest.json` for target folders, target files, source templates, ownership, and defaults.
- `tools.json` for enabled tool adapters and their file mappings.
- `ownership.json` for managed, customizable, and generated file policy.
- `schema.json` for the manifest shape.
- `version.txt` for the current blueprint version.

## Script Layer

`scripts/` contains PowerShell-first workflows:

- Apply missing blueprint files to a target repo.
- Validate target structure and unresolved placeholders.
- Diff rendered templates against target files.
- Update target repos safely without overwriting unless forced.
