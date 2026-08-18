"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { groupFlags, type FlagGroup, type FlagOption } from "@/lib/v8FlagCatalog";

const FlagCatalogContext = createContext<FlagGroup[]>([]);

export function V8FlagCatalogProvider({ flags, children }: { flags: FlagOption[]; children: ReactNode }) {
  const groups = useMemo(() => groupFlags(flags), [flags]);
  return <FlagCatalogContext.Provider value={groups}>{children}</FlagCatalogContext.Provider>;
}

export const useV8FlagCatalog = (): FlagGroup[] => useContext(FlagCatalogContext);
