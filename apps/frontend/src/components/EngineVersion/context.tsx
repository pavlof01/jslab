"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { EngineVersions } from "@/lib/engines";
import type { EngineKey } from "@/lib/types";

const EngineVersionContext = createContext<EngineVersions>({});

type Props = {
  versions: EngineVersions;
  children: ReactNode;
};

const EngineVersionProvider: React.FC<Props> = ({ versions, children }) => {
  return <EngineVersionContext.Provider value={versions}>{children}</EngineVersionContext.Provider>;
};

export const useEngineVersion = (engine: EngineKey): string | undefined =>
  useContext(EngineVersionContext)[engine];

export default EngineVersionProvider;
