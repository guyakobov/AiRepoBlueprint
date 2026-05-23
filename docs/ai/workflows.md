# Workflows

Use this file as the canonical reference for project-level AI workflows.

## Implement Feature

1. Read relevant docs, code, and tests.
2. Identify existing patterns and extension points.
3. Implement the smallest complete version of the feature.
4. Add or update focused tests.
5. Update `CHANGELOG.md` for meaningful changes.
6. Run validation checks and summarize the outcome.

## Fix Bug

1. Reproduce or reason about the failure.
2. Identify the root cause.
3. Apply a targeted fix.
4. Add regression coverage where practical.
5. Update `CHANGELOG.md` when the fix changes behavior.
6. Verify the fix with relevant checks.

## Refactor

1. Preserve behavior.
2. Keep changes mechanically reviewable.
3. Avoid mixing refactors with unrelated feature work.
4. Run tests that cover the touched area.

## Blueprint Script Changes

When changing blueprint scripts, verify at least:

- `validate-blueprint.ps1 -TargetPath .`
- Apply to an empty temporary repo.
- Re-apply without `-Force`.
- Re-apply with `-Force`.
- Validate a partial temporary repo.
- Confirm no `.github/workflows` directory was created.

## Review Pull Request

Prioritize correctness, security, regressions, maintainability, and missing tests. Report concrete findings with file and line references when possible.
