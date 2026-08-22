const fs = require("node:fs");
const path = require("node:path");
const {
  agentCatalog,
  getAdapterPath,
  renderAdapter,
  renderSharedAgentInstructions,
} = require("./agents");

const providerConfig = {
  codex: {
    instructionFile: "AGENTS.md",
    title: "AI Instructions",
    targetConfigFolder: ".codex",
  },
  claude: {
    instructionFile: "CLAUDE.md",
    title: "Claude Instructions",
    targetConfigFolder: ".claude",
  },
  gemini: {
    instructionFile: "GEMINI.md",
    title: "Gemini Instructions",
    targetConfigFolder: ".gemini",
  },
};

const alwaysDocs = ["changelog.md", "qa.md", "security.md"];

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function writeFile({ sourceFile, targetFile, displayPath, force, copied, skipped }) {
  if (fs.existsSync(targetFile) && !force) {
    skipped.push(displayPath);
    return;
  }

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.copyFileSync(sourceFile, targetFile);
  copied.push(displayPath);
}

function writeText({ targetFile, displayPath, content, force, copied, skipped }) {
  if (fs.existsSync(targetFile) && !force) {
    skipped.push(displayPath);
    return;
  }

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, content);
  copied.push(displayPath);
}

function renderInstructionFile(title, docs, agents = []) {
  const lines = docs.map((file) => `- \`docs/ai/${file}\``);
  const agentSection = agents.length
    ? `
## Specialized agents

Use these agents when their role fits the task:

${agents.map((agent) => `- \`${agent}\`: \`docs/ai/agents/${agent}.md\``).join("\n")}

Delegate independent work when it improves speed or quality. Do not let multiple write-enabled agents edit the same files in parallel.
`
    : "";

  return `# ${title}\n\nUse the project AI guidance in \`docs/ai/\`:\n\n${lines.join("\n")}\n${agentSection}`;
}

function renderProjectDoc(project) {
  return `# Project

## Overview

- Name: ${project.name}
- Type: ${project.type}
- Description: ${project.description}
`;
}

function renderDatabaseDoc(project) {
  return `# Database

- Provider: ${project.database.provider || "Not selected"}
- Database name: ${project.database.name || "Not selected"}
- Purpose: ${project.database.purpose || "Application data"}

## Rules

- Keep credentials in environment variables or a secret manager.
- Use migrations for schema changes.
- Document backup and restore requirements.
`;
}

function renderHostDoc(project) {
  return `# Host

- Platform: ${project.host.platform || "Not selected"}
- Environment: ${project.host.environment || "Not selected"}
- Public URL: ${project.host.url || "Not selected"}
- Region: ${project.host.region || "Not selected"}

## Operations

- Document how to deploy, view logs, restart, and check health.
- Do not write secret values in this file.
`;
}

function renderToolsDoc(project) {
  const list = (items) =>
    items.length ? items.map((item) => `  - ${item}`).join("\n") : "  - None selected";

  return `# Tools

Use these project tools when they are available.

## Tools

${list(project.tools)}

## MCPs

${list(project.mcps)}

## Plugins

${list(project.plugins)}

## Rules

- Do not install or enable a tool without user approval.
- If a required tool is unavailable, say so clearly.
- Do not store tool credentials in this file.
`;
}

