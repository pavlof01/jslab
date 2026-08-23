import type { EngineFlagCatalog, FlagOption } from "@/lib/flagCatalog";
import { fetchGatewayJson } from "@/lib/server/gateway";
import { isEngineKey } from "@/lib/types";

type FlagsResponse = { engines?: Record<string, FlagOption[]> };

/**
 * The whole per-engine flag catalog, not just V8's.
 *
 * The gateway has always answered /api/flags for every engine — hermes' -O, the
 * SpiderMonkey JIT switches — and has always accepted them on a run. Reading
 * only `engines.v8` here is what kept them off the screen.
 */
export async function fetchFlagCatalog(): Promise<EngineFlagCatalog> {
  const data = await fetchGatewayJson<FlagsResponse>("/api/flags", { revalidateSeconds: 3600 });

  const catalog: EngineFlagCatalog = {};
  for (const [key, flags] of Object.entries(data?.engines ?? {})) {
    if (isEngineKey(key) && Array.isArray(flags) && flags.length) catalog[key] = flags;
  }
  return catalog;
}
