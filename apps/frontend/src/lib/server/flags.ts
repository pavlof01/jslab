import type { EngineFlagCatalog, FlagOption } from "@/lib/flagCatalog";
import { gatewayUrl } from "@/lib/server/gateway";
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
  try {
    const response = await fetch(`${gatewayUrl()}/api/flags`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return {};

    const data = (await response.json()) as FlagsResponse;
    const engines = data.engines ?? {};

    const catalog: EngineFlagCatalog = {};
    for (const [key, flags] of Object.entries(engines)) {
      if (isEngineKey(key) && Array.isArray(flags) && flags.length) catalog[key] = flags;
    }
    return catalog;
  } catch {
    return {};
  }
}