function copyBlueprint({
  targetDir = process.cwd(),
  sourceDir = path.resolve(__dirname, ".."),
  force = false,
  project = null,
  selectedDocs = null,
  providers = null,
  agents = null,
} = {}) {
  const resolvedTarget = path.resolve(targetDir);

  if (!fs.existsSync(resolvedTarget)) {
    throw new Error(`Target folder does not exist: ${resolvedTarget}`);
  }

  if (!fs.statSync(resolvedTarget).isDirectory()) {
    throw new Error(`Target path is not a folder: ${resolvedTarget}`);
  }

  const copied = [];
  const skipped = [];
  const enabledAgents = agents ?? Object.keys(agentCatalog);
  const invalidAgents = enabledAgents.filter((agent) => !agentCatalog[agent]);

  if (invalidAgents.length) {
    throw new Error(`Unknown agent(s): ${invalidAgents.join(", ")}`);
  }

  function writeAgents(docs, enabledProviders) {
    for (const agentId of enabledAgents) {
      const relativeFile = path.join("docs", "ai", "agents", `${agentId}.md`);
      writeText({
        targetFile: path.join(resolvedTarget, relativeFile),
        displayPath: normalizeRelativePath(relativeFile),
        content: renderSharedAgentInstructions({
          sourceDir,
          agentId,
          availableDocs: docs,
        }),
        force,
        copied,
        skipped,
      });
    }

    for (const provider of enabledProviders) {
      const config = providerConfig[provider];
      if (!config) continue;

      for (const agentId of enabledAgents) {
        const relativeFile = getAdapterPath(provider, agentId);
        writeText({
          targetFile: path.join(resolvedTarget, relativeFile),
          displayPath: normalizeRelativePath(relativeFile),
          content: renderAdapter(provider, agentId),
          force,
          copied,
          skipped,
        });
      }
    }
  }

  if (!project) {
    const docs = fs
      .readdirSync(path.join(sourceDir, "docs/ai"), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);
    const enabledProviders = providers ?? Object.keys(providerConfig);

    for (const relativeFile of [
      "CHANGELOG.md",
      ...docs.map((file) => path.join("docs", "ai", file)),
    ]) {
      writeFile({
        sourceFile: path.join(sourceDir, relativeFile),
        targetFile: path.join(resolvedTarget, relativeFile),
        displayPath: normalizeRelativePath(relativeFile),
        force,
        copied,
        skipped,
      });
    }

    writeAgents(docs, enabledProviders);

    for (const provider of enabledProviders) {
      const config = providerConfig[provider];
      if (!config) continue;

      writeText({
        targetFile: path.join(resolvedTarget, config.instructionFile),
        displayPath: config.instructionFile,
        content: renderInstructionFile(config.title, docs, enabledAgents),
        force,
        copied,
        skipped,
      });

      fs.mkdirSync(path.join(resolvedTarget, config.targetConfigFolder), {
        recursive: true,
      });
    }

    return { copied, skipped };
  }

  const docs = [...new Set(["project.md", ...alwaysDocs, ...(selectedDocs || [])])];
  const enabledProviders = providers ?? Object.keys(providerConfig);

  writeFile({
    sourceFile: path.join(sourceDir, "CHANGELOG.md"),
    targetFile: path.join(resolvedTarget, "CHANGELOG.md"),
    displayPath: "CHANGELOG.md",
    force,
    copied,
    skipped,
  });

  for (const file of docs) {
    if (file === "project.md") {
      writeText({
        targetFile: path.join(resolvedTarget, "docs/ai/project.md"),
        displayPath: "docs/ai/project.md",
        content: renderProjectDoc(project),
        force,
        copied,
        skipped,
      });
      continue;
    }

    if (file === "database.md") {
      writeText({
        targetFile: path.join(resolvedTarget, "docs/ai/database.md"),
        displayPath: "docs/ai/database.md",
        content: renderDatabaseDoc(project),
        force,
        copied,
        skipped,
      });
      continue;
    }

    if (file === "host.md") {
      writeText({
        targetFile: path.join(resolvedTarget, "docs/ai/host.md"),
        displayPath: "docs/ai/host.md",
        content: renderHostDoc(project),
        force,
        copied,
        skipped,
      });
      continue;
    }

    if (file === "tools.md") {
      writeText({
        targetFile: path.join(resolvedTarget, "docs/ai/tools.md"),
        displayPath: "docs/ai/tools.md",
        content: renderToolsDoc(project),
        force,
        copied,
        skipped,
      });
      continue;
    }

    writeFile({
      sourceFile: path.join(sourceDir, "docs/ai", file),
      targetFile: path.join(resolvedTarget, "docs/ai", file),
      displayPath: `docs/ai/${file}`,
      force,
      copied,
      skipped,
    });
  }

  writeAgents(docs, enabledProviders);

  for (const provider of enabledProviders) {
    const config = providerConfig[provider];
    if (!config) continue;

    writeText({
      targetFile: path.join(resolvedTarget, config.instructionFile),
      displayPath: config.instructionFile,
      content: renderInstructionFile(config.title, docs, enabledAgents),
      force,
      copied,
      skipped,
    });

    fs.mkdirSync(path.join(resolvedTarget, config.targetConfigFolder), {
      recursive: true,
    });
  }

  return { copied, skipped };
}

module.exports = {
  copyBlueprint,
  providerConfig,
  renderInstructionFile,
};
