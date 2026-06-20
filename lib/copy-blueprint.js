const fs = require("node:fs");
const path = require("node:path");

const providerConfig = {
  codex: {
    instructionFile: "AGENTS.md",
    instructionTemplate: "llm_config/codex/AGENTS.md",
    title: "AI Instructions",
    configFolder: "llm_config/codex/.agents",
    targetConfigFolder: ".agents",
  },
  claude: {
    instructionFile: "CLAUDE.md",
    instructionTemplate: "llm_config/claude/CLAUDE.md",
    title: "Claude Instructions",
    configFolder: "llm_config/claude/.claude",
    targetConfigFolder: ".claude",
  },
  gemini: {
    instructionFile: "GEMINI.md",
    instructionTemplate: "llm_config/gemini/GEMINI.md",
    title: "Gemini Instructions",
    configFolder: "llm_config/gemini/.gemini",
    targetConfigFolder: ".gemini",
  },
};

const alwaysDocs = ["changelog.md", "qa.md", "security.md"];

function listFiles(baseDir, relativePath) {
  const fullPath = path.join(baseDir, relativePath);
  const stat = fs.statSync(fullPath);

  if (stat.isFile()) {
    return [relativePath];
  }

  return fs.readdirSync(fullPath).flatMap((name) =>
    listFiles(baseDir, path.join(relativePath, name))
  );
}

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

function renderInstructionFile(title, docs, provider) {
  const lines = docs.map((file) => `- \`docs/ai/${file}\``);
  const providerNote =
    provider === "claude"
      ? "\nClaude-specific files live in `.claude/`.\n"
      : "";

  return `# ${title}\n\nUse the project AI guidance in \`docs/ai/\`:\n\n${lines.join("\n")}\n${providerNote}`;
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

  if (!project) {
    const entries = ["CHANGELOG.md", "docs/ai"];

    for (const relativeFile of entries.flatMap((entry) => listFiles(sourceDir, entry))) {
      writeFile({
        sourceFile: path.join(sourceDir, relativeFile),
        targetFile: path.join(resolvedTarget, relativeFile),
        displayPath: normalizeRelativePath(relativeFile),
        force,
        copied,
        skipped,
      });
    }

    for (const config of Object.values(providerConfig)) {
      writeFile({
        sourceFile: path.join(sourceDir, config.instructionTemplate),
        targetFile: path.join(resolvedTarget, config.instructionFile),
        displayPath: config.instructionFile,
        force,
        copied,
        skipped,
      });

      for (const relativeFile of listFiles(sourceDir, config.configFolder)) {
        const configRelativeFile = path.relative(config.configFolder, relativeFile);
        const targetRelativeFile = path.join(config.targetConfigFolder, configRelativeFile);

        writeFile({
          sourceFile: path.join(sourceDir, relativeFile),
          targetFile: path.join(resolvedTarget, targetRelativeFile),
          displayPath: normalizeRelativePath(targetRelativeFile),
          force,
          copied,
          skipped,
        });
      }
    }

    return { copied, skipped };
  }

  const docs = [...new Set(["project.md", ...alwaysDocs, ...(selectedDocs || [])])];
  const enabledProviders = providers?.length ? providers : Object.keys(providerConfig);

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

  for (const provider of enabledProviders) {
    const config = providerConfig[provider];
    if (!config) continue;

    writeText({
      targetFile: path.join(resolvedTarget, config.instructionFile),
      displayPath: config.instructionFile,
      content: renderInstructionFile(config.title, docs, provider),
      force,
      copied,
      skipped,
    });

    for (const relativeFile of listFiles(sourceDir, config.configFolder)) {
      const configRelativeFile = path.relative(config.configFolder, relativeFile);
      const targetRelativeFile = path.join(config.targetConfigFolder, configRelativeFile);

      writeFile({
        sourceFile: path.join(sourceDir, relativeFile),
        targetFile: path.join(resolvedTarget, targetRelativeFile),
        displayPath: normalizeRelativePath(targetRelativeFile),
        force,
        copied,
        skipped,
      });
    }
  }

  return { copied, skipped };
}

module.exports = {
  copyBlueprint,
  providerConfig,
};
