import { describe, expect, it } from "@jest/globals";

import { compileAnnotations } from "./annotations";
import { v8Samples } from "./samples";

const source = (fields: string) => `/* @annotation\n${fields}\n*/`;

describe("compileAnnotations", () => {
  it.each(["status: ready", "Ret r0", "Return", "elements kind: PACKED_SMI_ELEMENTS"])(
    "annotates arbitrary output: %s",
    (match) => {
      const output = `prefix\n${match}\nsuffix`;
      const result = compileAnnotations({
        source: source(`match: ${match}\ntext: An explanation.`),
        output,
      });
      expect(result.diagnostics).toEqual([]);
      expect(result.annotations).toEqual([
        expect.objectContaining({
          start: 7,
          end: 7 + match.length,
          title: match,
          text: "An explanation.",
        }),
      ]);
      expect(output.slice(result.annotations[0].start, result.annotations[0].end)).toBe(match);
    },
  );

  it("uses context for matching and highlights only the requested fragment", () => {
    const result = compileAnnotations({
      source: source(
        "match: status: ready\nhighlight: ready\ntitle: Ready\ntext: The run can continue.",
      ),
      output: "ready\nstatus: ready\nready",
    });
    expect(result.annotations).toEqual([
      expect.objectContaining({
        start: 14,
        end: 19,
        title: "Ready",
        text: "The run can continue.",
      }),
    ]);
  });

  it("finds every literal match by default and can select an occurrence", () => {
    const output = "ready ready\nready";
    const fields = "match: ready\ntext: Ready.";
    const all = compileAnnotations({ source: source(fields), output });
    expect(all.annotations.map((annotation) => annotation.start)).toEqual([0, 6, 12]);
    expect(new Set(all.annotations.map((annotation) => annotation.id)).size).toBe(3);
    const second = compileAnnotations({ source: source(`${fields}\noccurrence: 2`), output });
    expect(second.annotations.map((annotation) => annotation.start)).toEqual([6]);
  });

  it("treats missing matches as normal and matches case, spaces and punctuation literally", () => {
    for (const output of ["", "STATUS: ready", "status:  ready", "other engine output"]) {
      expect(
        compileAnnotations({ source: source("match: status: ready\ntext: Ready."), output }),
      ).toEqual({
        annotations: [],
        diagnostics: [],
      });
    }
    expect(
      compileAnnotations({ source: source("match: [.*]\ntext: Literal."), output: "[.*]" })
        .annotations,
    ).toHaveLength(1);
  });

  it("rejects multiline values outside `text`, which cannot span rendered rows", () => {
    const result = compileAnnotations({
      source: source("match: |\n  status:\n  ready\ntext: Note."),
      output: "status:\nready",
    });
    expect(result.annotations).toEqual([]);
    expect(result.diagnostics).toEqual([
      { line: 1, message: "`match` cannot hold a multiline value; only `text` can." },
    ]);
  });

  it("preserves multiline text, colons, quoted spaces and CRLF output offsets", () => {
    const result = compileAnnotations({
      source: source(
        'match: " ready "\ntext: |\n  First line: a value.\n\n  Second line.',
      ).replaceAll("\n", "\r\n"),
      output: "head\r\n ready ",
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.annotations[0]).toEqual(
      expect.objectContaining({
        start: 6,
        end: 13,
        text: "First line: a value.\n\nSecond line.",
      }),
    );
  });

  it("ignores directive-shaped strings, templates, line comments and unrelated block comments", () => {
    const fake = source("match: ready\ntext: Fake.");
    const input = `const a = ${JSON.stringify(fake)};\nconst b = \`${fake}\`;\n// ${fake.replaceAll("\n", " ")}\n/* documentation ${fake.slice(2, -2)} */\n${source("match: ready\ntext: Real.")}`;
    const result = compileAnnotations({ source: input, output: "ready" });
    expect(result.diagnostics).toEqual([]);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].text).toBe("Real.");
  });

  it.each([
    'const quote = /"/;',
    "const quote = /'/;",
    "const tick = /`/;",
    String.raw`const pattern = /["/]+\//g;`,
    'if (true) /"/.test("value");',
    'function quote() { return /"/; }',
    'const ratio = 12 / 3 / 2; const quote = /"/;',
    '%DebugPrint([]); const quote = /"/;',
    'const broken = ; const quote = /"/;',
  ])("finds annotations after regex literals without confusing division: %s", (prefix) => {
    const result = compileAnnotations({
      source: `${prefix}\r\n${source("match: ready\ntext: Real.")}`,
      output: "ready",
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].text).toBe("Real.");

    const invalid = compileAnnotations({
      source: `${prefix}\r\n${source("match: ready")}`,
      output: "ready",
    });
    expect(invalid.diagnostics).toEqual([{ line: 2, message: "A non-empty `text` is required." }]);
  });

  it("keeps comments after division and distinguishes nested template text from expressions", () => {
    const real = source("match: ready\ntext: Real.");
    const fake = source("match: ready\ntext: Fake.");
    for (const input of [
      `const ratio = 12 / ${real} 3 / 2;`,
      "const value = `outer ${`" + fake + "`} ${" + real + '"ready"}`;',
    ]) {
      const result = compileAnnotations({ source: input, output: "ready" });
      expect(result.diagnostics).toEqual([]);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].text).toBe("Real.");
    }
  });

  it.each(['const value = "unfinished', "const pattern = /unfinished"])(
    "keeps earlier annotations when the source has an unterminated literal: %s",
    (suffix) => {
      const result = compileAnnotations({
        source: `${source("match: SyntaxError\ntext: Invalid source.")}\n${suffix}`,
        output: "SyntaxError: Unterminated literal",
      });
      expect(result.diagnostics).toEqual([]);
      expect(result.annotations).toHaveLength(1);
      expect(result.annotations[0].text).toBe("Invalid source.");
    },
  );

  it.each([
    "text: Missing match.",
    "match: ready",
    "match: ready\ntext: Note.\nshow: inline",
    "match: ready\nmatch: ready\ntext: Note.",
    "match: ready\nhighlight: missing\ntext: Note.",
    "match: ready ready\nhighlight: ready\ntext: Note.",
    "match: ready\ntext: Note.\noccurrence: 0",
    "match: ready\ntext: Note.\noccurrence: 1.5",
    "match: ready\ntext: Note.\noccurrence: 9007199254740992",
    "match ready\ntext: Note.",
  ])("reports invalid fields without breaking valid annotations: %s", (fields) => {
    const result = compileAnnotations({
      source: source(fields) + "\n" + source("match: ready\ntext: Valid."),
      output: "ready",
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].line).toBe(1);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].text).toBe("Valid.");
  });

  it("resolves overlaps deterministically without splitting one explanation into another", () => {
    const result = compileAnnotations({
      source: source("match: ready\ntext: First.") + "\n" + source("match: ready\ntext: Second."),
      output: "ready ready",
    });
    expect(result.annotations.map((annotation) => annotation.text)).toEqual(["First.", "First."]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("Overlapping");
  });

  it("migrates the array example to independent matching rules", () => {
    const output = "elements kind: PACKED_SMI_ELEMENTS\nelements kind: HOLEY_SMI_ELEMENTS";
    const result = compileAnnotations({ source: v8Samples.arrayLengthHoley, output });
    expect(result.diagnostics).toEqual([]);
    expect(result.annotations.map(({ start, end }) => output.slice(start, end))).toEqual([
      "PACKED_SMI_ELEMENTS",
      "HOLEY_SMI_ELEMENTS",
    ]);
  });
});
