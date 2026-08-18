import { sanitizeFlags } from "@jslab/engine-runtime";
import { ENGINES, ENGINE_KEYS, flagsFor, resolveEngine, type EngineKey } from "./engines.js";

/** A mistake in what the user typed: reported without a stack trace, exit 2. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

/** Public instance, so the CLI is useful before anyone runs the stack locally. */
export const DEFAULT_API_URL = "https://jslab.su";

/**
 * Client-side cap on flags per engine, mirroring the `MAX_FLAGS` default the
 * gateway and the engine services share. It only exists to reject an obviously
 * over-long list locally; the server still enforces its own configured value.
 */
export const MAX_FLAGS = 10;

/** A flag as typed, plus the engine it was scoped to with `engine:--flag`. */
export interface ScopedFlag {
  engine: EngineKey | null;
  flag: string;
  raw: string;
}

export interface RunCommand {
  kind: "run";
  /** Path to read the snippet from; undefined means `--code` or stdin. */
  file?: string;
  code?: string;
  engines: EngineKey[];
  flags: ScopedFlag[];
  bytecode: boolean;
  timeoutMs?: number;
  apiUrl: string;
  apiKey?: string;
  json: boolean;
  quiet: boolean;
  color: boolean;
  outDir?: string;
}

export type Command =
  | RunCommand
  | { kind: "flags"; engines: EngineKey[]; category?: string; json: boolean; color: boolean }
  | { kind: "engines"; json: boolean; color: boolean; apiUrl: string }
  | { kind: "help" }
  | { kind: "version" };

interface RawOptions {
  engines: EngineKey[];
  flags: ScopedFlag[];
  code?: string;
  bytecode: boolean;
  timeoutMs?: number;
  apiUrl?: string;
  apiKey?: string;
  json: boolean;
  quiet: boolean;
  color?: boolean;
  outDir?: string;
  category?: string;
  help: boolean;
  version: boolean;
  positionals: string[];
}

const COMMANDS = new Set(["run", "flags", "engines", "help", "version"]);

const VALUE_OPTIONS = new Map<string, keyof RawOptions | "engine" | "flag">([
  ["--engine", "engine"],
  ["-e", "engine"],
  ["--flag", "flag"],
  ["-f", "flag"],
  ["--code", "code"],
  ["-c", "code"],
  ["--timeout", "timeoutMs"],
  ["-t", "timeoutMs"],
  ["--api", "apiUrl"],
  ["--api-key", "apiKey"],
  ["--out", "outDir"],
  ["-o", "outDir"],
  ["--category", "category"],
]);

/**
 * Parse argv (without `node` and the script path) into a command.
 *
 * Hand-rolled rather than `util.parseArgs` because a flag argument is itself a
 * flag — `-f --print-bytecode` — and the value of `-f` must be taken verbatim
 * instead of being re-parsed as an option of ours.
 */
