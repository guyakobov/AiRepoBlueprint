# AI Instructions

This directory is the canonical source of truth for AI-assisted work in {{ProjectName}}. Tool-specific entrypoints should reference these files instead of copying their guidance.

## Project Defaults

- Project type: {{ProjectType}}
- Primary language: {{PrimaryLanguage}}
- Framework: {{Framework}}
- Package manager: {{PackageManager}}
- Deployment target: {{DeploymentTarget}}

## Operating Principles

- Read the relevant project context before making changes.
- Prefer the repository's existing patterns over introducing new conventions.
- Keep edits scoped to the requested task.
- Do not modify unrelated files.
- Verify meaningful changes with the narrowest reliable checks.
- Call out uncertainty, risk, or assumptions clearly.

## File Ownership

- Shared guidance belongs in `docs/ai/`.
- Claude-only configuration belongs in `.claude/`.
- Antigravity-only configuration belongs in `.agents/`.
- Blueprint metadata belongs in `.blueprint/`.
