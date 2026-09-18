# AiRepoBlueprint

An npm-installable AI instruction blueprint for new repositories.

Run it inside another repo:

```bash
npx ai-repo-blueprint
```

If the package is not published to npm, run it directly from a neighboring repository:

```powershell
node ..\AiRepoBlueprint\bin\ai-repo-blueprint.js
```

The interactive setup asks about:

- Project name, type, and purpose.
- Database requirements.
- Tools, MCPs, and plugins.
- Responsive UI requirements.
- Design style for websites, apps, and UI clients.
- Privacy policy and terms of service.
- Which LLM tools are used: Codex, Claude, Gemini, or a combination.
- Which specialized agents should be installed.
- Which reusable skills should be installed.

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

Agent instructions have one shared source under `docs/ai/agents/`. Small native adapters point each AI tool to that source:

- `.codex/agents/*.toml`
- `.claude/agents/*.md`
- `.gemini/agents/*.md`

Skill instructions also have one shared source under `docs/ai/skills/<skill-name>/`. Thin adapters make the same skill available to each selected tool:

- `.agents/skills/<skill-name>/SKILL.md` for Codex and Gemini.
- `.claude/skills/<skill-name>/SKILL.md` for Claude.

The shared skill folder can also contain optional `references/`, `scripts/`, and `assets/` folders.

Available agents:

- `planner`
- `implementer`
- `tester`
- `reviewer`
- `security-reviewer`
- `sql-expert`
- `frontend-expert`
- `backend-expert`

The agent question accepts `recommended`, `all`, `none`, or comma-separated names. Recommendations use the project type and database answers.

Available skills:

- `repo-cleanup`

The skill question accepts `recommended`, `all`, `none`, or comma-separated names. Only skills explicitly added to this blueprint are offered.
