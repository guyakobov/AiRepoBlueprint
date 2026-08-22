const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { parseAgentSelection } = require("../bin/ai-repo-blueprint");
const { copyBlueprint } = require("../lib/copy-blueprint");
const { agentCatalog, coreAgentIds, getRecommendedAgents } = require("../lib/agents");

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
  });

  assert.equal(fs.existsSync(path.join(target, ".codex")), true);
  assert.equal(fs.existsSync(path.join(target, ".claude")), false);
  assert.equal(fs.existsSync(path.join(target, "docs", "ai", "agents")), false);
  assert.doesNotMatch(read(target, "AGENTS.md"), /Specialized agents/);
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

  assert.equal(fs.existsSync(path.join(target, ".agents")), false);
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
