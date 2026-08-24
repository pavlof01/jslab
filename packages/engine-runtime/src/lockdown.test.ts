import vm from "node:vm";
import { afterEach, describe, expect, it } from "vitest";
import { buildEngineApp, type EngineSpec } from "./app.js";
import { engineEnvBase } from "./config.js";
import { buildLockdownShim } from "./lockdown.js";

const SECRET = "SERVICEACCOUNT-TOKEN-CONTENTS";

const D8_LIKE_REALM = `
  const vm = require("node:vm"), fs = require("node:fs");
  globalThis.print = (...a) => console.log(...a);
  globalThis.read = () => ${JSON.stringify(SECRET)};
  globalThis.readbuffer = () => ${JSON.stringify(SECRET)};
  globalThis.readline = () => ${JSON.stringify(SECRET)};
  for (const p of process.argv.slice(1)) {
    vm.runInThisContext(fs.readFileSync(p, "utf8"), { filename: p });
  }
`;

const PROBE_SNIPPET = `
  for (const name of ["read", "readbuffer", "readline"]) {
    let result;
    try {
      result = globalThis[name] ? globalThis[name]("/var/run/secrets/kubernetes.io/serviceaccount/token") : "GONE";
    } catch (e) {
      result = "BLOCKED";
    }
    print(name + ": " + result);
  }
`;

describe("buildLockdownShim, executed", () => {
  it("neutralizes a dangerous global that exists and works", () => {
    const context = vm.createContext({});
    vm.runInContext(`globalThis.read = () => ${JSON.stringify(SECRET)};`, context);
    expect(vm.runInContext("read()", context)).toBe(SECRET);

    vm.runInContext(buildLockdownShim(["read"]), context);

    expect(vm.runInContext("typeof read", context)).toBe("undefined");
    expect(() => vm.runInContext("read()", context)).toThrow(/read is not defined/);
  });

  it("keeps neutralizing the rest when one global cannot be touched", () => {
    const context = vm.createContext({});
    vm.runInContext(
      `
      Object.defineProperty(globalThis, "read", {
        value: () => ${JSON.stringify(SECRET)}, writable: false, configurable: false,
      });
      globalThis.readbuffer = () => ${JSON.stringify(SECRET)};
      `,
      context,
    );

    expect(() => vm.runInContext(buildLockdownShim(["read", "readbuffer"]), context)).not.toThrow();
    expect(vm.runInContext("typeof readbuffer", context)).toBe("undefined");
  });
});

describe("lockdown through the real run pipeline", () => {
  const apps: Array<{ close(): Promise<unknown> }> = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function d8LikeApp(overrides: Partial<EngineSpec> = {}) {
    const spec: EngineSpec = {
      engine: "v8",
      tmpPrefix: "engine-lockdown-",
      config: engineEnvBase.parse({ MAX_CONCURRENCY: "4", LOG_LEVEL: "silent" }),
      blockedGlobals: ["read", "readbuffer", "readline"],
      invoke: ({ scriptPath, preludePaths }) => ({
        cmd: process.execPath,
        args: ["-e", D8_LIKE_REALM, ...preludePaths, scriptPath],
      }),
      ...overrides,
    };
    const app = buildEngineApp(spec);
    apps.push(app);
    return app;
  }

  it("a snippet in a realm with live read() cannot reach the secret", async () => {
    const res = await d8LikeApp().inject({
      method: "POST",
      url: "/run",
      payload: { sourceText: PROBE_SNIPPET },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.stdout).toContain("read: GONE");
    expect(body.stdout).toContain("readbuffer: GONE");
    expect(body.stdout).toContain("readline: GONE");
    expect(body.stdout).not.toContain(SECRET);
    expect(body.stderr).not.toContain(SECRET);
  });

  it("without blockedGlobals the same snippet reads the secret — the control is the shim, not the realm", async () => {
    const res = await d8LikeApp({ blockedGlobals: undefined }).inject({
      method: "POST",
      url: "/run",
      payload: { sourceText: PROBE_SNIPPET },
    });

    expect(res.json().stdout).toContain(`read: ${SECRET}`);
  });
});
