const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { agentCatalog } = require("./agents");
const { copyBlueprint, providerConfig } = require("./copy-blueprint");
const { skillCatalog } = require("./skills");
const { version: packageVersion } = require("../package.json");

const STATE_FILE = ".ai-repo-blueprint.json";
const SCHEMA_VERSION = 1;

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function hashFile(file) {
  return hashContent(fs.readFileSync(file));
}

function validateManagedPath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const segments = normalized.split("/");

  if (
    !normalized ||
    path.isAbsolute(relativePath) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe managed file path: ${relativePath}`);
  }

  return segments;
}

function resolveTargetPath(targetDir, relativePath) {
  const segments = validateManagedPath(relativePath);

  const resolvedTarget = path.resolve(targetDir);
  const resolvedFile = path.resolve(resolvedTarget, ...segments);
  const prefix = `${resolvedTarget}${path.sep}`;

  if (!resolvedFile.startsWith(prefix)) {
    throw new Error(`Managed file escapes the target folder: ${relativePath}`);
  }

  let current = resolvedTarget;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) continue;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Managed file path contains a symbolic link: ${relativePath}`);
    }
  }

  return resolvedFile;
}

function validateStringList(value, field, allowed = null) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid ${field} in ${STATE_FILE}`);
  }

  if (allowed) {
    const invalid = value.filter((item) => !allowed.includes(item));
    if (invalid.length) throw new Error(`Unknown ${field}: ${invalid.join(", ")}`);
  }
}

function validateConfiguration(configuration, { allowUnavailable = false } = {}) {
  if (!configuration || !["all", "custom"].includes(configuration.mode)) {
    throw new Error(`Invalid configuration mode in ${STATE_FILE}`);
  }

  if (configuration.mode === "all") return;

  if (
    !configuration.project ||
    typeof configuration.project !== "object" ||
    Array.isArray(configuration.project)
  ) {
    throw new Error(`Missing project configuration in ${STATE_FILE}`);
  }

  validateStringList(
    configuration.providers,
    "providers",
    allowUnavailable ? null : Object.keys(providerConfig)
  );
  validateStringList(
    configuration.agents,
    "agents",
    allowUnavailable ? null : Object.keys(agentCatalog)
  );
  validateStringList(
    configuration.skills,
    "skills",
    allowUnavailable ? null : Object.keys(skillCatalog)
  );
  validateStringList(configuration.selectedDocs, "selectedDocs");

  for (const file of configuration.selectedDocs) {
    if (!/^[A-Za-z0-9_-]+\.md$/.test(file)) {
      throw new Error(`Unsafe selected document name: ${file}`);
    }
  }
}

function validateState(state) {
  if (!state || state.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported or missing schemaVersion in ${STATE_FILE}`);
  }

  if (typeof state.blueprintVersion !== "string") {
    throw new Error(`Invalid blueprintVersion in ${STATE_FILE}`);
  }

  validateConfiguration(state.configuration, { allowUnavailable: true });

  if (
    !state.managedFiles ||
    typeof state.managedFiles !== "object" ||
    Array.isArray(state.managedFiles)
  ) {
    throw new Error(`Invalid managedFiles in ${STATE_FILE}`);
  }

  for (const [relativePath, hash] of Object.entries(state.managedFiles)) {
    validateManagedPath(relativePath);
    if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`Invalid managed file hash for ${relativePath}`);
    }
  }

  if (
    !Array.isArray(state.conflicts) ||
    state.conflicts.some((relativePath) => typeof relativePath !== "string")
  ) {
    throw new Error(`Invalid conflicts in ${STATE_FILE}`);
  }
  for (const relativePath of state.conflicts) validateManagedPath(relativePath);
}

function readState(targetDir) {
  const stateFile = resolveTargetPath(targetDir, STATE_FILE);
  if (!fs.existsSync(stateFile)) {
    throw new Error(
      `${STATE_FILE} was not found. Run ai-repo-blueprint init first.`
    );
  }

  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  validateState(state);

  for (const relativePath of Object.keys(state.managedFiles)) {
    resolveTargetPath(targetDir, relativePath);
  }

  return state;
}

function writeState(targetDir, state) {
  const stateFile = resolveTargetPath(targetDir, STATE_FILE);
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
}

function normalizeConfiguration(configuration, sourceDir) {
  validateConfiguration(configuration, { allowUnavailable: true });

  if (configuration.mode === "all") return { mode: "all" };

  const generatedDocs = new Set(["database.md", "host.md", "tools.md"]);
  const selectedDocs = configuration.selectedDocs.filter(
    (file) =>
      generatedDocs.has(file) || fs.existsSync(path.join(sourceDir, "docs", "ai", file))
  );

  return {
    ...configuration,
    selectedDocs,
    providers: configuration.providers.filter((provider) => providerConfig[provider]),
    agents: configuration.agents.filter((agent) => agentCatalog[agent]),
    skills: configuration.skills.filter((skill) => skillCatalog[skill]),
  };
}

