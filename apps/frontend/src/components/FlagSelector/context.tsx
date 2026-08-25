"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type EngineFlagCatalog, type FlagGroup, groupFlags } from "@/lib/flagCatalog";
import type { EngineKey } from "@/lib/types";

type GroupedCatalog = Partial<Record<EngineKey, FlagGroup[]>>;

const FlagCatalogContext = createContext<GroupedCatalog>({});

type Props = {
  catalog: EngineFlagCatalog;
  children: ReactNode;
};

const FlagCatalogProvider: React.FC<Props> = ({ catalog, children }) => {
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(catalog).map(([engine, flags]) => [engine, groupFlags(flags ?? [])]),
      ) as GroupedCatalog,
    [catalog],
  );
  return <FlagCatalogContext.Provider value={grouped}>{children}</FlagCatalogContext.Provider>;
};

/** Engines the catalog knows flags for, so the toolbar only renders live selectors. */
export const useFlaggedEngines = (): EngineKey[] => {
  const catalog = useContext(FlagCatalogContext);
  return useMemo(
    () => (Object.keys(catalog) as EngineKey[]).filter((engine) => catalog[engine]?.length),
    [catalog],
  );
};

export const useFlagGroups = (engine: EngineKey): FlagGroup[] =>
  useContext(FlagCatalogContext)[engine] ?? [];

export default FlagCatalogProvider;
