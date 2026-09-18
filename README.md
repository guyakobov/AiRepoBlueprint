# AiRepoBlueprint

An npm-installable, versioned AI instruction blueprint for other repositories.

## Use in another repository

Open a terminal in the other repository and run:

```bash
npx ai-repo-blueprint@latest init
```

Installs the blueprint and asks what to include.

```bash
npx ai-repo-blueprint@latest check
```

Checks whether a newer blueprint is available. It does not change files.

```bash
npx ai-repo-blueprint@latest update
```

Updates blueprint files safely. Your locally changed files are kept.

```bash
npx ai-repo-blueprint@latest update --prune
```

Also removes unchanged files that are no longer in the blueprint.

`@latest` uses the newest published version.

## Setup details

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

You can also pass a target repository:

```bash
npx ai-repo-blueprint@latest init ./target-repo
```

To skip the questions and copy the complete blueprint:

```bash
npx ai-repo-blueprint@latest init --all
```

Initialization creates `.ai-repo-blueprint.json` to track the installed version and files.

Existing files are managed only when they already match the blueprint. Different files are skipped. To replace them explicitly, use:

```bash
npx ai-repo-blueprint@latest init --force
```

Use `--force` only when local changes should be replaced:

```bash
npx ai-repo-blueprint@latest update --force --prune
```

For a fixed version in an important repository:

```bash
npm install --save-dev ai-repo-blueprint@1.10.0
npx ai-repo-blueprint update
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
