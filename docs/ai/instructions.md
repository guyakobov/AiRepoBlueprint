# AI Instructions

This directory is the canonical source of truth for AI-assisted work in this blueprint repository. Tool-specific entrypoints should reference these files instead of copying their guidance.

## Operating Principles

- Preserve this repo as a reusable blueprint for future repositories.
- Prefer manifest-driven behavior over hard-coded file lists.
- Keep `templates/shared/` as the source for inherited shared files.
- Keep `templates/tools/` as the source for inherited tool adapters.
- Keep `.blueprint/` as metadata, tool registry, schema, version, and ownership policy.
- Keep `scripts/` as PowerShell-first blueprint automation.
- Verify meaningful changes with the blueprint scripts.
- Call out uncertainty, risk, or assumptions clearly.

## File Ownership

- Shared governance for this repo belongs in `docs/ai/`.
- Target-repo shared templates belong in `templates/shared/`.
- Target-repo tool templates belong in `templates/tools/`.
- Claude-only target configuration templates belong in `templates/.claude/`.
- Antigravity target templates belong in `templates/.agents/`.
- Blueprint metadata belongs in `.blueprint/`.
- Automation and validation logic belongs in `scripts/`.
