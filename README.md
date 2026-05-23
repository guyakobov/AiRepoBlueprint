# AiRepoBlueprint

Reusable AI configuration blueprint for new repositories.

This repo is the source blueprint. It applies a consistent AI instruction structure to target repos for Codex, Claude Code, Antigravity, Gemini, and future AI tools while keeping shared guidance in `docs/ai/`.

## Layers

- `blueprint-files-for-new-repos/shared-files-for-every-repo/` contains files every target repo receives.
- `blueprint-files-for-new-repos/ai-tool-adapters/` contains one adapter folder per AI tool.
- `.blueprint/` contains manifest, tool registry, schema, ownership rules, and version metadata.
- `scripts/` contains PowerShell apply, validate, diff, and update workflows.
- `docs/ai/` contains short maintainer guidance for this blueprint repo only.

The reusable "my way of work" instructions live in `blueprint-files-for-new-repos/shared-files-for-every-repo/docs/ai/`. Do not duplicate that content in root `docs/ai/`.

## Apply To A New Repo

```powershell
.\scripts\apply-blueprint.ps1 `
  -TargetPath C:\path\to\target-repo `
  -ProjectName MyProject `
  -ProjectType application `
  -PrimaryLanguage TypeScript `
  -Framework Next.js `
  -PackageManager npm `
  -InstallCommand "npm install" `
  -TestCommand "npm test" `
  -LintCommand "npm run lint" `
  -BuildCommand "npm run build" `
  -RunCommand "npm run dev" `
  -DeploymentTarget Vercel
```

By default, existing target files are skipped. Pass `-Force` only when you intentionally want blueprint files to overwrite existing files.

## Tool Registry

Enabled tools are defined in `.blueprint/tools.json`. Applying the blueprint installs all enabled adapters by default.

Current enabled adapters:

- Codex: `AGENTS.md`
- Gemini: `GEMINI.md`
- Claude Code: `CLAUDE.md` and `.claude/`
- Antigravity: `.agents/`

To add a future AI tool, add its adapter files under `blueprint-files-for-new-repos/ai-tool-adapters/<tool-id>/` and register its folders/files in `.blueprint/tools.json`.

## Validate, Diff, Update

```powershell
.\scripts\validate-blueprint.ps1 -TargetPath C:\path\to\target-repo
.\scripts\diff-blueprint.ps1 -TargetPath C:\path\to\target-repo
.\scripts\update-blueprint.ps1 -TargetPath C:\path\to\target-repo
```

The scripts do not create GitHub Actions workflows.
