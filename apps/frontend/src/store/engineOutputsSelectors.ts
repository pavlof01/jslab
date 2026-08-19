import { useShallow } from "zustand/react/shallow";

import { useEngineOutputsStore } from "./useEngineOutputs";

export const useCode = () => useEngineOutputsStore((state) => state.code);
export const useSetCode = () => useEngineOutputsStore((state) => state.setCode);

export const useEngineSelection = () =>
  useEngineOutputsStore(
    useShallow((state) => ({ engines: state.engines, setEngines: state.setEngines })),
  );

export const useV8Flags = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      selectedV8Flags: state.selectedV8Flags,
      setSelectedV8Flags: state.setSelectedV8Flags,
    })),
  );

export const useActiveTab = () =>
  useEngineOutputsStore(
    useShallow((state) => ({ activeTab: state.activeTab, setActiveTab: state.setActiveTab })),
  );

export const useRunStatus = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      status: state.status,
      durationMs: state.durationMs,
      cacheHit: state.cacheHit,
      error: state.error,
      notice: state.notice,
    })),
  );

export const useOutputPane = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      out: state.out,
      previousSnapshot: state.previousSnapshot,
      showDiff: state.showDiff,
      status: state.status,
      engines: state.engines,
    })),
  );

export const useDiffToggle = () =>
  useEngineOutputsStore(
    useShallow((state) => ({ showDiff: state.showDiff, toggleDiff: state.toggleDiff })),
  );

export const useShareableState = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      code: state.code,
      engines: state.engines,
      selectedV8Flags: state.selectedV8Flags,
      out: state.out,
      activeTab: state.activeTab,
    })),
  );

export const useStateRestore = () =>
  useEngineOutputsStore(
    useShallow((state) => ({
      setCode: state.setCode,
      setEngines: state.setEngines,
      setSelectedV8Flags: state.setSelectedV8Flags,
    })),
  );

export const useRunEngines = () => useEngineOutputsStore((state) => state.runEngines);