export function parseArgv(argv: readonly string[], env: NodeJS.ProcessEnv = {}): Command {
  const raw: RawOptions = {
    engines: [],
    flags: [],
    bytecode: false,
    json: false,
    quiet: false,
    help: false,
    version: false,
    positionals: [],
  };

  // Set once a `--` has been seen: everything after it is a positional, and a
  // file that happens to be named "run" must not be read as a command.
  let onlyPositionals = false;
  let commandIsLiteral = false;
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (onlyPositionals || token === "-" || !token.startsWith("-")) {
      if (onlyPositionals && raw.positionals.length === 0) commandIsLiteral = true;
      raw.positionals.push(token);
      continue;
    }
    if (token === "--") {
      onlyPositionals = true;
      continue;
    }

    const eq = token.indexOf("=");
    const name = eq === -1 ? token : token.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : token.slice(eq + 1);

    const target = VALUE_OPTIONS.get(name);
    if (target) {
      // An option's value is the rest of `--opt=value`, or the next token
      // taken verbatim — engine flags start with `-` and must not be parsed.
      const value = inlineValue ?? argv[++i];
      if (value === undefined) throw new UsageError(`${name} needs a value`);
      applyValue(raw, target, name, value);
      continue;
    }

    if (inlineValue !== undefined) throw new UsageError(`${name} does not take a value`);

    switch (name) {
      case "-b":
      case "--bytecode":
        raw.bytecode = true;
        break;
      case "--json":
        raw.json = true;
        break;
      case "-q":
      case "--quiet":
        raw.quiet = true;
        break;
      case "--color":
        raw.color = true;
        break;
      case "--no-color":
        raw.color = false;
        break;
      case "-h":
      case "--help":
        raw.help = true;
        break;
      case "-V":
      case "--version":
        raw.version = true;
        break;
      default:
        throw new UsageError(`unknown option ${name}`);
    }
  }

  const [head, ...rest] = raw.positionals;
  const isCommand = head !== undefined && !commandIsLiteral && COMMANDS.has(head);
  const command = isCommand ? head : "run";
  const args = isCommand ? rest : raw.positionals;

  if (raw.help || command === "help") return { kind: "help" };
  if (raw.version || command === "version") return { kind: "version" };

  const color = resolveColor(raw.color, env);

  if (command === "flags") {
    return {
      kind: "flags",
      engines: args.length ? args.map(requireEngine) : [...ENGINE_KEYS],
      category: raw.category,
      json: raw.json,
      color,
    };
  }

  if (command === "engines") {
    if (args.length) throw new UsageError(`engines takes no arguments (got ${JSON.stringify(args[0])})`);
    return { kind: "engines", json: raw.json, color, apiUrl: resolveApiUrl(raw.apiUrl, env) };
  }

  if (args.length > 1) {
    throw new UsageError(`run takes at most one file (got ${args.length}: ${args.join(", ")})`);
  }
  const file = args[0];
  if (file !== undefined && raw.code !== undefined) {
    throw new UsageError("pass either a file or --code, not both");
  }

  return {
    kind: "run",
    // "-" is the conventional spelling for stdin, and stdin is what an absent
    // file already means, so both land on `file: undefined`.
    file: file === "-" ? undefined : file,
    code: raw.code,
    engines: raw.engines.length ? dedupe(raw.engines) : [...ENGINE_KEYS],
    flags: raw.flags,
    bytecode: raw.bytecode,
    timeoutMs: raw.timeoutMs,
    apiUrl: resolveApiUrl(raw.apiUrl, env),
    apiKey: raw.apiKey ?? env.JSLAB_API_KEY?.trim() ?? undefined,
    json: raw.json,
    quiet: raw.quiet,
    color,
    outDir: raw.outDir,
  };
}

function applyValue(raw: RawOptions, target: string, name: string, value: string): void {
  switch (target) {
    case "engine":
      raw.engines.push(...parseEngineList(value));
      break;
    case "flag":
      raw.flags.push(parseScopedFlag(value));
      break;
    case "timeoutMs": {
      const ms = Number(value);
      if (!Number.isInteger(ms) || ms <= 0) throw new UsageError(`${name} expects a positive integer of milliseconds`);
      raw.timeoutMs = ms;
      break;
    }
    case "code":
      raw.code = value;
      break;
    case "apiUrl":
      raw.apiUrl = value;
      break;
    case "apiKey":
      raw.apiKey = value;
      break;
    case "outDir":
      raw.outDir = value;
      break;
    case "category":
      raw.category = value;
      break;
  }
}

function parseEngineList(value: string): EngineKey[] {
  const names = value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length) throw new UsageError("--engine needs at least one engine name");
  return names.flatMap((name) => (name.toLowerCase() === "all" ? [...ENGINE_KEYS] : [requireEngine(name)]));
}

function requireEngine(name: string): EngineKey {
  const engine = resolveEngine(name);
  if (!engine) throw new UsageError(`unknown engine ${JSON.stringify(name)} (known: ${ENGINE_KEYS.join(", ")}, all)`);
  return engine;
}

/**
 * Split an optional `engine:` scope off a flag. Only a prefix that names an
 * engine counts, so a flag that legitimately contains a colon stays intact.
 */
