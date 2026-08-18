import fs from "fs/promises";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { afterAll, describe, expect, it } from "vitest";
import { UsageError } from "./options.js";
import { readSource } from "./source.js";

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jslab-cli-test-"));
afterAll(() => fs.rm(tmpDir, { recursive: true, force: true }));

const pipedStdin = (text: string) => Object.assign(Readable.from([text]), { isTTY: false }) as NodeJS.ReadStream;

describe("readSource", () => {
  it("prefers --code", async () => {
    expect(await readSource({ code: "1 + 1" })).toMatchObject({ sourceText: "1 + 1", origin: "--code" });
  });

  it("reads a file", async () => {
    const file = path.join(tmpDir, "snippet.js");
    await fs.writeFile(file, "const a = 1;\n", "utf8");
    expect(await readSource({ file })).toMatchObject({ sourceText: "const a = 1;\n", origin: file });
  });

  it("reads piped stdin", async () => {
    expect(await readSource({}, pipedStdin("1 + '1'"))).toMatchObject({ sourceText: "1 + '1'", origin: "stdin" });
  });

  it("explains a missing file instead of dumping an errno", async () => {
    await expect(readSource({ file: path.join(tmpDir, "gone.js") })).rejects.toThrow(/no such file/);
  });

  it("refuses to hang on an interactive terminal", async () => {
    const tty = Object.assign(Readable.from([]), { isTTY: true }) as NodeJS.ReadStream;
    await expect(readSource({}, tty)).rejects.toThrow(UsageError);
  });

  it("rejects an empty snippet", async () => {
    await expect(readSource({ code: "   " })).rejects.toThrow(/nothing to run/);
  });

  it("warns when the source is longer than the gateway's default limit", async () => {
    const { warnings } = await readSource({ code: "x".repeat(20_001) });
    expect(warnings[0]).toMatch(/default limit is 20000/);
  });
});
