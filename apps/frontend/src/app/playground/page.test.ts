/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

import { encodeShareState } from "@/lib/shareState";
import { EngineKey } from "@/lib/types";

import { generateMetadata } from "./page";

const metadataFor = (searchParams: Record<string, string>) =>
  generateMetadata({ searchParams: Promise.resolve(searchParams) });

describe("playground metadata", () => {
  it("is canonical and indexable without a shared state", async () => {
    const meta = await metadataFor({});
    expect(meta.alternates?.canonical).toBe("/playground");
    expect(meta.robots).toBeUndefined();
  });

  it("points a share link's canonical at the playground and keeps it out of the index", async () => {
    const s = encodeShareState({ code: "f()", engines: [EngineKey.v8], flags: {} });
    const meta = await metadataFor({ s });
    expect(meta.alternates?.canonical).toBe("/playground");
    expect(meta.robots).toEqual({ index: false });
    expect(meta.alternates?.types).toHaveProperty("application/json+oembed");
  });
});
