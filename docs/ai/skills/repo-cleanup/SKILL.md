---
name: repo-cleanup
description: Audit and safely organize a software repository by identifying obsolete files, generated files, unused assets, misplaced documentation, and scattered scripts.
---

# Repository Cleanup

Use this skill when the user asks to clean, organize, simplify, declutter, or review a repository.

## Goals

- Make the repository easier to understand.
- Remove files that are clearly obsolete, generated, duplicated, or unused.
- Keep active application, build, release, test, documentation, and deployment files.
- Preserve unrelated user changes.
- Avoid deleting files based only on age or infrequent use.

## Audit First

Before changing files:

1. Read the repository instructions and relevant documentation.
2. Check `git status`.
3. Inspect root files, directories, package manifests, scripts, assets, and ignore files.
4. Search references with `rg`.
5. Review Git history when the purpose of a file is unclear.
6. Identify files that are:
   - Runtime assets
   - Build or release assets
   - Store-submission assets
   - Tests
   - QA or design evidence
   - Generated caches or build output
   - Private or local-only data
   - Obsolete or duplicated files

## Deletion Rules

Delete only when there is strong evidence that a file is no longer needed.

Safe deletion candidates usually include:

- Generated caches such as `.vite/`
- Dependency folders such as `node_modules/`
- Build output such as `dist/` or `build/`
- Local environment files and deployment metadata
- Old generated screenshots with no references
- One-off generators that produced assets no longer used
- Duplicate or obsolete documentation with no references

Do not delete:

- Runtime assets referenced by application code
- Native Android or iOS assets
- Store assets that may be needed for submission
- Database migrations or schema history without explicit approval
- Certificates, backups, social-media files, or private data without checking repository rules
- Files that are merely infrequently used

If a file is uncertain, report it as a candidate and leave it untouched.

## Documentation Organization

Keep conventional project files at the repository root:

- `README.md`
- `CHANGELOG.md`
- `AGENTS.md` or `AGENTS.MD`
- Required tool configuration files

Move topic-specific documentation into an existing documentation directory, such as:

- `docs/design/`
- `docs/qa/`
- `docs/architecture/`
- `docs/operations/`

Update every reference after moving a file.

## Script Organization

Classify scripts before moving them:

- Application code stays with the application.
- Tests stay with their test suite.
- Server/database scripts stay with the server when they depend on server code.
- General build, release, migration, and asset-generation helpers may go into `scripts/`.

Before moving a script:

- Search for references in package manifests, CI, deployment files, and documentation.
- Preserve its working directory assumptions.
- Update all callers and documentation.
- Keep separate scripts when they support genuinely different environments.

Frequency alone is not a reason to delete a release or build script.

## Asset Review

For images and other assets:

1. Search for references in code and documentation.
2. Check dimensions, hashes, and file names.
3. Distinguish runtime assets from historical evidence.
4. Keep brand, website, native-app, and store assets when they have a defined path.
5. Treat QA and design screenshots as non-runtime evidence. Keep them only when the team wants historical comparison or audit proof.
6. Remove obsolete generated images together with their unused generators.

## Ignore Rules

Add generated and local-only paths to the correct ignore file when appropriate, including:

- `node_modules/`
- `.vite/`
- `.vercel/`
- `dist/`
- `build/`
- Local environment files
- Private data directories

Do not remove private files merely to make the working tree look clean.

## Verification

After changes:

- Search again for stale references.
- Run `git diff --check`.
- Run relevant tests and builds.
- Run a development startup check when application behavior or startup configuration changed.
- Confirm unrelated user changes remain untouched.
- Check `git status`.

For documentation-only or file-removal changes, do not run unrelated application tests unless repository instructions require them.

## Git Safety

- Stage only intended paths.
- Never use broad staging when unrelated work exists.
- Do not commit or push unless the user asks or repository instructions require it.
- Report deleted files clearly.
- Never delete production data or secrets.
- Do not introduce a new migration framework, package, or tool unless the user explicitly requests it.
