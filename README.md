# AiRepoBlueprint

An npm-installable AI instruction blueprint for new repositories.

Run it inside another repo:

```bash
npx ai-repo-blueprint
```

The interactive setup asks about:

- Project name, type, and purpose.
- Database requirements.
- Tools, MCPs, and plugins.
- Responsive UI requirements.
- Privacy policy and terms of service.
- Which LLM tools are used: Codex, Claude, Gemini, or a combination.

It creates only the AI guidance and provider files needed for the answers.

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

The command generates selected provider files in the target repository root:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `CHANGELOG.md`
- `docs/ai/`

Empty provider folders are created without rules or instructions:

- `.agents/`
- `.claude/`
- `.gemini/`
