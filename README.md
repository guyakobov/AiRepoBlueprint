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

Template files are stored in this blueprint under:

- `llm_config/codex/AGENTS.md`
- `llm_config/claude/CLAUDE.md`
- `llm_config/gemini/GEMINI.md`

The command places provider files in the target repository root:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `CHANGELOG.md`
- `docs/ai/`

Provider dot folders are also copied to the target root:

- `.agents/`
- `.claude/`
- `.gemini/`
