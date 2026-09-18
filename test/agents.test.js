const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  parseAgentSelection,
  parseSkillSelection,
} = require("../bin/ai-repo-blueprint");
const { copyBlueprint } = require("../lib/copy-blueprint");
const { agentCatalog, coreAgentIds, getRecommendedAgents } = require("../lib/agents");
const {
  getRecommendedSkills,
  parseSkillMetadata,
  readSkillMetadata,
  skillCatalog,
} = require("../lib/skills");

function makeTarget(t) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "ai-repo-blueprint-"));
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  return target;
}

function read(target, relativeFile) {
  return fs.readFileSync(path.join(target, relativeFile), "utf8");
}

const baseProject = {
  name: "Example",
  description: "Example project",
  type: "library",
  database: {},
  tools: [],
  mcps: [],
  plugins: [],
};

test("recommends core and role agents from project answers", () => {
  assert.deepEqual(
    getRecommendedAgents({ ...baseProject, type: "website" }),
    [...coreAgentIds, "frontend-expert"]
  );
  assert.deepEqual(
    getRecommendedAgents({
      ...baseProject,
      type: "API",
      database: { provider: "Postgres" },
    }),
    [...coreAgentIds, "sql-expert", "backend-expert"]
  );
});

test("parses agent selections", () => {
  const recommended = ["planner", "frontend-expert"];

  assert.deepEqual(parseAgentSelection("recommended", recommended), recommended);
  assert.deepEqual(parseAgentSelection("all", recommended), Object.keys(agentCatalog));
  assert.deepEqual(parseAgentSelection("none", recommended), []);
  assert.deepEqual(
    parseAgentSelection("reviewer, reviewer, sql-expert", recommended),
    ["reviewer", "sql-expert"]
  );
  assert.throws(() => parseAgentSelection("unknown", recommended));
  assert.throws(() => parseAgentSelection("all, reviewer", recommended));
});

test("recommends and parses skill selections", () => {
  const recommended = getRecommendedSkills();

  assert.deepEqual(recommended, Object.keys(skillCatalog));
  assert.deepEqual(parseSkillSelection("recommended", recommended), recommended);
  assert.deepEqual(parseSkillSelection("all", recommended), Object.keys(skillCatalog));
  assert.deepEqual(parseSkillSelection("none", recommended), []);
  assert.deepEqual(
    parseSkillSelection("repo-cleanup, repo-cleanup", recommended),
    ["repo-cleanup"]
  );
  assert.throws(() => parseSkillSelection("unknown", recommended));
  assert.throws(() => parseSkillSelection("all, repo-cleanup", recommended));
});

test("validates required skill frontmatter", () => {
  assert.deepEqual(
    parseSkillMetadata("---\nname: example-skill\ndescription: Does useful work.\n---\n"),
    { name: "example-skill", description: "Does useful work." }
  );
  assert.throws(
    () => parseSkillMetadata("---\nname: Example Skill\ndescription: Useful.\n---\n"),
    /Invalid or missing skill name/
  );
  assert.throws(
    () => parseSkillMetadata("---\nname: example-skill\n---\n"),
    /Invalid or missing skill description/
  );
});

test("copies one shared source and native adapters for selected agents", (t) => {
  const target = makeTarget(t);
  const agents = ["reviewer", "sql-expert", "frontend-expert"];
  const selectedDocs = [
    "database.md",
    "tools.md",
    "responsive-ui.md",
    "design_style.md",
    "privacy-policy.md",
    "terms-of-service.md",
  ];

  copyBlueprint({
    targetDir: target,
    project: {
      ...baseProject,
      type: "website",
      database: { provider: "Postgres", name: "app", purpose: "Application data" },
    },
    selectedDocs,
    providers: ["codex", "claude", "gemini"],
    agents,
  });

  assert.deepEqual(
    fs.readdirSync(path.join(target, "docs", "ai", "agents")).sort(),
    agents.map((agent) => `${agent}.md`).sort()
  );

  for (const agent of agents) {
    const sourcePath = `docs/ai/agents/${agent}.md`;
    assert.match(read(target, path.join(".codex", "agents", `${agent}.toml`)), new RegExp(sourcePath));
    assert.match(read(target, path.join(".claude", "agents", `${agent}.md`)), new RegExp(sourcePath));
    assert.match(read(target, path.join(".gemini", "agents", `${agent}.md`)), new RegExp(sourcePath));
  }

  const sql = read(target, path.join("docs", "ai", "agents", "sql-expert.md"));
  assert.match(sql, /docs\/ai\/database\.md/);
  assert.doesNotMatch(sql, /docs\/ai\/responsive-ui\.md/);

  const frontend = read(target, path.join("docs", "ai", "agents", "frontend-expert.md"));
  assert.match(frontend, /docs\/ai\/design_style\.md/);
  assert.match(frontend, /docs\/ai\/responsive-ui\.md/);

  const reviewer = read(target, path.join("docs", "ai", "agents", "reviewer.md"));
  assert.match(reviewer, /docs\/ai\/database\.md/);
  assert.match(reviewer, /docs\/ai\/terms-of-service\.md/);
  assert.equal(fs.existsSync(path.join(target, ".codex", "agents", "implementer.toml")), false);
});

