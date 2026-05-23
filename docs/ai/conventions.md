# Blueprint Conventions

Do not copy inherited work-style rules into this folder. Put reusable project guidance in `templates/shared/docs/ai/`.

## Maintenance Rules

- Keep root `docs/ai/` focused on blueprint maintenance only.
- Keep future-repo shared files under `templates/shared/`.
- Keep future-repo tool-specific files under `templates/tools/<tool-id>/`.
- Keep tool adapters thin; they should point to inherited `docs/ai/` in the target repo.
- Prefer metadata changes over script changes when adding files or tools.
