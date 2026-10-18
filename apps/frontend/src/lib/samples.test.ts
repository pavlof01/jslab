import { describe, expect, it } from "@jest/globals";

import { sampleCatalog, v8SampleCatalog, v8Samples } from "./samples";
import { PRINT_BYTECODE_FLAG } from "./v8Flags";
import { V8_NATIVES_FLAG } from "./v8Intrinsics";

const callsIntrinsic = (code: string) =>
  code.split("\n").some((line) => !line.trimStart().startsWith("//") && /%[A-Z]\w*\(/.test(line));

describe("v8SampleCatalog", () => {
  it.each(v8SampleCatalog)(
    "$key asks for natives syntax exactly when it calls an intrinsic",
    ({ key, flags }) => {
      expect(flags.includes(V8_NATIVES_FLAG)).toBe(callsIntrinsic(v8Samples[key]));
    },
  );

  it("prints bytecode only for the bytecode studies", () => {
    expect(
      v8SampleCatalog
        .filter((sample) => sample.flags.includes(PRINT_BYTECODE_FLAG))
        .map((sample) => sample.key),
    ).toEqual(["bytecodeDestructuring", "argumentsVsRest"]);
  });
});

describe("sampleCatalog", () => {
  it("no longer offers the output annotations sample", () => {
    expect(sampleCatalog.map((sample) => sample.label)).not.toContain("Output annotations");
  });
});
