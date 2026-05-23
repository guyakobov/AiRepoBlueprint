# Project Context

This repository is a reusable AI repo blueprint. Its purpose is to initialize future repositories with consistent AI instructions, tool adapters, reusable workflows, and validation metadata.

## Purpose

Use this repository as a baseline for:

- Codex `AGENTS.md` guidance.
- Claude Code `CLAUDE.md`, settings, subagents, rules, and skills.
- Antigravity `.agents/` rules, workflows, and skills.
- Gemini `GEMINI.md` guidance.
- Shared project AI governance in `docs/ai/`.
- Safe application and validation through PowerShell scripts.

## Dynamic Application

Target repositories are generated from `templates/` using variables such as project name, language, framework, package manager, and commands.

The apply script writes `.blueprint/applied.json` into target repos so later validation and updates can understand which blueprint version, enabled tools, and variables were used.
