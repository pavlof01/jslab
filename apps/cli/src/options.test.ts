import { describe, expect, it } from "vitest";
import { DEFAULT_API_URL, UsageError, parseArgv, planEngines, type RunCommand } from "./options.js";

const run = (argv: string[], env: NodeJS.ProcessEnv = {}): RunCommand => {
  const command = parseArgv(argv, env);
  if (command.kind !== "run") throw new Error(`expected a run command, got ${command.kind}`);
  return command;
};

describe("parseArgv", () => {
  it("runs every engine by default, reading from stdin", () => {
    const command = run([]);
    expect(command.engines).toEqual(["v8", "hermes", "sm", "jsc"]);
    expect(command.file).toBeUndefined();
    expect(command.code).toBeUndefined();
    expect(command.apiUrl).toBe(DEFAULT_API_URL);
  });

  it("treats a leading non-command positional as the file", () => {
    expect(run(["snippet.js"]).file).toBe("snippet.js");
    expect(run(["run", "snippet.js"]).file).toBe("snippet.js");
  });

  it("reads '-' as stdin", () => {
    expect(run(["-"]).file).toBeUndefined();
  });

  it("keeps a file named like a command after --", () => {
    expect(run(["--", "run"]).file).toBe("run");
  });

  it("takes a flag value verbatim, even when it looks like an option", () => {
    const command = run(["-f", "--print-bytecode", "--flag=--trace-opt"]);
    expect(command.flags).toEqual([
      { engine: null, flag: "--print-bytecode", raw: "--print-bytecode" },
      { engine: null, flag: "--trace-opt", raw: "--trace-opt" },
    ]);
  });

  it("scopes a flag to an engine with the engine: prefix", () => {
    expect(run(["-f", "v8:--trace-ic"]).flags).toEqual([{ engine: "v8", flag: "--trace-ic", raw: "v8:--trace-ic" }]);
  });

  it("resolves engine aliases and 'all', keeping each engine once", () => {
    expect(run(["-e", "spidermonkey,v8"]).engines).toEqual(["sm", "v8"]);
    expect(run(["-e", "all", "-e", "v8"]).engines).toEqual(["v8", "hermes", "sm", "jsc"]);
  });

  it("reads the api url and key from the environment", () => {
    const command = run([], { JSLAB_API_URL: "http://localhost:8080/", JSLAB_API_KEY: "jslab_test" });
    expect(command.apiUrl).toBe("http://localhost:8080");
    expect(command.apiKey).toBe("jslab_test");
  });

  it("lets --api win over the environment", () => {
    expect(run(["--api", "http://127.0.0.1:9000"], { JSLAB_API_URL: "https://example.test" }).apiUrl).toBe(
      "http://127.0.0.1:9000",
    );
  });

  it("parses the flags and engines subcommands", () => {
    expect(parseArgv(["flags", "v8", "--category", "bytecode"])).toMatchObject({
      kind: "flags",
      engines: ["v8"],
      category: "bytecode",
    });
    expect(parseArgv(["engines"])).toMatchObject({ kind: "engines" });
    expect(parseArgv(["--help"])).toEqual({ kind: "help" });
    expect(parseArgv(["-V"])).toEqual({ kind: "version" });
  });

  it("rejects command lines it cannot honour", () => {
    expect(() => parseArgv(["--nope"])).toThrow(UsageError);
    expect(() => parseArgv(["-e"])).toThrow(/needs a value/);
    expect(() => parseArgv(["-e", "quickjs"])).toThrow(/unknown engine/);
    expect(() => parseArgv(["-t", "0"])).toThrow(/positive integer/);
    expect(() => parseArgv(["-f", "print-bytecode"])).toThrow(/must start with/);
    expect(() => parseArgv(["a.js", "b.js"])).toThrow(/at most one file/);
    expect(() => parseArgv(["a.js", "-c", "1+1"])).toThrow(/not both/);
    expect(() => parseArgv(["--api", "ftp://example.test"])).toThrow(/http\(s\) URL/);
  });
});

describe("planEngines", () => {
  const plan = (argv: string[]) => planEngines(run(argv));

  it("adds --print-bytecode for V8 only, since the others always dump", () => {
    expect(plan(["-b"])).toEqual([
      { engine: "v8", flags: ["--print-bytecode"] },
      { engine: "hermes", flags: [] },
      { engine: "sm", flags: [] },
      { engine: "jsc", flags: [] },
    ]);
  });

  it("sends an unscoped flag only to the engines whose catalog accepts it", () => {
    expect(plan(["-f", "--trace-opt"])).toEqual([
      { engine: "v8", flags: ["--trace-opt"] },
      { engine: "hermes", flags: [] },
      { engine: "sm", flags: [] },
      { engine: "jsc", flags: [] },
    ]);
  });

  it("sends a scoped flag only to its engine", () => {
    expect(plan(["-e", "v8,sm", "-f", "sm:--ion-eager"])).toEqual([
      { engine: "v8", flags: [] },
      { engine: "sm", flags: ["--ion-eager"] },
    ]);
  });

  it("rejects a flag no selected engine knows", () => {
    expect(() => plan(["-f", "--print-everything"])).toThrow(/no selected engine accepts --print-everything/);
    expect(() => plan(["-e", "hermes", "-f", "--trace-opt"])).toThrow(/no selected engine accepts/);
  });

  it("rejects a flag scoped to an unselected or mismatched engine", () => {
    expect(() => plan(["-e", "v8", "-f", "sm:--ion-eager"])).toThrow(/not selected/);
    expect(() => plan(["-f", "hermes:--trace-opt"])).toThrow(/hermes has no flag --trace-opt/);
  });

  it("rejects a value-bearing flag whose value the catalog would drop", () => {
    expect(() => plan(["-e", "v8", "-f", "--print-bytecode-filter"])).toThrow(/rejected/);
    expect(() => plan(["-e", "v8", "-f", "--print-bytecode-filter=bad value"])).toThrow(/rejected/);
    expect(plan(["-e", "v8", "-f", "--print-bytecode-filter=add*"])).toEqual([
      { engine: "v8", flags: ["--print-bytecode-filter=add*"] },
    ]);
  });
});
