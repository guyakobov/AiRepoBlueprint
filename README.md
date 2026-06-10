# AiRepoBlueprint

An npm-installable AI instruction blueprint for new repositories.

Run it inside another repo:

```bash
npx ai-repo-blueprint
```

Or pass a target repo:

```bash
npx ai-repo-blueprint ./target-repo
```

Existing files are skipped. To replace them, use:

```bash
npx ai-repo-blueprint --force
```

The command copies these files and folders:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `CHANGELOG.md`
- `docs/ai/`
- `llm_config/`

LLM-specific dot folders live under:

- `llm_config/codex/.agents/`
- `llm_config/claude/.claude/`
- `llm_config/gemini/.gemini/`
