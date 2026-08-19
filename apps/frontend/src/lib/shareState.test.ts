import { describe, expect, it } from "@jest/globals";
import { EngineKey } from "@/lib/types";
import {
  buildEmbedSnippet,
  buildShareUrl,
  decodeShareState,
  encodeShareState,
  SHARE_PARAM,
} from "./shareState";

const state = {
  code: "const x = 1;\nconsole.log(x)",
  engines: [EngineKey.v8, EngineKey.hermes],
  v8Flags: ["--print-bytecode"],
};

describe("shareState", () => {
  it("round-trips code, engines, and flags", () => {
    const decoded = decodeShareState(encodeShareState(state));
    expect(decoded).toEqual(state);
  });

  it("survives non-Latin1 source (unicode identifiers, emoji)", () => {
    const s = { ...state, code: "const éè = '🚀'; // 你好" };
    expect(decodeShareState(encodeShareState(s))?.code).toBe(s.code);
  });

  it("produces a URL-safe payload (no +, /, or =)", () => {
    const encoded = encodeShareState({ ...state, code: "a".repeat(200) });
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("always includes V8 even if omitted", () => {
    const decoded = decodeShareState(encodeShareState({ ...state, engines: [EngineKey.hermes] }));
    expect(decoded?.engines).toContain(EngineKey.v8);
  });

  it("returns null on garbage input", () => {
    expect(decodeShareState("not-valid-base64!!!")).toBeNull();
    expect(decodeShareState("")).toBeNull();
  });

  it("drops unknown engine keys", () => {
    const encoded = encodeShareState({ ...state, engines: [EngineKey.v8, "quickjs" as EngineKey] });
    expect(decodeShareState(encoded)?.engines).toEqual([EngineKey.v8]);
  });

  it("builds a share URL with the s param", () => {
    const url = buildShareUrl("https://jslab.su", "/playground", state);
    expect(url).toMatch(/^https:\/\/jslab\.su\/playground\?s=/);
    expect(decodeShareState(new URL(url).searchParams.get("s")!)).toEqual(state);
  });

  it("builds an embed snippet pointing at the embed playground", () => {
    const snippet = buildEmbedSnippet("https://jslab.su", state);
    const src = snippet.match(/src="([^"]+)"/)?.[1];

    expect(src).toMatch(/^https:\/\/jslab\.su\/embed\/playground\?s=/);
    expect(decodeShareState(new URL(src!).searchParams.get(SHARE_PARAM)!)).toEqual(state);
    expect(snippet).toContain('loading="lazy"');
  });
});
