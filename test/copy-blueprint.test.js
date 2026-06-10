const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { copyBlueprint } = require("../lib/copy-blueprint");

const root = path.resolve(__dirname, "..");

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ai-repo-blueprint-"));
}

function exists(target, relativePath) {
  return fs.existsSync(path.join(target, relativePath));
}

test("copies all blueprint files into a target folder", () => {
  const target = makeTempDir();

  const result = copyBlueprint({ targetDir: target, sourceDir: root });

  assert.equal(result.copied.length, 28);
  assert.equal(result.skipped.length, 0);
  assert.equal(exists(target, "AGENTS.md"), true);
  assert.equal(exists(target, "CLAUDE.md"), true);
  assert.equal(exists(target, "GEMINI.md"), true);
  assert.equal(exists(target, "CHANGELOG.md"), true);
  assert.equal(exists(target, "docs/ai/qa.md"), true);
  assert.equal(exists(target, "llm_config/claude/.claude/agents/code-reviewer.md"), true);
  assert.equal(exists(target, "llm_config/codex/.agents/workflows/implement-feature.md"), true);
  assert.equal(exists(target, "llm_config/gemini/.gemini/README.md"), true);
});

test("skips existing files without force", () => {
  const target = makeTempDir();
  const targetFile = path.join(target, "AGENTS.md");
  fs.writeFileSync(targetFile, "keep me");

  const result = copyBlueprint({ targetDir: target, sourceDir: root });

  assert.equal(fs.readFileSync(targetFile, "utf8"), "keep me");
  assert.equal(result.skipped.includes("AGENTS.md"), true);
});

test("overwrites existing files with force", () => {
  const target = makeTempDir();
  const targetFile = path.join(target, "AGENTS.md");
  fs.writeFileSync(targetFile, "replace me");

  const result = copyBlueprint({ targetDir: target, sourceDir: root, force: true });

  assert.equal(fs.readFileSync(targetFile, "utf8"), fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"));
  assert.equal(result.copied.includes("AGENTS.md"), true);
});

test("fails clearly when target path does not exist", () => {
  const target = path.join(makeTempDir(), "missing");

  assert.throws(
    () => copyBlueprint({ targetDir: target, sourceDir: root }),
    /Target folder does not exist/
  );
});

test("fails clearly when target path is not a folder", () => {
  const target = path.join(makeTempDir(), "file.txt");
  fs.writeFileSync(target, "");

  assert.throws(
    () => copyBlueprint({ targetDir: target, sourceDir: root }),
    /Target path is not a folder/
  );
});
