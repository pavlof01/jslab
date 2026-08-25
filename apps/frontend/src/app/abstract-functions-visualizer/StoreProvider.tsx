"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";

import type { VisualizerInitialData } from "./model";
import { createVisualizerStore, type VisualizerStore, type VisualizerStoreApi } from "./store";

const StoreContext = createContext<VisualizerStoreApi | null>(null);

export function VisualizerStoreProvider({
  initialData,
  children,
}: {
  initialData: VisualizerInitialData;
  children: ReactNode;
}) {
  const [store] = useState(() => createVisualizerStore(initialData));
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useVisualizerStoreApi(): VisualizerStoreApi {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useVisualizerStore must be used inside <VisualizerStoreProvider>");
  return store;
}

export function useVisualizerStore<T>(selector: (state: VisualizerStore) => T): T {
  return useStore(useVisualizerStoreApi(), selector);
}
