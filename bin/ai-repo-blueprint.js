#!/usr/bin/env node
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { copyBlueprint, providerConfig } = require("../lib/copy-blueprint");
const { agentCatalog, getRecommendedAgents } = require("../lib/agents");
const { getRecommendedSkills, skillCatalog } = require("../lib/skills");

function parseArgs(argv) {
  const args = [...argv];
  const force = args.includes("--force");
  const all = args.includes("--all");
  const positionals = args.filter((arg) => !["--force", "--all"].includes(arg));

  if (positionals.length > 1) {
    throw new Error("Usage: ai-repo-blueprint [target-folder] [--force] [--all]");
  }

  return {
    all,
    force,
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const configuration = options.all ? {} : await collectProjectConfig(options.targetDir);
  const result = copyBlueprint({ ...options, ...configuration });

  for (const file of result.copied) {
    console.log(`copied ${file}`);
  }

  for (const file of result.skipped) {
    console.log(`skipped ${file}`);
  }

  console.log(`Done. Copied ${result.copied.length}, skipped ${result.skipped.length}.`);
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
