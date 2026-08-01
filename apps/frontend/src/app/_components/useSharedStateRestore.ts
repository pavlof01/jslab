"use client";

import { useEffect, useRef } from "react";

import { ENGINE_KEYS, EngineKey } from "@/lib/types";
import { useEngineOutputsActions } from "@/store/useEngineOutputs";
import { decodeShareState, SHARE_PARAM } from "@/lib/shareState";

/**
 * On first mount, restores playground state from a `?s=` share param (if any)
 * into the store. Reads window.location directly to avoid a Suspense boundary
 * for useSearchParams. Returns whether a shared state was applied.
 */
export function useSharedStateRestore(): { restored: boolean } {
  const { setCode, setEngines, setSelectedV8Flags } = useEngineOutputsActions();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const param = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (!param) return;

    const shared = decodeShareState(param);
    if (!shared) return;

    setCode(shared.code);
    const selection = ENGINE_KEYS.reduce(
      (acc, k) => ({ ...acc, [k]: shared.engines.includes(k) }),
      {} as Record<EngineKey, boolean>,
    );
    setEngines(selection);
    setSelectedV8Flags(shared.v8Flags);
  }, [setCode, setEngines, setSelectedV8Flags]);

  return { restored: restoredRef.current };
}
