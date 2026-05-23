# Blueprint Workflows

Reusable workflows inherited by future repos live in `blueprint-files-for-new-repos/shared-files-for-every-repo/docs/ai/workflows.md`.

## Change Inherited Instructions

1. Edit the relevant file under `blueprint-files-for-new-repos/shared-files-for-every-repo/docs/ai/`.
2. Update tool adapters only if a tool needs different routing.
3. Run blueprint validation.
4. Apply to a temporary repo when changing template paths, scripts, or metadata.

## Add A New AI Tool

1. Add adapter files under `blueprint-files-for-new-repos/ai-tool-adapters/<tool-id>/`.
2. Register the tool in `.blueprint/tools.json`.
3. Keep the adapter thin and point it to target-repo `docs/ai/`.
4. Validate and apply to a temporary repo.
