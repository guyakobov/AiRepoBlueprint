# Blueprint Workflows

Reusable workflows inherited by future repos live in `templates/shared/docs/ai/workflows.md`.

## Change Inherited Instructions

1. Edit the relevant file under `templates/shared/docs/ai/`.
2. Update tool adapters only if a tool needs different routing.
3. Run blueprint validation.
4. Apply to a temporary repo when changing template paths, scripts, or metadata.

## Add A New AI Tool

1. Add templates under `templates/tools/<tool-id>/`.
2. Register the tool in `.blueprint/tools.json`.
3. Keep the adapter thin and point it to target-repo `docs/ai/`.
4. Validate and apply to a temporary repo.
