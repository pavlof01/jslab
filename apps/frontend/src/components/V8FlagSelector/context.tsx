"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type FlagGroup, type FlagOption, groupFlags } from "@/lib/v8FlagCatalog";

const FlagCatalogContext = createContext<FlagGroup[]>([]);

export function V8FlagCatalogProvider({
  flags,
  children,
}: {
  flags: FlagOption[];
  children: ReactNode;
}) {
  const groups = useMemo(() => groupFlags(flags), [flags]);
  return <FlagCatalogContext.Provider value={groups}>{children}</FlagCatalogContext.Provider>;
}

export const useV8FlagCatalog = (): FlagGroup[] => useContext(FlagCatalogContext);
