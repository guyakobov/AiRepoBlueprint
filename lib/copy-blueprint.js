const fs = require("node:fs");
const path = require("node:path");

const blueprintEntries = [
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  "CHANGELOG.md",
  "docs/ai",
  "llm_config",
];

function listFiles(baseDir, relativePath) {
  const fullPath = path.join(baseDir, relativePath);
  const stat = fs.statSync(fullPath);

  if (stat.isFile()) {
    return [relativePath];
  }

  return fs.readdirSync(fullPath).flatMap((name) => {
    const childRelativePath = path.join(relativePath, name);
    return listFiles(baseDir, childRelativePath);
  });
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function copyBlueprint({ targetDir = process.cwd(), sourceDir = path.resolve(__dirname, ".."), force = false } = {}) {
  const resolvedTarget = path.resolve(targetDir);

  if (!fs.existsSync(resolvedTarget)) {
    throw new Error(`Target folder does not exist: ${resolvedTarget}`);
  }

  if (!fs.statSync(resolvedTarget).isDirectory()) {
    throw new Error(`Target path is not a folder: ${resolvedTarget}`);
  }

  const copied = [];
  const skipped = [];
  const files = blueprintEntries.flatMap((entry) => listFiles(sourceDir, entry));

  for (const relativeFile of files) {
    const sourceFile = path.join(sourceDir, relativeFile);
    const targetFile = path.join(resolvedTarget, relativeFile);
    const displayPath = normalizeRelativePath(relativeFile);

    if (fs.existsSync(targetFile) && !force) {
      skipped.push(displayPath);
      continue;
    }

    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.copyFileSync(sourceFile, targetFile);
    copied.push(displayPath);
  }

  return { copied, skipped };
}

module.exports = {
  blueprintEntries,
  copyBlueprint,
};
