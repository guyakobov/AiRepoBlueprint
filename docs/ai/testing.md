# Testing

Use this file as the canonical testing guidance for AI-assisted work.

## Expectations

- Run the narrowest meaningful tests for the changed area.
- Broaden coverage when touching shared behavior, public interfaces, or security-sensitive code.
- Add regression tests for bug fixes when practical.
- State clearly when tests were not run and why.

## Test Selection

Choose tests based on risk:

- Documentation-only changes may need no automated tests.
- Localized code changes should run targeted unit or integration tests.
- Cross-cutting changes should run broader suites.
- User-facing flows should be verified end to end when feasible.