test("supports no agents and provider filtering", (t) => {
  const target = makeTarget(t);

  copyBlueprint({
    targetDir: target,
    project: baseProject,
    providers: ["codex"],
    agents: [],
    skills: [],
  });

  assert.equal(fs.existsSync(path.join(target, ".codex")), true);
  assert.equal(fs.existsSync(path.join(target, ".claude")), false);
  assert.equal(fs.existsSync(path.join(target, "docs", "ai", "agents")), false);
  assert.doesNotMatch(read(target, "AGENTS.md"), /Specialized agents/);
});

test("copies one shared skill and provider adapters without Gemini duplication", (t) => {
  const target = makeTarget(t);
  const skills = ["repo-cleanup"];

  copyBlueprint({
    targetDir: target,
    project: baseProject,
    providers: ["codex", "claude", "gemini"],
    agents: [],
    skills,
  });

  const sharedFile = path.join(
    target,
    "docs",
    "ai",
    "skills",
    "repo-cleanup",
    "SKILL.md"
  );
  const agentsAdapter = path.join(
    target,
    ".agents",
    "skills",
    "repo-cleanup",
    "SKILL.md"
  );
  const claudeAdapter = path.join(
    target,
    ".claude",
    "skills",
    "repo-cleanup",
    "SKILL.md"
  );

  assert.equal(fs.existsSync(sharedFile), true);
  assert.equal(fs.existsSync(agentsAdapter), true);
  assert.equal(fs.existsSync(claudeAdapter), true);
  assert.equal(fs.existsSync(path.join(target, ".gemini", "skills")), false);

  const sharedMetadata = readSkillMetadata(sharedFile, "repo-cleanup");
  assert.deepEqual(
    readSkillMetadata(agentsAdapter, "repo-cleanup"),
    sharedMetadata
  );
  assert.deepEqual(
    readSkillMetadata(claudeAdapter, "repo-cleanup"),
    sharedMetadata
  );
  assert.match(read(target, path.relative(target, agentsAdapter)), /docs\/ai\/skills\/repo-cleanup\/SKILL\.md/);
  assert.match(read(target, path.relative(target, claudeAdapter)), /docs\/ai\/skills\/repo-cleanup\/SKILL\.md/);

  const claudeOnlyTarget = makeTarget(t);
  copyBlueprint({
    targetDir: claudeOnlyTarget,
    project: baseProject,
    providers: ["claude"],
    agents: [],
    skills: ["repo-cleanup"],
  });
  assert.equal(fs.existsSync(path.join(claudeOnlyTarget, ".agents")), false);
  assert.equal(
    fs.existsSync(
      path.join(
        claudeOnlyTarget,
        ".claude",
        "skills",
        "repo-cleanup",
        "SKILL.md"
      )
    ),
    true
  );
});

test("copies optional skill resources recursively", (t) => {
  const source = makeTarget(t);
  const target = makeTarget(t);
  const docsFolder = path.join(source, "docs", "ai");
  const skillFolder = path.join(docsFolder, "skills", "repo-cleanup");

  fs.mkdirSync(skillFolder, { recursive: true });
  fs.writeFileSync(path.join(source, "CHANGELOG.md"), "# Changelog\n");
  for (const file of ["changelog.md", "qa.md", "security.md"]) {
    fs.writeFileSync(path.join(docsFolder, file), `# ${file}\n`);
  }
  fs.writeFileSync(
    path.join(skillFolder, "SKILL.md"),
    "---\nname: repo-cleanup\ndescription: Clean a repository safely.\n---\n\nClean it.\n"
  );
  for (const [folder, file] of [
    ["references", "guide.md"],
    ["scripts", "check.js"],
    ["assets", "template.txt"],
  ]) {
    fs.mkdirSync(path.join(skillFolder, folder), { recursive: true });
    fs.writeFileSync(path.join(skillFolder, folder, file), `${folder}\n`);
  }

  copyBlueprint({
    targetDir: target,
    sourceDir: source,
    project: baseProject,
    providers: ["codex"],
    agents: [],
    skills: ["repo-cleanup"],
  });

  for (const [folder, file] of [
    ["references", "guide.md"],
    ["scripts", "check.js"],
    ["assets", "template.txt"],
  ]) {
    assert.equal(
      fs.existsSync(
        path.join(
          target,
          "docs",
          "ai",
          "skills",
          "repo-cleanup",
          folder,
          file
        )
      ),
      true
    );
  }
});

