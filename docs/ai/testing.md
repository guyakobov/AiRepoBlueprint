# Blueprint Testing

Reusable testing guidance inherited by future repos lives in `templates/shared/docs/ai/testing.md`.

## Required Checks For This Repo

- Run `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-blueprint.ps1 -TargetPath .` after metadata, template, or script changes.
- Apply to a temporary repo after changing `templates/`, `.blueprint/manifest.json`, `.blueprint/tools.json`, or `scripts/`.
- Confirm generated repos do not receive blueprint source folders like `templates/` or `scripts/`.
