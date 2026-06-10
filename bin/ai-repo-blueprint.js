#!/usr/bin/env node
const path = require("node:path");
const { copyBlueprint } = require("../lib/copy-blueprint");

function parseArgs(argv) {
  const args = [...argv];
  const forceIndex = args.indexOf("--force");
  const force = forceIndex !== -1;

  if (force) {
    args.splice(forceIndex, 1);
  }

  if (args.length > 1) {
    throw new Error("Usage: ai-repo-blueprint [target-folder] [--force]");
  }

  return {
    force,
    targetDir: args[0] ? path.resolve(args[0]) : process.cwd(),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = copyBlueprint(options);

  for (const file of result.copied) {
    console.log(`copied ${file}`);
  }

  for (const file of result.skipped) {
    console.log(`skipped ${file}`);
  }

  console.log(`Done. Copied ${result.copied.length}, skipped ${result.skipped.length}.`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
