import type { EngineFlagMap } from "./types";

export function shareUrl(
  code: string,
  engines: string[] = ["v8"],
  flags: EngineFlagMap = {},
): string {
  const payload = JSON.stringify({ c: code, e: engines, f: flags });
  const base64 = Buffer.from(payload, "utf8").toString("base64");
  const param = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/playground?s=${param}`;
}