function toCopyOptions(configuration) {
  validateConfiguration(configuration);

  if (configuration.mode === "all") return {};

  return {
    project: configuration.project,
    selectedDocs: configuration.selectedDocs,
    providers: configuration.providers,
    agents: configuration.agents,
    skills: configuration.skills,
  };
}

function renderBlueprint({ sourceDir, configuration }) {
  const renderDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-repo-blueprint-render-"));

  try {
    const normalizedConfiguration = normalizeConfiguration(configuration, sourceDir);
    const result = copyBlueprint({
      targetDir: renderDir,
      sourceDir,
      force: true,
      ...toCopyOptions(normalizedConfiguration),
    });
    const files = new Map();

    for (const relativePath of result.copied) {
      const normalized = normalizeRelativePath(relativePath);
      const renderedFile = path.join(renderDir, ...normalized.split("/"));

      if (!fs.existsSync(renderedFile) || !fs.statSync(renderedFile).isFile()) continue;

      const content = fs.readFileSync(renderedFile);
      files.set(normalized, {
        content,
        hash: hashContent(content),
        mode: fs.statSync(renderedFile).mode,
      });
    }

    return files;
  } finally {
    fs.rmSync(renderDir, { recursive: true, force: true });
  }
}

function getProviders(configuration) {
  return configuration.mode === "all"
    ? Object.keys(providerConfig)
    : configuration.providers;
}

function ensureProviderFolders(targetDir, configuration) {
  for (const provider of getProviders(configuration)) {
    fs.mkdirSync(
      path.join(targetDir, providerConfig[provider].targetConfigFolder),
      { recursive: true }
    );
  }
}

function analyzeBlueprint({ targetDir, state, expectedFiles }) {
  const analysis = {
    create: [],
    update: [],
    unchanged: [],
    conflicts: [],
    obsolete: [],
    missingObsolete: [],
  };

  for (const [relativePath, expected] of expectedFiles) {
    const targetFile = resolveTargetPath(targetDir, relativePath);
    const previousHash = state?.managedFiles?.[relativePath];

    if (!fs.existsSync(targetFile)) {
      analysis.create.push(relativePath);
      continue;
    }

    if (!fs.statSync(targetFile).isFile()) {
      analysis.conflicts.push(relativePath);
      continue;
    }

    const currentHash = hashFile(targetFile);
    if (currentHash === expected.hash) {
      analysis.unchanged.push(relativePath);
    } else if (previousHash && currentHash === previousHash) {
      analysis.update.push(relativePath);
    } else {
      analysis.conflicts.push(relativePath);
    }
  }

  for (const relativePath of Object.keys(state?.managedFiles || {})) {
    if (expectedFiles.has(relativePath)) continue;

    const targetFile = resolveTargetPath(targetDir, relativePath);
    if (fs.existsSync(targetFile)) analysis.obsolete.push(relativePath);
    else analysis.missingObsolete.push(relativePath);
  }

  return analysis;
}

