# Blueprint Maintainer Instructions

This folder is only for working on the `AiRepoBlueprint` repository itself.

Reusable instructions for future repos live in `templates/shared/docs/ai/`. Do not duplicate that content here.

## Maintainer Rules

- Edit `templates/shared/docs/ai/` when changing the inherited way of work.
- Edit `templates/tools/<tool-id>/` when changing a specific AI tool adapter.
- Edit `.blueprint/tools.json` when adding or disabling an AI tool.
- Edit `.blueprint/manifest.json` when changing shared inherited files or variables.
- Keep scripts in `scripts/` PowerShell-first.
- Validate blueprint changes before committing.
