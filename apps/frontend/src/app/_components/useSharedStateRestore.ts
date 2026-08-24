"use client";

import { useEffect } from "react";

import { decodeShareState, SHARE_PARAM } from "@/lib/shareState";
import { selectionFrom } from "@/lib/types";
import { useStateRestore } from "@/store/engineOutputsSelectors";

export function useSharedStateRestore(): void {
  const { setCode, setEngines, setFlags } = useStateRestore();

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (!param) return;

    const shared = decodeShareState(param);
    if (!shared) return;

    setCode(shared.code);
    setEngines(selectionFrom(shared.engines));
    setFlags(shared.flags);
  }, [setCode, setEngines, setFlags]);
}
