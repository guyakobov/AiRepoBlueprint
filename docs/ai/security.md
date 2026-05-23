# Blueprint Security

Reusable security guidance inherited by future repos lives in `templates/shared/docs/ai/security.md`.

## Maintainer Focus

- Do not place secrets in blueprint templates.
- Do not make scripts overwrite target files unless `-Force` is explicitly passed.
- Keep generated `.blueprint/applied.json` free of secrets.
- Treat future tool adapters as routing/configuration, not a place for private credentials.
