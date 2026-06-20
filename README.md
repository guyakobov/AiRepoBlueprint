# AiRepoBlueprint

An npm-installable AI instruction blueprint for new repositories.

Run it inside another repo:

```bash
npx ai-repo-blueprint
```

The interactive setup asks about:

- Project name, type, and purpose.
- Database requirements.
- Hosting and deployment location.
- Tools, MCPs, and plugins.
- Responsive UI requirements.
- Privacy policy and terms of service.
- Codex, Claude, and Gemini configuration.

It creates only the AI guidance files needed for the answers.

Or pass a target repo:

```bash
npx ai-repo-blueprint ./target-repo
```

To skip the questions and copy the complete blueprint:

```bash
npx ai-repo-blueprint --all
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
