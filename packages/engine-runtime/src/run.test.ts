import { describe, expect, it } from "vitest";
import { runCommand } from "./run.js";

const node = process.execPath;

/** Run a snippet in a child node process, the same way the engines spawn a shell. */
function run(script: string, opts: { timeoutMs?: number; maxOutputBytes?: number } = {}) {
  return runCommand(node, ["-e", script], {
    timeoutMs: opts.timeoutMs ?? 5000,
    maxOutputBytes: opts.maxOutputBytes ?? 64 * 1024,
  });
}

describe("runCommand", () => {
  it("captures stdout and stderr separately", async () => {
    const result = await run('process.stdout.write("out"); process.stderr.write("err");');
    expect(result).toMatchObject({ stdout: "out", stderr: "err", exitCode: 0, timedOut: false, outputTruncated: false });
  });

  it("keeps multi-byte characters intact across chunk boundaries", async () => {
    // Decoding each chunk on arrival used to cut UTF-8 sequences in half
    // whenever a 64 KiB pipe chunk landed mid-character.
    // Deliberately mixed widths: "é" is 2 bytes, "☃" is 3, "𝄞" is 4, so a chunk
    // boundary can land inside any of them.
    const script = 'process.stdout.write("héllo ☃ 𝄞".repeat(20000));';
    const result = await run(script, { maxOutputBytes: 8 * 1024 * 1024 });
    expect(result.outputTruncated).toBe(false);
    expect(result.stdout).not.toContain("\uFFFD");
    expect(result.stdout).toBe("héllo ☃ 𝄞".repeat(20000));
  });

  it("truncates instead of discarding when the output budget is blown", async () => {
    const result = await run('for (let i = 0; i < 1e6; i++) process.stdout.write("0123456789");', {
      maxOutputBytes: 32 * 1024,
    });
    expect(result.outputTruncated).toBe(true);
    // The kill lands after the chunk that crossed the budget, so keep what fits
    // and no more — but never nothing, which is what the old 400 path returned.
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(32 * 1024);
    expect(result.stdout.startsWith("0123456789")).toBe(true);
  });

  it("caps stdout and stderr COMBINED, not each one separately", async () => {
    // Decoding each stream against the full budget let one response carry 2x
    // the cap, which the gateway then cached into the shared Redis.
    const result = await run(
      'for (let i = 0; i < 1e6; i++) { process.stdout.write("0123456789"); process.stderr.write("0123456789"); }',
      { maxOutputBytes: 32 * 1024 },
    );
    expect(result.outputTruncated).toBe(true);
    expect(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(32 * 1024);
  });

  it("keeps a stderr message alive when stdout floods the budget", async () => {
    // Spending the budget on stdout first would drop the one line that explains
    // why the run produced so much, so each stream is guaranteed its half.
    const result = await run(
      'process.stderr.write("boom"); for (let i = 0; i < 1e6; i++) process.stdout.write("0123456789");',
      { maxOutputBytes: 32 * 1024 },
    );
    expect(result.outputTruncated).toBe(true);
    expect(result.stderr).toBe("boom");
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(32 * 1024);
  });

  it("gives an under-budget run both streams in full", async () => {
    // The fair split must not truncate output that fits: a small stderr does
    // not cost stdout its half.
    const result = await run('process.stdout.write("a".repeat(900)); process.stderr.write("b".repeat(90));', {
      maxOutputBytes: 1024,
    });
    expect(result.outputTruncated).toBe(false);
    expect(result.stdout).toBe("a".repeat(900));
    expect(result.stderr).toBe("b".repeat(90));
  });

  it("does not cut a character in half at the truncation point", async () => {
    // "☃" is 3 bytes, so a byte-aligned cut of an odd budget lands mid-character.
    const result = await run('for (let i = 0; i < 1e6; i++) process.stdout.write("☃");', { maxOutputBytes: 1000 });
    expect(result.outputTruncated).toBe(true);
    expect(result.stdout).not.toContain("�");
  });

  it("kills a script that outruns its wall-clock budget", async () => {
    const result = await run("while (true) {}", { timeoutMs: 200 });
    expect(result.timedOut).toBe(true);
  });

  it("pipes stdin when an input payload is given", async () => {
    const result = await runCommand(node, ["-e", 'process.stdin.on("data", (d) => process.stdout.write(d));'], {
      timeoutMs: 5000,
      maxOutputBytes: 1024,
      input: "piped",
    });
    expect(result.stdout).toBe("piped");
  });

  it("reports a missing binary instead of throwing", async () => {
    const result = await runCommand("/nonexistent/engine-binary", [], { timeoutMs: 1000, maxOutputBytes: 1024 });
    expect(result.exitCode).toBe(-1);
    expect(result.stderr).toContain("ENOENT");
  });
});
