#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { checkHealth, runOnEngine, type EngineOutcome } from "./client.js";
import { ENGINES, flagsFor } from "./engines.js";
import { HELP } from "./help.js";
import { UsageError, parseArgv, planEngines, type RunCommand } from "./options.js";
import { renderEngines, renderFlags, renderOutcome, renderSummary, theme, toJson } from "./render.js";
import { readSource } from "./source.js";

const EXIT_OK = 0;
const EXIT_ENGINE_FAILED = 1;
const EXIT_USAGE = 2;

async function main(argv: readonly string[]): Promise<number> {
  const command = parseArgv(argv, process.env);
  const t = theme("color" in command ? command.color : false);

  switch (command.kind) {
    case "help":
      process.stdout.write(HELP);
      return EXIT_OK;

    case "version":
      process.stdout.write(`${await version()}\n`);
      return EXIT_OK;

    case "flags":
      if (command.json) {
        process.stdout.write(
          `${JSON.stringify(
            Object.fromEntries(
              command.engines.map((engine) => [
                engine,
                flagsFor(engine)
                  .filter((spec) => !command.category || spec.category === command.category)
                  .map((spec) => ({
                    flag: spec.flag,
                    description: spec.description,
                    category: spec.category,
                    ...(spec.takesValue ? { takesValue: true, valuePattern: spec.valuePattern?.source } : {}),
                  })),
              ]),
            ),
            null,
            2,
          )}\n`,
        );
        return EXIT_OK;
      }
      process.stdout.write(`${renderFlags(command.engines, command.category, t)}\n`);
      return EXIT_OK;

    case "engines": {
      const health = await checkHealth(command.apiUrl);
      if (command.json) {
        process.stdout.write(`${JSON.stringify({ api: command.apiUrl, health, engines: ENGINES }, null, 2)}\n`);
        return health.ok ? EXIT_OK : EXIT_ENGINE_FAILED;
      }
      process.stdout.write(`${renderEngines(t)}\n\n${command.apiUrl} — ${health.detail}\n`);
      return health.ok ? EXIT_OK : EXIT_ENGINE_FAILED;
    }

    case "run":
      return runCommand(command);
  }
}

async function runCommand(command: RunCommand): Promise<number> {
  // Planning first: a mistyped flag is caught against the shared catalog
  // before stdin is drained or a single request is sent.
  const plans = planEngines(command);
  const { sourceText, warnings } = await readSource(command);
  for (const warning of warnings) process.stderr.write(`warning: ${warning}\n`);

  const t = theme(command.color);
  const outcomes = await Promise.all(
    plans.map((plan) =>
      runOnEngine(plan.engine, sourceText, plan.flags, {
        apiUrl: command.apiUrl,
        apiKey: command.apiKey,
        timeoutMs: command.timeoutMs,
      }),
    ),
  );

  if (command.json) {
    process.stdout.write(toJson(command.apiUrl, sourceText, outcomes));
  } else if (command.quiet) {
    for (const outcome of outcomes) {
      if (outcome.stdout.trim()) process.stdout.write(`${outcome.stdout.replace(/\s+$/, "")}\n`);
      if (outcome.stderr.trim()) process.stderr.write(`${outcome.stderr.replace(/\s+$/, "")}\n`);
      if (outcome.failure) process.stderr.write(`${outcome.engine}: ${outcome.failure.message}\n`);
    }
  } else {
    process.stdout.write(`${outcomes.map((outcome) => renderOutcome(outcome, t)).join("\n\n")}\n`);
    if (outcomes.length > 1) process.stdout.write(`\n${renderSummary(outcomes, t)}\n`);
  }

  if (command.outDir) await writeOutputs(command.outDir, outcomes);

  return outcomes.every((outcome) => outcome.ok) ? EXIT_OK : EXIT_ENGINE_FAILED;
}

/** `--out`: one file per engine, so a dump can be diffed or kept. */
async function writeOutputs(dir: string, outcomes: readonly EngineOutcome[]): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(
    outcomes.map((outcome) => {
      const body = [
        `// engine: ${outcome.engine}`,
        `// flags: ${outcome.flags.join(" ") || "(none)"}`,
        ...(outcome.failure ? [`// failed: ${outcome.failure.message}`] : []),
        "",
        outcome.stdout,
        ...(outcome.stderr ? ["", "--- stderr ---", outcome.stderr] : []),
      ].join("\n");
      return fs.writeFile(path.join(dir, `${outcome.engine}.txt`), `${body.replace(/\s+$/, "")}\n`, "utf8");
    }),
  );
  process.stderr.write(`wrote ${outcomes.length} file(s) to ${dir}\n`);
}

async function version(): Promise<string> {
  // dist/index.js sits one level below the package root; read the manifest
  // rather than baking the number into a second place that can drift.
  const manifest = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  try {
    const parsed = JSON.parse(await fs.readFile(manifest, "utf8")) as { version?: string };
    return parsed.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    if (err instanceof UsageError) {
      process.stderr.write(`jslab: ${err.message}\n\nRun \`jslab --help\` for usage.\n`);
      process.exitCode = EXIT_USAGE;
      return;
    }
    process.stderr.write(`jslab: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = EXIT_ENGINE_FAILED;
  });
