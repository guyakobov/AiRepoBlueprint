const fs = require("node:fs");
const path = require("node:path");

const coreAgentIds = [
  "planner",
  "implementer",
  "tester",
  "reviewer",
  "security-reviewer",
];

const agentCatalog = {
  planner: {
    description: "Plans complex changes after reading the project and its constraints.",
    access: "read-only",
    guidance: "all",
  },
  implementer: {
    description: "Implements approved changes and validates the affected behavior.",
    access: "workspace-write",
    guidance: "all",
  },
  tester: {
    description: "Creates and runs focused tests, then reports clear evidence.",
    access: "workspace-write",
    guidance: [
      "project.md",
      "qa.md",
      "security.md",
      "database.md",
      "responsive-ui.md",
      "design_style.md",
    ],
  },
  reviewer: {
    description: "Reviews changes for correctness, regressions, and missing tests.",
    access: "read-only",
    guidance: "all",
  },
  "security-reviewer": {
    description: "Reviews security, privacy, data handling, and trust boundaries.",
    access: "read-only",
    guidance: [
      "project.md",
      "security.md",
      "privacy-policy.md",
      "terms-of-service.md",
      "database.md",
      "tools.md",
    ],
  },
  "sql-expert": {
    description: "Designs and reviews schemas, SQL, migrations, and database performance.",
    access: "workspace-write",
    guidance: [
      "project.md",
      "database.md",
      "security.md",
      "qa.md",
      "changelog.md",
    ],
  },
  "frontend-expert": {
    description: "Builds accessible, responsive, and consistent user interfaces.",
    access: "workspace-write",
    guidance: [
      "project.md",
      "design_style.md",
      "responsive-ui.md",
      "privacy-policy.md",
      "terms-of-service.md",
      "security.md",
      "qa.md",
    ],
  },
  "backend-expert": {
    description: "Builds APIs, services, authentication, validation, and persistence.",
    access: "workspace-write",
    guidance: [
      "project.md",
      "database.md",
      "security.md",
      "privacy-policy.md",
      "tools.md",
      "qa.md",
    ],
  },
};

function getRecommendedAgents(project) {
  const recommended = [...coreAgentIds];
  const type = project?.type || "";
  const hasDatabase = Boolean(
    project?.database && Object.keys(project.database).length
  );

  if (hasDatabase) recommended.push("sql-expert");
  if (/website|app|web|mobile|client/i.test(type)) recommended.push("frontend-expert");
  if (/api|backend|service|data pipeline/i.test(type) || hasDatabase) {
    recommended.push("backend-expert");
  }

  return [...new Set(recommended)];
}

function getAgentGuidance(agentId, availableDocs) {
  const configured = agentCatalog[agentId]?.guidance;
  const candidates = configured === "all" ? availableDocs : configured || [];
  return candidates.filter((file) => availableDocs.includes(file));
}

function renderSharedAgentInstructions({ sourceDir, agentId, availableDocs }) {
  const sourceFile = path.join(sourceDir, "docs", "ai", "agents", `${agentId}.md`);
  const baseInstructions = fs.readFileSync(sourceFile, "utf8").trim();
  const guidance = getAgentGuidance(agentId, availableDocs);
  const guidanceLines = guidance.map((file) => `- \`docs/ai/${file}\``);

  return `${baseInstructions}

## Project AI guidance

Read and follow these files before working:

${guidanceLines.join("\n")}
`;
}

function renderAdapter(provider, agentId) {
  const agent = agentCatalog[agentId];
  const sourcePath = `docs/ai/agents/${agentId}.md`;
  const instruction = `Before starting work, read \`${sourcePath}\` and follow it as the source of truth for this role. If the file is unavailable, stop and report the problem.`;

  if (provider === "codex") {
    return `name = ${JSON.stringify(agentId)}
description = ${JSON.stringify(agent.description)}
sandbox_mode = ${JSON.stringify(agent.access === "read-only" ? "read-only" : "workspace-write")}
developer_instructions = ${JSON.stringify(instruction)}
`;
  }

  if (provider === "claude") {
    const tools = agent.access === "read-only"
      ? "Read, Glob, Grep, Bash"
      : "Read, Glob, Grep, Bash, Write, Edit";
    const permission = agent.access === "read-only" ? "\npermissionMode: plan" : "";

    return `---
name: ${agentId}
description: ${agent.description}
tools: ${tools}${permission}
---

${instruction}
`;
  }

  if (provider === "gemini") {
    const tools = agent.access === "read-only"
      ? ["read_file", "read_many_files", "list_directory", "glob", "grep_search"]
      : [
          "read_file",
          "read_many_files",
          "list_directory",
          "glob",
          "grep_search",
          "run_shell_command",
          "write_file",
          "replace",
        ];
    const toolLines = tools.map((tool) => `  - ${tool}`).join("\n");

    return `---
name: ${agentId}
description: ${agent.description}
kind: local
tools:
${toolLines}
---

${instruction}
`;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

function getAdapterPath(provider, agentId) {
  if (provider === "codex") return path.join(".codex", "agents", `${agentId}.toml`);
  if (provider === "claude") return path.join(".claude", "agents", `${agentId}.md`);
  if (provider === "gemini") return path.join(".gemini", "agents", `${agentId}.md`);
  throw new Error(`Unsupported provider: ${provider}`);
}

module.exports = {
  agentCatalog,
  coreAgentIds,
  getAdapterPath,
  getAgentGuidance,
  getRecommendedAgents,
  renderAdapter,
  renderSharedAgentInstructions,
};
