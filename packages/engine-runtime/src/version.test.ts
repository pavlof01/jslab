import { describe, expect, it } from "vitest";
import { detectVersion, matchVersion } from "./version.js";

const nodePrinting = (text: string) => ({
  cmd: process.execPath,
  args: ["-e", `console.log(${JSON.stringify(text)})`],
});

describe("detectVersion", () => {
  it("returns what the parser pulls out of the binary's output", async () => {
    const { cmd, args } = nodePrinting("V8 version 14.9.0 (candidate)");
    const version = await detectVersion({
      cmd,
      candidates: [args],
      parse: (raw) => matchVersion(raw, /V8 version ([^\n]+)/),
    });
    expect(version).toBe("14.9.0 (candidate)");
  });

  it("moves on to the next candidate when a flag is refused", async () => {
    const version = await detectVersion({
      cmd: process.execPath,
      candidates: [["-e", "process.exit(1)"], nodePrinting("2.0.0").args],
      parse: (raw) => matchVersion(raw, /([\d.]+)/),
    });
    expect(version).toBe("2.0.0");
  });

  it("keeps a multi-byte character that arrives split across two writes", async () => {
    const script = [
      "const bytes = Buffer.from('JavaScript-C134.0 — édition', 'utf8');",
      "for (const b of bytes) process.stdout.write(Buffer.from([b]));",
    ].join("");
    const version = await detectVersion({
      cmd: process.execPath,
      candidates: [["-e", script]],
      parse: (raw) => matchVersion(raw, /JavaScript-C\s*([^\n]+)/),
    });
    expect(version).toBe("134.0 — édition");
  });

  it("asks the binary the way the engine's own invocation does", async () => {
    const version = await detectVersion({
      cmd: process.execPath,
      candidates: [["-e", "console.log(process.env.ENGINE_BANNER ?? 'unset')"]],
      parse: (raw) => raw,
      spawnOptions: { env: { ...process.env, ENGINE_BANNER: "9.9.9" } },
    });
    expect(version).toBe("9.9.9");
  });

  it("reads a version the binary wrote to stderr", async () => {
    const version = await detectVersion({
      cmd: process.execPath,
      candidates: [["-e", "console.error('JavaScript-C134.0')"]],
      parse: (raw) => matchVersion(raw, /JavaScript-C\s*([^\n]+)/),
    });
    expect(version).toBe("134.0");
  });

  it("is null when the parser does not recognize the output", async () => {
    const { cmd, args } = nodePrinting("ERROR: invalid option: --version");
    const version = await detectVersion({
      cmd,
      candidates: [args],
      parse: (raw) => matchVersion(raw, /Hermes release version:\s*([^\n]+)/),
    });
    expect(version).toBeNull();
  });

  it("is null when the binary is not there at all", async () => {
    const version = await detectVersion({
      cmd: "/nonexistent/engine-binary",
      candidates: [["--version"]],
      parse: (raw) => raw,
    });
    expect(version).toBeNull();
  });

  it("caps a runaway banner instead of putting it all in a header", async () => {
    const { cmd, args } = nodePrinting("x".repeat(500));
    const version = await detectVersion({ cmd, candidates: [args], parse: (raw) => raw });
    expect(version).toHaveLength(80);
  });
});

describe("matchVersion", () => {
  it("skips the LLVM banner hermes prints before its own version", () => {
    const raw = [
      "LLVM (http://llvm.org/):",
      "  LLVH version 8.0.0svn",
      "",
      "Hermes JavaScript compiler and Virtual Machine.",
      "  Hermes release version: 1.0.0",
      "  HBC bytecode version: 98",
    ].join("\n");
    expect(matchVersion(raw, /Hermes release version:\s*([^\n]+)/)).toBe("1.0.0");
    expect(matchVersion(raw, /HBC bytecode version:\s*([^\n]+)/)).toBe("98");
  });

  it("is null when nothing matches", () => {
    expect(matchVersion("no version here", /version ([\d.]+)/)).toBeNull();
  });
});