test("all mode installs every agent for every provider", (t) => {
  const target = makeTarget(t);

  copyBlueprint({ targetDir: target });

  for (const agent of Object.keys(agentCatalog)) {
    const sharedFile = path.join("docs", "ai", "agents", `${agent}.md`);
    assert.equal(fs.existsSync(path.join(target, sharedFile)), true);
    assert.equal(fs.existsSync(path.join(target, ".codex", "agents", `${agent}.toml`)), true);
    assert.equal(fs.existsSync(path.join(target, ".claude", "agents", `${agent}.md`)), true);
    assert.equal(fs.existsSync(path.join(target, ".gemini", "agents", `${agent}.md`)), true);

    const guidancePaths = [...read(target, sharedFile).matchAll(/`(docs\/ai\/[^`]+)`/g)];
    for (const [, guidancePath] of guidancePaths) {
      assert.equal(fs.existsSync(path.join(target, guidancePath)), true, guidancePath);
    }
  }

  for (const skill of Object.keys(skillCatalog)) {
    const sharedFile = path.join("docs", "ai", "skills", skill, "SKILL.md");
    assert.equal(fs.existsSync(path.join(target, sharedFile)), true);
    assert.equal(
      fs.existsSync(path.join(target, ".agents", "skills", skill, "SKILL.md")),
      true
    );
    assert.equal(
      fs.existsSync(path.join(target, ".claude", "skills", skill, "SKILL.md")),
      true
    );
  }

  assert.equal(fs.existsSync(path.join(target, ".gemini", "skills")), false);
  assert.match(read(target, "AGENTS.md"), /security-reviewer/);
});

test("agent files follow skip and force behavior", (t) => {
  const target = makeTarget(t);
  const relativeFile = path.join("docs", "ai", "agents", "planner.md");

  fs.mkdirSync(path.dirname(path.join(target, relativeFile)), { recursive: true });
  fs.writeFileSync(path.join(target, relativeFile), "custom instructions\n");

  const skipped = copyBlueprint({
    targetDir: target,
    project: baseProject,
    providers: ["codex"],
    agents: ["planner"],
  });
  assert.equal(read(target, relativeFile), "custom instructions\n");
  assert.ok(skipped.skipped.includes("docs/ai/agents/planner.md"));

  copyBlueprint({
    targetDir: target,
    project: baseProject,
    providers: ["codex"],
    agents: ["planner"],
    force: true,
  });
  assert.match(read(target, relativeFile), /# Planner Agent/);
});

test("skill files follow skip and force behavior", (t) => {
  const target = makeTarget(t);
  const relativeFile = path.join(
    "docs",
    "ai",
    "skills",
    "repo-cleanup",
    "SKILL.md"
  );
  const customSkill = `---
name: repo-cleanup
description: Custom cleanup instructions.
---

Keep this custom workflow.
`;

  fs.mkdirSync(path.dirname(path.join(target, relativeFile)), { recursive: true });
  fs.writeFileSync(path.join(target, relativeFile), customSkill);

  const skipped = copyBlueprint({
    targetDir: target,
    project: baseProject,
    providers: ["codex"],
    agents: [],
    skills: ["repo-cleanup"],
  });
  assert.equal(read(target, relativeFile), customSkill);
  assert.ok(skipped.skipped.includes("docs/ai/skills/repo-cleanup/SKILL.md"));
  assert.match(
    read(target, path.join(".agents", "skills", "repo-cleanup", "SKILL.md")),
    /Custom cleanup instructions\./
  );

  copyBlueprint({
    targetDir: target,
    project: baseProject,
    providers: ["codex"],
    agents: [],
    skills: ["repo-cleanup"],
    force: true,
  });
  assert.match(read(target, relativeFile), /# Repository Cleanup/);
  assert.doesNotMatch(
    read(target, path.join(".agents", "skills", "repo-cleanup", "SKILL.md")),
    /Custom cleanup instructions\./
  );
});
