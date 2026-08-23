import type { EngineVersions } from "@/lib/engines";
import { fetchGatewayJson } from "@/lib/server/gateway";
import { isEngineKey } from "@/lib/types";

type EnginesResponse = {
  engines?: { engine?: string; ok?: boolean; version?: string | null }[];
};

export const ENGINE_VERSIONS_TIMEOUT_MS = 2_000;

export async function fetchEngineVersions(): Promise<EngineVersions> {
  const data = await fetchGatewayJson<EnginesResponse>("/api/engines", {
    revalidateSeconds: 300,
    timeoutMs: ENGINE_VERSIONS_TIMEOUT_MS,
  });

  const versions: EngineVersions = {};
  for (const entry of data?.engines ?? []) {
    const engine = entry?.engine;
    if (engine && isEngineKey(engine) && entry.version) versions[engine] = entry.version;
  }
  return versions;
}
