"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { EngineVersions } from "@/lib/engines";
import type { EngineKey } from "@/lib/types";

const EngineVersionContext = createContext<EngineVersions>({});

export function EngineVersionProvider({
  versions,
  children,
}: {
  versions: EngineVersions;
  children: ReactNode;
}) {
  return <EngineVersionContext.Provider value={versions}>{children}</EngineVersionContext.Provider>;
}

export const useEngineVersion = (engine: EngineKey): string | undefined =>
  useContext(EngineVersionContext)[engine];
