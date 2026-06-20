#!/usr/bin/env node
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { copyBlueprint, providerConfig } = require("../lib/copy-blueprint");

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
    const requirements = await askText(rl, "Main requirements (optional)");

    const needsDatabase = await askYesNo(rl, "Does this project need a database?", false);
    const database = needsDatabase
      ? {
          provider: await askText(rl, "Database provider (Postgres, MySQL, etc.)"),
          name: await askText(rl, "Database name"),
          purpose: await askText(rl, "What will the database store?", "Application data"),
        }
      : {};

    const needsHost = await askYesNo(rl, "Will this project be hosted or deployed?", true);
    const host = needsHost
      ? {
          platform: await askText(rl, "Hosting platform (Vercel, AWS, GCP, etc.)"),
          environment: await askText(rl, "Environment", "production"),
          url: await askText(rl, "Public URL (optional)"),
          region: await askText(rl, "Hosting region (optional)"),
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

    const providerAnswer = await askText(
      rl,
      "AI providers to configure, comma separated",
      "codex, claude, gemini"
    );
    const providers = splitList(providerAnswer)
      .map((provider) => provider.toLowerCase())
      .filter((provider) => providerConfig[provider]);

    const selectedDocs = [];
    if (needsDatabase) selectedDocs.push("database.md");
    if (needsHost) selectedDocs.push("host.md", "deploy-to-production.md");
    if (tools.length || mcps.length || plugins.length) selectedDocs.push("tools.md");
    if (responsive) selectedDocs.push("responsive-ui.md");
    if (privacy) selectedDocs.push("privacy-policy.md");
    if (terms) selectedDocs.push("terms-of-service.md");

    return {
      project: {
        name,
        description: description || "Not provided",
        type,
        requirements: requirements ? `- ${requirements}` : "",
        database,
        host,
        tools,
        mcps,
        plugins,
      },
      providers,
      selectedDocs,
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

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
