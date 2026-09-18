const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { parseArgs } = require("../bin/ai-repo-blueprint");
const {
  STATE_FILE,
  checkBlueprint,
  hashContent,
  initializeBlueprint,
  readState,
  updateBlueprint,
} = require("../lib/managed-blueprint");

function makeFolder(t) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "ai-repo-managed-"));
  t.after(() => fs.rmSync(folder, { recursive: true, force: true }));
  return folder;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function makeSource(t, {
  qa = "# QA v1\n",
  skillBody = "Cleanup v1.\n",
  resources = {},
} = {}) {
  const source = makeFolder(t);

  write(path.join(source, "CHANGELOG.md"), "# Blueprint changelog\n");
  write(path.join(source, "docs", "ai", "changelog.md"), "# Changelog rules\n");
  write(path.join(source, "docs", "ai", "qa.md"), qa);
  write(path.join(source, "docs", "ai", "security.md"), "# Security\n");
  write(
    path.join(source, "docs", "ai", "skills", "repo-cleanup", "SKILL.md"),
    `---\nname: repo-cleanup\ndescription: Clean repositories safely.\n---\n\n${skillBody}`
  );

  for (const [relativePath, content] of Object.entries(resources)) {
    write(
      path.join(source, "docs", "ai", "skills", "repo-cleanup", relativePath),
      content
    );
  }

  return source;
}

const configuration = {
  mode: "custom",
  project: {
    name: "Example",
    description: "Example project",
    type: "library",
    database: {},
    tools: [],
    mcps: [],
    plugins: [],
  },
  selectedDocs: [],
  providers: ["codex"],
  agents: [],
  skills: ["repo-cleanup"],
};

test("parses managed blueprint commands and keeps legacy init syntax", () => {
  assert.deepEqual(parseArgs([]), {
    command: "init",
    all: false,
    force: false,
    prune: false,
    targetDir: process.cwd(),
  });

  const legacy = parseArgs(["example", "--all"]);
  assert.equal(legacy.command, "init");
  assert.equal(legacy.all, true);
  assert.equal(legacy.targetDir, path.resolve("example"));

  const update = parseArgs(["update", "example", "--force", "--prune"]);
  assert.equal(update.command, "update");
  assert.equal(update.force, true);
  assert.equal(update.prune, true);
  assert.throws(() => parseArgs(["check", "--force"]));
  assert.throws(() => parseArgs(["update", "--all"]));
});

test("initializes a temporary repository and records managed hashes", (t) => {
  const sourceDir = makeSource(t);
  const targetDir = makeFolder(t);

  const result = initializeBlueprint({
    sourceDir,
    targetDir,
    configuration,
    blueprintVersion: "1.0.0",
  });

  assert.ok(result.created.includes("AGENTS.md"));
  assert.equal(fs.existsSync(path.join(targetDir, STATE_FILE)), true);
  assert.equal(fs.existsSync(path.join(targetDir, ".codex")), true);

  const state = readState(targetDir);
  assert.equal(state.blueprintVersion, "1.0.0");
  assert.equal(state.configuration.mode, "custom");
  assert.match(state.managedFiles["AGENTS.md"], /^[a-f0-9]{64}$/);
  assert.match(
    state.managedFiles["docs/ai/skills/repo-cleanup/SKILL.md"],
    /^[a-f0-9]{64}$/
  );

  const check = checkBlueprint({
    sourceDir,
    targetDir,
    blueprintVersion: "1.0.0",
  });
  assert.equal(check.current, true);
  assert.throws(() =>
    initializeBlueprint({
      sourceDir,
      targetDir,
      configuration,
      blueprintVersion: "1.0.0",
    })
  );
});

test("supports managed all mode without applying to the blueprint repository", (t) => {
  const targetDir = makeFolder(t);
  const sourceDir = path.resolve(__dirname, "..");

  initializeBlueprint({
    sourceDir,
    targetDir,
    configuration: { mode: "all" },
    blueprintVersion: "1.10.0",
  });

  const state = readState(targetDir);
  assert.equal(state.configuration.mode, "all");
  assert.equal(fs.existsSync(path.join(targetDir, "AGENTS.md")), true);
  assert.equal(fs.existsSync(path.join(targetDir, "CLAUDE.md")), true);
  assert.equal(fs.existsSync(path.join(targetDir, "GEMINI.md")), true);
  assert.equal(
    fs.existsSync(
      path.join(targetDir, ".agents", "skills", "repo-cleanup", "SKILL.md")
    ),
    true
  );
});

test("rejects unsafe managed paths from the state file", (t) => {
  const targetDir = makeFolder(t);
  write(
    path.join(targetDir, STATE_FILE),
    `${JSON.stringify({
      schemaVersion: 1,
      blueprintVersion: "1.0.0",
      configuration,
      managedFiles: { "../outside.md": hashContent("unsafe") },
      conflicts: [],
    })}\n`
  );

  assert.throws(() => readState(targetDir), /Unsafe managed file path/);
});

