# Conventions

Use this file to document project-wide implementation conventions after the blueprint is applied.

## Code Style

- Follow the style already present in the target repository.
- Prefer simple, explicit code over clever abstractions.
- Keep naming consistent with nearby code.
- Add comments only when they explain non-obvious intent.

## Documentation

- Keep canonical AI guidance in `docs/ai/`.
- Keep tool-specific files short and focused on routing to canonical guidance.
- Update documentation when behavior, workflows, or architecture decisions change.

## Change Scope

- Make the smallest coherent change that solves the task.
- Avoid opportunistic refactors unless they directly reduce risk or unlock the requested work.
