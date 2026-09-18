#!/usr/bin/env node
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { providerConfig } = require("../lib/copy-blueprint");
const { agentCatalog, getRecommendedAgents } = require("../lib/agents");
const { getRecommendedSkills, skillCatalog } = require("../lib/skills");
const {
  checkBlueprint,
  initializeBlueprint,
  updateBlueprint,
} = require("../lib/managed-blueprint");

const commands = ["init", "check", "update"];

function parseArgs(argv) {
  const args = [...argv];
  const command = commands.includes(args[0]) ? args.shift() : "init";
  const options = {
    all: false,
    force: false,
    prune: false,
  };
  const positionals = [];

  for (const arg of args) {
    if (arg === "--all") options.all = true;
    else if (arg === "--force") options.force = true;
    else if (arg === "--prune") options.prune = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else positionals.push(arg);
  }

  if (positionals.length > 1) {
    throw new Error(
      "Usage: ai-repo-blueprint [init|check|update] [target-folder] [options]"
    );
  }

  if (command !== "init" && options.all) {
    throw new Error("--all can only be used with init");
  }
  if (command !== "update" && options.prune) {
    throw new Error("--prune can only be used with update");
  }
  if (command === "check" && options.force) {
    throw new Error("--force cannot be used with check");
  }

  return {
    command,
    ...options,
    targetDir: positionals[0] ? path.resolve(positionals[0]) : process.cwd(),
  };
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAgentSelection(value, recommendedAgents) {
  const requested = splitList(value).map((agent) => agent.toLowerCase());

  if (requested.length === 1 && requested[0] === "all") {
    return Object.keys(agentCatalog);
  }

  if (requested.length === 1 && requested[0] === "none") {
    return [];
  }

  if (requested.length === 1 && requested[0] === "recommended") {
    return [...recommendedAgents];
  }

  const specialValues = requested.filter((agent) =>
    ["all", "none", "recommended"].includes(agent)
  );
  const invalidAgents = requested.filter((agent) => !agentCatalog[agent]);

  if (!requested.length || specialValues.length || invalidAgents.length) {
    throw new Error("Invalid agent selection");
  }

  return [...new Set(requested)];
}

function parseSkillSelection(value, recommendedSkills) {
  const requested = splitList(value).map((skill) => skill.toLowerCase());

  if (requested.length === 1 && requested[0] === "all") {
    return Object.keys(skillCatalog);
  }

  if (requested.length === 1 && requested[0] === "none") {
    return [];
  }

  if (requested.length === 1 && requested[0] === "recommended") {
    return [...recommendedSkills];
  }

  const specialValues = requested.filter((skill) =>
    ["all", "none", "recommended"].includes(skill)
  );
  const invalidSkills = requested.filter((skill) => !skillCatalog[skill]);

  if (!requested.length || specialValues.length || invalidSkills.length) {
    throw new Error("Invalid skill selection");
  }

  return [...new Set(requested)];
}

async function askText(rl, question, defaultValue = "") {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || defaultValue;
}

async function askYesNo(rl, question, defaultValue = true) {
  const hint = defaultValue ? "Y/n" : "y/N";
  const answer = (await rl.question(`${question} [${hint}]: `)).trim().toLowerCase();

  if (!answer) return defaultValue;
  return ["y", "yes"].includes(answer);
}

async function askProviders(rl) {
  const validProviders = Object.keys(providerConfig);

  while (true) {
    const answer = await askText(
      rl,
      "Which LLM tool(s) do you use? Choose codex, claude, gemini, or comma separated"
    );
    const requestedProviders = splitList(answer).map((provider) => provider.toLowerCase());
    const providers = [...new Set(
      requestedProviders.filter((provider) => providerConfig[provider])
    )];
    const invalidProviders = requestedProviders.filter(
      (provider) => !validProviders.includes(provider)
    );

    if (providers.length && !invalidProviders.length) {
      return providers;
    }

    console.log("Enter at least one valid tool: codex, claude, or gemini.");
  }
}

async function askAgents(rl, project) {
  const agentNames = Object.keys(agentCatalog).join(", ");
  const recommendedAgents = getRecommendedAgents(project);

  console.log(`Available agents: ${agentNames}`);
  console.log(`Recommended: ${recommendedAgents.join(", ")}`);

  while (true) {
    const answer = await askText(
      rl,
      "Which agents should be installed? Use recommended, all, none, or comma separated names",
      "recommended"
    );

    try {
      return parseAgentSelection(answer, recommendedAgents);
    } catch {
      console.log("Enter recommended, all, none, or valid comma separated agent names.");
    }
  }
}

async function askSkills(rl) {
  const skillNames = Object.keys(skillCatalog).join(", ");
  const recommendedSkills = getRecommendedSkills();

  console.log(`Available skills: ${skillNames}`);
  console.log(`Recommended: ${recommendedSkills.join(", ")}`);

  while (true) {
    const answer = await askText(
      rl,
      "Which skills should be installed? Use recommended, all, none, or comma separated names",
      "recommended"
    );

    try {
      return parseSkillSelection(answer, recommendedSkills);
    } catch {
      console.log("Enter recommended, all, none, or valid comma separated skill names.");
    }
  }
}

async function collectProjectConfig(targetDir) {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    const name = await askText(rl, "Project name", path.basename(targetDir));
    const description = await askText(rl, "What is this project about?");
    const type = await askText(
      rl,
      "Project type (website, app, API, library, data pipeline, other)",
      "website"
    );

    const needsDatabase = await askYesNo(rl, "Does this project need a database?", false);
    const database = needsDatabase
      ? {
          provider: await askText(rl, "Database provider (Postgres, MySQL, etc.)"),
          name: await askText(rl, "Database name"),
          purpose: await askText(rl, "What will the database store?", "Application data"),
      }
      : {};

    const tools = splitList(await askText(rl, "Tools to use, comma separated (optional)"));
    const mcps = splitList(await askText(rl, "MCPs to use, comma separated (optional)"));
    const plugins = splitList(await askText(rl, "Plugins to use, comma separated (optional)"));

    const isUserFacing = /website|app|web|mobile/i.test(type);
    const responsive = await askYesNo(
      rl,
      "Does this project need responsive UI guidance?",
      isUserFacing
    );
    const privacy = await askYesNo(
      rl,
      "Does this project need a privacy policy?",
      isUserFacing
    );
    const terms = await askYesNo(
      rl,
      "Does this project need terms of service?",
      isUserFacing
    );

    const providers = await askProviders(rl);

    const selectedDocs = [];
    if (needsDatabase) selectedDocs.push("database.md");
    if (tools.length || mcps.length || plugins.length) selectedDocs.push("tools.md");
    if (responsive) selectedDocs.push("responsive-ui.md", "design_style.md");
    if (privacy) selectedDocs.push("privacy-policy.md");
    if (terms) selectedDocs.push("terms-of-service.md");

    const project = {
      name,
      description: description || "Not provided",
      type,
      database,
      tools,
      mcps,
      plugins,
    };
    const agents = await askAgents(rl, project);
    const skills = await askSkills(rl);

    return {
      project,
      providers,
      selectedDocs,
      agents,
      skills,
    };
  } finally {
    rl.close();
  }
}