test("adopts matching files and skips different existing files", (t) => {
  const sourceDir = makeSource(t);
  const sourceTarget = makeFolder(t);
  const targetDir = makeFolder(t);

  initializeBlueprint({
    sourceDir,
    targetDir: sourceTarget,
    configuration,
    blueprintVersion: "1.0.0",
  });
  write(path.join(targetDir, "docs", "ai", "qa.md"), "# Local QA\n");
  write(
    path.join(targetDir, "AGENTS.md"),
    fs.readFileSync(path.join(sourceTarget, "AGENTS.md"))
  );

  const result = initializeBlueprint({
    sourceDir,
    targetDir,
    configuration,
    blueprintVersion: "1.0.0",
  });
  const state = readState(targetDir);

  assert.ok(result.adopted.includes("AGENTS.md"));
  assert.ok(result.skipped.includes("docs/ai/qa.md"));
  assert.equal(state.managedFiles["docs/ai/qa.md"], undefined);
  assert.deepEqual(state.conflicts, ["docs/ai/qa.md"]);
});

test("updates safe files, creates new files, and preserves conflicts", (t) => {
  const sourceV1 = makeSource(t, {
    qa: "# QA v1\n",
    skillBody: "Cleanup v1.\n",
    resources: { "references/old.md": "old\n" },
  });
  const sourceV2 = makeSource(t, {
    qa: "# QA v2\n",
    skillBody: "Cleanup v2.\n",
    resources: { "references/new.md": "new\n" },
  });
  const targetDir = makeFolder(t);

  initializeBlueprint({
    sourceDir: sourceV1,
    targetDir,
    configuration,
    blueprintVersion: "1.0.0",
  });
  write(path.join(targetDir, "docs", "ai", "qa.md"), "# Custom QA\n");

  const check = checkBlueprint({
    sourceDir: sourceV2,
    targetDir,
    blueprintVersion: "2.0.0",
  });
  assert.ok(check.update.includes("docs/ai/skills/repo-cleanup/SKILL.md"));
  assert.ok(check.create.includes("docs/ai/skills/repo-cleanup/references/new.md"));
  assert.ok(check.conflicts.includes("docs/ai/qa.md"));
  assert.ok(check.obsolete.includes("docs/ai/skills/repo-cleanup/references/old.md"));

  const result = updateBlueprint({
    sourceDir: sourceV2,
    targetDir,
    blueprintVersion: "2.0.0",
  });
  assert.ok(result.updated.includes("docs/ai/skills/repo-cleanup/SKILL.md"));
  assert.ok(result.created.includes("docs/ai/skills/repo-cleanup/references/new.md"));
  assert.ok(result.skipped.includes("docs/ai/qa.md"));
  assert.ok(result.obsolete.includes("docs/ai/skills/repo-cleanup/references/old.md"));
  assert.equal(fs.readFileSync(path.join(targetDir, "docs", "ai", "qa.md"), "utf8"), "# Custom QA\n");
  assert.equal(readState(targetDir).blueprintVersion, "2.0.0");

  const pruned = updateBlueprint({
    sourceDir: sourceV2,
    targetDir,
    blueprintVersion: "2.0.0",
    prune: true,
  });
  assert.ok(pruned.removed.includes("docs/ai/skills/repo-cleanup/references/old.md"));
  assert.equal(
    fs.existsSync(
      path.join(targetDir, "docs", "ai", "skills", "repo-cleanup", "references", "old.md")
    ),
    false
  );

  const forced = updateBlueprint({
    sourceDir: sourceV2,
    targetDir,
    blueprintVersion: "2.0.0",
    force: true,
  });
  assert.ok(forced.updated.includes("docs/ai/qa.md"));
  assert.equal(fs.readFileSync(path.join(targetDir, "docs", "ai", "qa.md"), "utf8"), "# QA v2\n");
  assert.deepEqual(readState(targetDir).conflicts, []);
});

test("does not prune a locally modified obsolete file without force", (t) => {
  const sourceV1 = makeSource(t, {
    resources: { "references/old.md": "old\n" },
  });
  const sourceV2 = makeSource(t);
  const targetDir = makeFolder(t);
  const oldFile = path.join(
    targetDir,
    "docs",
    "ai",
    "skills",
    "repo-cleanup",
    "references",
    "old.md"
  );

  initializeBlueprint({
    sourceDir: sourceV1,
    targetDir,
    configuration,
    blueprintVersion: "1.0.0",
  });
  write(oldFile, "custom old file\n");

  const result = updateBlueprint({
    sourceDir: sourceV2,
    targetDir,
    blueprintVersion: "2.0.0",
    prune: true,
  });
  assert.ok(result.skipped.includes("docs/ai/skills/repo-cleanup/references/old.md"));
  assert.equal(fs.existsSync(oldFile), true);
});

test("turns removed catalog selections into obsolete managed files", (t) => {
  const sourceDir = makeSource(t);
  const targetDir = makeFolder(t);

  initializeBlueprint({
    sourceDir,
    targetDir,
    configuration,
    blueprintVersion: "1.0.0",
  });

  const stateFile = path.join(targetDir, STATE_FILE);
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  state.configuration.skills = ["removed-skill"];
  write(stateFile, `${JSON.stringify(state, null, 2)}\n`);

  const check = checkBlueprint({
    sourceDir,
    targetDir,
    blueprintVersion: "2.0.0",
  });
  assert.ok(check.obsolete.includes("docs/ai/skills/repo-cleanup/SKILL.md"));

  updateBlueprint({
    sourceDir,
    targetDir,
    blueprintVersion: "2.0.0",
    prune: true,
  });
  assert.equal(
    fs.existsSync(
      path.join(targetDir, "docs", "ai", "skills", "repo-cleanup", "SKILL.md")
    ),
    false
  );
  assert.deepEqual(readState(targetDir).configuration.skills, []);
});
