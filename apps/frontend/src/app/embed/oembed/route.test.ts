/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { NextRequest } from "next/server";
import { buildSnapshotUrl } from "@/lib/embedState";
import { EngineKey } from "@/lib/types";
import { GET } from "./route";

const SITE = "https://jslab.su";

function oembed(params: Record<string, string>, headers: Record<string, string> = {}) {
  const url = new URL(`${SITE}/embed/oembed`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return GET(new NextRequest(url, { headers }));
}

async function snapshotUrl() {
  return buildSnapshotUrl(SITE, {
    code: "1 + 1",
    engine: EngineKey.v8,
    flags: ["--print-bytecode"],
    output: "line\n".repeat(3),
  });
}

describe("GET /embed/oembed", () => {
  it("returns a rich oEmbed document for a playground URL", async () => {
    const res = await oembed({ url: `${SITE}/embed/playground?s=abc` });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ version: "1.0", type: "rich", provider_name: "JSLab" });
    expect(body.html).toContain(`<iframe src="${SITE}/embed/playground?s=abc"`);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });

  it("sizes a bytecode embed from its decoded snapshot", async () => {
    const res = await oembed({ url: await snapshotUrl() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("JSLab bytecode");
    expect(body.height).toBeGreaterThan(160);
  });

  it("rejects an unsupported format with 501, before any other check", async () => {
    const res = await oembed({ url: `${SITE}/embed/playground`, format: "xml" });
    expect(res.status).toBe(501);
  });

  it("requires the url parameter", async () => {
    const res = await oembed({});
    expect(res.status).toBe(400);
  });

  it("rejects a url on another host as not belonging to this site", async () => {
    const res = await oembed({ url: "https://evil.example/embed/playground" });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("does not belong");
  });

  it("honours x-forwarded-host when deciding same-host", async () => {
    const res = await oembed(
      { url: "https://jslab.su/embed/playground" },
      { "x-forwarded-host": "jslab.su" },
    );
    expect(res.status).toBe(200);
  });

  it("refuses a non-embeddable path on our own host", async () => {
    const res = await oembed({ url: `${SITE}/playground` });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("not an embeddable");
  });

  it("refuses a bytecode embed that carries no snapshot", async () => {
    const res = await oembed({ url: `${SITE}/embed/bytecode` });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("missing its snapshot");
  });

  it("clamps oversized maxwidth/maxheight into the allowed range", async () => {
    const res = await oembed({
      url: `${SITE}/embed/playground`,
      maxwidth: "9000",
      maxheight: "9000",
    });
    const body = await res.json();
    expect(body.width).toBeLessThanOrEqual(1200);
    expect(body.height).toBeLessThanOrEqual(900);
  });
});