function printPaths(label, paths) {
  for (const file of paths) console.log(`${label} ${file}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === "init") {
    const configuration = options.all
      ? { mode: "all" }
      : { mode: "custom", ...(await collectProjectConfig(options.targetDir)) };
    const result = initializeBlueprint({
      targetDir: options.targetDir,
      configuration,
      force: options.force,
    });

    printPaths("created", result.created);
    printPaths("adopted", result.adopted);
    printPaths("skipped", result.skipped);
    console.log(`created ${result.stateFile}`);
    return;
  }

  if (options.command === "check") {
    const result = checkBlueprint({ targetDir: options.targetDir });
    console.log(
      `Blueprint ${result.installedVersion} -> ${result.availableVersion}`
    );
    printPaths("create", result.create);
    printPaths("update", result.update);
    printPaths("conflict", result.conflicts);
    printPaths("obsolete", result.obsolete);
    console.log(result.current ? "Blueprint is current." : "Blueprint update is needed.");
    if (!result.current) process.exitCode = 1;
    return;
  }

  const result = updateBlueprint({
    targetDir: options.targetDir,
    force: options.force,
    prune: options.prune,
  });
  printPaths("created", result.created);
  printPaths("updated", result.updated);
  printPaths("skipped", result.skipped);
  printPaths("obsolete", result.obsolete);
  printPaths("removed", result.removed);
  console.log(`Blueprint ${result.previousVersion} -> ${result.blueprintVersion}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  askAgents,
  askSkills,
  collectProjectConfig,
  main,
  parseAgentSelection,
  parseArgs,
  parseSkillSelection,
  splitList,
};
