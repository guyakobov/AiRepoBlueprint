# Blueprint Metadata

This directory describes the reusable AI repository blueprint.

- `manifest.json` defines shared template files, variables, generated metadata, and blueprint source files.
- `tools.json` defines enabled AI tool adapters and their file mappings.
- `ownership.json` defines how generated files should be treated later.
- `schema.json` documents the expected manifest shape.
- `version.txt` records the blueprint version.

The PowerShell scripts read this metadata to apply, validate, diff, and update target repositories without GitHub Actions.
