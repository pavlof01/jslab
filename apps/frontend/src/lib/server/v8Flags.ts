import { gatewayUrl } from "@/lib/server/gateway";
import type { FlagOption } from "@/lib/v8FlagCatalog";

type FlagsResponse = { engines?: Record<string, FlagOption[]> };

export async function fetchV8Flags(): Promise<FlagOption[]> {
  try {
    const response = await fetch(`${gatewayUrl()}/api/flags`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];

    const data = (await response.json()) as FlagsResponse;
    const flags = data.engines?.v8;
    return Array.isArray(flags) ? flags : [];
  } catch {
    return [];
  }
}
