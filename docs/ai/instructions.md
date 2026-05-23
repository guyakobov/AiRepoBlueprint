# Blueprint Maintainer Instructions

This folder is only for working on the `AiRepoBlueprint` repository itself.

Reusable instructions for future repos live in `blueprint-files-for-new-repos/shared-files-for-every-repo/docs/ai/`. Do not duplicate that content here.

## Maintainer Rules

- Edit `blueprint-files-for-new-repos/shared-files-for-every-repo/docs/ai/` when changing the inherited way of work.
- Edit `blueprint-files-for-new-repos/ai-tool-adapters/<tool-id>/` when changing a specific AI tool adapter.
- Edit `.blueprint/tools.json` when adding or disabling an AI tool.
- Edit `.blueprint/manifest.json` when changing shared inherited files or variables.
- Keep scripts in `scripts/` PowerShell-first.
- Validate blueprint changes before committing.