function writeExpectedFile(targetDir, relativePath, expected) {
  const targetFile = resolveTargetPath(targetDir, relativePath);
  if (fs.existsSync(targetFile) && !fs.statSync(targetFile).isFile()) {
    throw new Error(`Cannot replace non-file path: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, expected.content);
  fs.chmodSync(targetFile, expected.mode);
}

function makeState({ blueprintVersion, configuration, managedFiles, conflicts }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    blueprintVersion,
    configuration,
    managedFiles: Object.fromEntries(
      Object.entries(managedFiles).sort(([left], [right]) => left.localeCompare(right))
    ),
    conflicts: [...new Set(conflicts)].sort(),
  };
}

function initializeBlueprint({
  targetDir = process.cwd(),
  sourceDir = path.resolve(__dirname, ".."),
  configuration,
  force = false,
  blueprintVersion = packageVersion,
} = {}) {
  const resolvedTarget = path.resolve(targetDir);
  const stateFile = resolveTargetPath(resolvedTarget, STATE_FILE);

  if (!fs.existsSync(resolvedTarget) || !fs.statSync(resolvedTarget).isDirectory()) {
    throw new Error(`Target folder does not exist: ${resolvedTarget}`);
  }

  if (fs.existsSync(stateFile)) {
    throw new Error(`${STATE_FILE} already exists. Run ai-repo-blueprint update instead.`);
  }

  validateConfiguration(configuration);
  const expectedFiles = renderBlueprint({ sourceDir, configuration });
  const analysis = analyzeBlueprint({
    targetDir: resolvedTarget,
    state: null,
    expectedFiles,
  });
  const managedFiles = {};
  const created = [];
  const adopted = [];
  const skipped = [];

  for (const relativePath of analysis.create) {
    const expected = expectedFiles.get(relativePath);
    writeExpectedFile(resolvedTarget, relativePath, expected);
    managedFiles[relativePath] = expected.hash;
    created.push(relativePath);
  }

  for (const relativePath of analysis.unchanged) {
    managedFiles[relativePath] = expectedFiles.get(relativePath).hash;
    adopted.push(relativePath);
  }

  for (const relativePath of analysis.conflicts) {
    if (force) {
      const expected = expectedFiles.get(relativePath);
      writeExpectedFile(resolvedTarget, relativePath, expected);
      managedFiles[relativePath] = expected.hash;
      created.push(relativePath);
    } else {
      skipped.push(relativePath);
    }
  }

  ensureProviderFolders(resolvedTarget, configuration);
  writeState(
    resolvedTarget,
    makeState({
      blueprintVersion,
      configuration,
      managedFiles,
      conflicts: skipped,
    })
  );

  return { created, adopted, skipped, stateFile: STATE_FILE };
}

function checkBlueprint({
  targetDir = process.cwd(),
  sourceDir = path.resolve(__dirname, ".."),
  blueprintVersion = packageVersion,
} = {}) {
  const resolvedTarget = path.resolve(targetDir);
  const state = readState(resolvedTarget);
  const configuration = normalizeConfiguration(state.configuration, sourceDir);
  const expectedFiles = renderBlueprint({
    sourceDir,
    configuration,
  });
  const analysis = analyzeBlueprint({
    targetDir: resolvedTarget,
    state,
    expectedFiles,
  });
  const current =
    state.blueprintVersion === blueprintVersion &&
    analysis.create.length === 0 &&
    analysis.update.length === 0 &&
    analysis.conflicts.length === 0 &&
    analysis.obsolete.length === 0;

  return {
    current,
    installedVersion: state.blueprintVersion,
    availableVersion: blueprintVersion,
    ...analysis,
  };
}

function updateBlueprint({
  targetDir = process.cwd(),
  sourceDir = path.resolve(__dirname, ".."),
  force = false,
  prune = false,
  blueprintVersion = packageVersion,
} = {}) {
  const resolvedTarget = path.resolve(targetDir);
  const state = readState(resolvedTarget);
  const configuration = normalizeConfiguration(state.configuration, sourceDir);
  const expectedFiles = renderBlueprint({
    sourceDir,
    configuration,
  });
  const analysis = analyzeBlueprint({
    targetDir: resolvedTarget,
    state,
    expectedFiles,
  });
  const managedFiles = {};
  const created = [];
  const updated = [];
  const skipped = [];
  const removed = [];
  const obsolete = [];

  for (const relativePath of analysis.unchanged) {
    managedFiles[relativePath] = expectedFiles.get(relativePath).hash;
  }

  for (const relativePath of analysis.create) {
    const expected = expectedFiles.get(relativePath);
    writeExpectedFile(resolvedTarget, relativePath, expected);
    managedFiles[relativePath] = expected.hash;
    created.push(relativePath);
  }

  for (const relativePath of analysis.update) {
    const expected = expectedFiles.get(relativePath);
    writeExpectedFile(resolvedTarget, relativePath, expected);
    managedFiles[relativePath] = expected.hash;
    updated.push(relativePath);
  }

  for (const relativePath of analysis.conflicts) {
    if (force) {
      const expected = expectedFiles.get(relativePath);
      writeExpectedFile(resolvedTarget, relativePath, expected);
      managedFiles[relativePath] = expected.hash;
      updated.push(relativePath);
    } else {
      if (state.managedFiles[relativePath]) {
        managedFiles[relativePath] = state.managedFiles[relativePath];
      }
      skipped.push(relativePath);
    }
  }

  for (const relativePath of analysis.obsolete) {
    const targetFile = resolveTargetPath(resolvedTarget, relativePath);
    const isFile = fs.statSync(targetFile).isFile();
    const unchanged =
      isFile && hashFile(targetFile) === state.managedFiles[relativePath];

    if (prune && (unchanged || force)) {
      if (!isFile) {
        managedFiles[relativePath] = state.managedFiles[relativePath];
        skipped.push(relativePath);
        continue;
      }
      fs.rmSync(targetFile, { force: true });
      removed.push(relativePath);
    } else {
      managedFiles[relativePath] = state.managedFiles[relativePath];
      obsolete.push(relativePath);
      if (prune && !unchanged) skipped.push(relativePath);
    }
  }

  ensureProviderFolders(resolvedTarget, configuration);
  writeState(
    resolvedTarget,
    makeState({
      blueprintVersion,
      configuration,
      managedFiles,
      conflicts: skipped,
    })
  );

  return {
    previousVersion: state.blueprintVersion,
    blueprintVersion,
    created,
    updated,
    skipped,
    obsolete,
    removed,
  };
}

module.exports = {
  SCHEMA_VERSION,
  STATE_FILE,
  checkBlueprint,
  hashContent,
  initializeBlueprint,
  readState,
  renderBlueprint,
  updateBlueprint,
};
