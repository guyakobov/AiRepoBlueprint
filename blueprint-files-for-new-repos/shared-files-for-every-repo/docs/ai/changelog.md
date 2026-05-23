# Changelog Governance

Use `CHANGELOG.md` in the repository root to record every meaningful code change.

## When To Update

Update `CHANGELOG.md` whenever a change affects repository behavior, scripts, configuration, documentation governance, reusable structure, or AI operating instructions.

Documentation-only edits still need a changelog entry when they change how future work should be done.

## Entry Format

Each entry must include:

- Version.
- Date.
- Short description.
- Commit hash.
- Status.

Allowed status values:

- `pending_review`
- `success`
- `failed`
- `needs_follow_up`

Use `pending` for the commit hash until the change has been committed. After a commit exists, replace `pending` with the short commit hash.

## Versioning

Use semantic versions:

- Patch version for small documentation or script fixes.
- Minor version for new governance files, structure, scripts, or reusable capabilities.
- Major version for breaking changes to layout or expected behavior.

## Review Reminder

After every successful push to `main`, remind the project owner to review whether the pushed change meets expectations.