function parseScopedFlag(raw: string): ScopedFlag {
  const colon = raw.indexOf(":");
  if (colon > 0) {
    const engine = resolveEngine(raw.slice(0, colon));
    const rest = raw.slice(colon + 1).trim();
    if (engine && rest.startsWith("-")) return { engine, flag: rest, raw };
  }
  const flag = raw.trim();
  if (!flag.startsWith("-")) throw new UsageError(`flag ${JSON.stringify(raw)} must start with "-"`);
  return { engine: null, flag, raw };
}

function resolveApiUrl(explicit: string | undefined, env: NodeJS.ProcessEnv): string {
  const raw = (explicit ?? env.JSLAB_API_URL ?? DEFAULT_API_URL).trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UsageError(`--api is not a valid URL: ${JSON.stringify(raw)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UsageError(`--api must be an http(s) URL (got ${url.protocol.replace(":", "")})`);
  }
  return raw.replace(/\/+$/, "");
}

/**
 * Colour is opt-out on a TTY and off everywhere else, so piping into a file or
 * `grep` never picks up escape codes. `NO_COLOR` (https://no-color.org) wins
 * over the TTY check but not over an explicit `--color`.
 */
function resolveColor(explicit: boolean | undefined, env: NodeJS.ProcessEnv): boolean {
  if (explicit !== undefined) return explicit;
  if (env.NO_COLOR) return false;
  return Boolean(process.stdout.isTTY);
}

function dedupe(engines: readonly EngineKey[]): EngineKey[] {
  return [...new Set(engines)];
}

export interface EnginePlan {
  engine: EngineKey;
  flags: string[];
}

/**
 * Work out which flags each selected engine actually runs with.
 *
 * An unscoped flag is applied to every selected engine whose catalog knows it,
 * so `-f --trace-opt -e all` is not an error — it is "trace optimization where
 * that means something". A flag no selected engine knows is a typo, and one
 * scoped to an engine that isn't selected is a mistake in the selection: both
 * fail here, before a request is spent on them.
 */
export function planEngines(command: Pick<RunCommand, "engines" | "flags" | "bytecode">): EnginePlan[] {
  const { engines, flags, bytecode } = command;
  const known = new Map(engines.map((engine) => [engine, new Set(flagsFor(engine).map((spec) => spec.flag))]));

  for (const scoped of flags) {
    const name = flagName(scoped.flag);
    if (scoped.engine) {
      if (!known.has(scoped.engine)) {
        throw new UsageError(
          `flag ${scoped.raw} is scoped to ${scoped.engine}, which is not selected (selected: ${engines.join(", ")})`,
        );
      }
      if (!known.get(scoped.engine)!.has(name)) {
        throw new UsageError(`${scoped.engine} has no flag ${name} — run \`jslab flags ${scoped.engine}\` for the catalog`);
      }
      continue;
    }
    if (![...known.values()].some((set) => set.has(name))) {
      throw new UsageError(
        `no selected engine accepts ${name} (selected: ${engines.join(", ")}) — run \`jslab flags\` for the catalog`,
      );
    }
  }

  return engines.map((engine) => {
    const accepted = known.get(engine)!;
    const wanted = [
      ...(bytecode ? ENGINES[engine].bytecodeFlags : []),
      ...flags.filter((scoped) => scoped.engine === engine || (!scoped.engine && accepted.has(flagName(scoped.flag)))).map((scoped) => scoped.flag),
    ];
    // The shared sanitizer has the last word locally too: it dedupes, orders,
    // and checks the value form of `--flag=value` entries, so a malformed
    // value is caught here rather than silently dropped by the server.
    const sanitized = sanitizeFlags(engine, wanted, { maxFlags: MAX_FLAGS });
    if (sanitized.dropped.length) {
      throw new UsageError(`${engine} rejected ${sanitized.dropped.join(", ")} — run \`jslab flags ${engine}\` for the accepted values`);
    }
    return { engine, flags: sanitized.flags };
  });
}

function flagName(flag: string): string {
  const eq = flag.indexOf("=");
  return eq === -1 ? flag : flag.slice(0, eq);
}
