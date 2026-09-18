const fs = require("node:fs");
const path = require("node:path");

const recommendedSkillIds = ["repo-cleanup"];

const skillCatalog = Object.fromEntries(
  recommendedSkillIds.map((skillId) => [skillId, { recommended: true }])
);

function parseScalar(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error(`Invalid quoted frontmatter value: ${trimmed}`);
    }
  }

  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  return trimmed;
}

function parseSkillMetadata(content, skillFile = "SKILL.md") {
  const match = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    throw new Error(`Missing YAML frontmatter in ${skillFile}`);
  }

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (field) fields[field[1]] = parseScalar(field[2]);
  }

  const name = fields.name;
  const description = fields.description;

  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) {
    throw new Error(`Invalid or missing skill name in ${skillFile}`);
  }

  if (!description || description.length > 1024) {
    throw new Error(`Invalid or missing skill description in ${skillFile}`);
  }

  return { name, description };
}

function readSkillMetadata(skillFile, expectedName = null) {
  const metadata = parseSkillMetadata(fs.readFileSync(skillFile, "utf8"), skillFile);

  if (expectedName && metadata.name !== expectedName) {
    throw new Error(
      `Skill name ${JSON.stringify(metadata.name)} does not match folder ${JSON.stringify(expectedName)}`
    );
  }

  return metadata;
}

function getRecommendedSkills() {
  return [...recommendedSkillIds];
}

function getSkillSourcePath(sourceDir, skillId) {
  return path.join(sourceDir, "docs", "ai", "skills", skillId);
}

function getSkillAdapterPaths(providers, skillId) {
  const adapterPaths = [];

  if (providers.some((provider) => provider === "codex" || provider === "gemini")) {
    adapterPaths.push(path.join(".agents", "skills", skillId, "SKILL.md"));
  }

  if (providers.includes("claude")) {
    adapterPaths.push(path.join(".claude", "skills", skillId, "SKILL.md"));
  }

  return adapterPaths;
}

function renderSkillAdapter(skillId, metadata) {
  const sourcePath = `docs/ai/skills/${skillId}/SKILL.md`;
  const sourceFolder = `docs/ai/skills/${skillId}/`;

  return `---
name: ${metadata.name}
description: ${JSON.stringify(metadata.description)}
---

Before starting work, read \`${sourcePath}\` and follow it as the source of truth for this skill. Resolve its relative references from \`${sourceFolder}\`. If the source file is unavailable, stop and report the problem.
`;
}

module.exports = {
  getRecommendedSkills,
  getSkillAdapterPaths,
  getSkillSourcePath,
  parseSkillMetadata,
  readSkillMetadata,
  recommendedSkillIds,
  renderSkillAdapter,
  skillCatalog,
};
